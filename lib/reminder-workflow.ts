import { sleep } from "workflow";

import type { ReminderSettings } from "@/lib/hydration";
import type { ReminderWorkflowInput } from "@/lib/push";
import { sendWebPush } from "@/lib/push-server";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function parseTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute, total: hour * 60 + minute };
}

function getZonedParts(date: Date, timezone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
  };
}

function localDateTimeToUtc(local: ZonedParts, timezone: string) {
  const localAsUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    0,
    0,
  );

  let guess = localAsUtc;
  for (let index = 0; index < 2; index += 1) {
    const zoned = getZonedParts(new Date(guess), timezone);
    const zonedAsUtc = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
      0,
      0,
    );
    guess = localAsUtc - (zonedAsUtc - guess);
  }

  return new Date(guess);
}

function addLocalDays(parts: ZonedParts, days: number): ZonedParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  date.setUTCDate(date.getUTCDate() + days);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: 0,
    minute: 0,
  };
}

async function secondsUntilNextReminder(
  reminders: ReminderSettings,
  timezone: string,
) {
  "use step";

  const safeTimezone = (() => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
      return timezone;
    } catch {
      return "Asia/Bangkok";
    }
  })();

  const start = parseTime(reminders.startTime);
  const end = parseTime(reminders.endTime);
  if (!start || !end || end.total <= start.total) return 60 * 60;

  const now = new Date();
  const localNow = getZonedParts(now, safeTimezone);
  const currentTotal = localNow.hour * 60 + localNow.minute;
  const intervalMinutes = Math.max(1, reminders.intervalHours) * 60;

  let targetDay = localNow;
  let targetTotal: number;

  if (currentTotal < start.total) {
    targetTotal = start.total;
  } else {
    const elapsed = currentTotal - start.total;
    const steps = Math.floor(elapsed / intervalMinutes) + 1;
    targetTotal = start.total + steps * intervalMinutes;

    if (targetTotal > end.total) {
      targetDay = addLocalDays(localNow, 1);
      targetTotal = start.total;
    }
  }

  const target = localDateTimeToUtc(
    {
      ...targetDay,
      hour: Math.floor(targetTotal / 60),
      minute: targetTotal % 60,
    },
    safeTimezone,
  );

  return Math.max(1, Math.ceil((target.getTime() - now.getTime()) / 1000));
}

async function deliverReminder(input: ReminderWorkflowInput) {
  "use step";

  return sendWebPush(input.subscription, input.vapid, {
    title: "ถึงเวลาดื่มน้ำแล้ว 💧",
    body: "พักสักครู่แล้วเติมน้ำให้ร่างกายกัน",
    url: "/",
    tag: "drink-warner-reminder",
  });
}

export async function hydrationReminderWorkflow(input: ReminderWorkflowInput) {
  "use workflow";

  if (!input.reminders.enabled) return { status: "disabled", sent: 0 };

  let sent = 0;

  while (sent < 3000) {
    const seconds = await secondsUntilNextReminder(input.reminders, input.timezone);
    await sleep(`${seconds}s`);

    const delivered = await deliverReminder(input);
    if (!delivered) return { status: "subscription-expired", sent };
    sent += 1;
  }

  return { status: "rotation-required", sent };
}
