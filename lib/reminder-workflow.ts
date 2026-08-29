import { sleep } from "workflow";

import type { ReminderSettings } from "@/lib/hydration";
import type { HydrationPushContext, ReminderWorkflowInput } from "@/lib/push";
import { sendWebPush } from "@/lib/push-server";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

type DeliveryResult = "sent" | "skip-recent" | "skip-goal" | "expired";

function parseTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute, total: hour * 60 + minute };
}

function safeTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
    return timezone;
  } catch {
    return "Asia/Bangkok";
  }
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

function zonedDayKey(parts: ZonedParts) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
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

function hydrationForDay(
  hydration: HydrationPushContext,
  localDayKey: string,
) {
  if (hydration.dayKey !== localDayKey) {
    return {
      dailyGoal: hydration.dailyGoal,
      waterToday: 0,
      lastDrinkAt: null as string | null,
    };
  }

  return {
    dailyGoal: hydration.dailyGoal,
    waterToday: hydration.waterToday,
    lastDrinkAt: hydration.lastDrinkAt,
  };
}

async function secondsUntilNextReminder(input: ReminderWorkflowInput) {
  "use step";

  const timezone = safeTimezone(input.timezone);
  const start = parseTime(input.reminders.startTime);
  const end = parseTime(input.reminders.endTime);
  if (!start || !end || end.total <= start.total) return 60 * 60;

  const now = new Date();
  const localNow = getZonedParts(now, timezone);
  const localDay = zonedDayKey(localNow);
  const hydration = hydrationForDay(input.hydration, localDay);
  const intervalMinutes = Math.max(1, input.reminders.intervalHours) * 60;
  const currentTotal = localNow.hour * 60 + localNow.minute;

  let targetDay = localNow;
  let targetTotal: number;

  if (hydration.waterToday >= hydration.dailyGoal) {
    targetDay = addLocalDays(localNow, 1);
    targetTotal = start.total;
  } else if (currentTotal < start.total) {
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
    timezone,
  );

  return Math.max(1, Math.ceil((target.getTime() - now.getTime()) / 1000));
}

function buildReminderMessage(
  reminders: ReminderSettings,
  hydration: HydrationPushContext,
  timezone: string,
  now: Date,
) {
  const localNow = getZonedParts(now, timezone);
  const localDay = zonedDayKey(localNow);
  const current = hydrationForDay(hydration, localDay);
  const start = parseTime(reminders.startTime);
  const end = parseTime(reminders.endTime);
  const currentMinutes = localNow.hour * 60 + localNow.minute;

  const lastDrink = current.lastDrinkAt ? new Date(current.lastDrinkAt) : null;
  if (lastDrink && !Number.isNaN(lastDrink.getTime())) {
    const lastDrinkLocal = getZonedParts(lastDrink, timezone);
    const sameDay = zonedDayKey(lastDrinkLocal) === localDay;
    const minutesSinceDrink = Math.floor((now.getTime() - lastDrink.getTime()) / 60000);
    if (sameDay && minutesSinceDrink >= 0 && minutesSinceDrink < 45) {
      return { action: "skip-recent" as const };
    }
  }

  if (current.waterToday >= current.dailyGoal) {
    return { action: "skip-goal" as const };
  }

  const actualRatio = current.dailyGoal > 0
    ? current.waterToday / current.dailyGoal
    : 0;
  const expectedRatio =
    start && end && end.total > start.total
      ? Math.min(1, Math.max(0, (currentMinutes - start.total) / (end.total - start.total)))
      : 0;
  const amountText = `${current.waterToday.toLocaleString()} / ${current.dailyGoal.toLocaleString()} ml`;

  if (current.waterToday === 0 && expectedRatio >= 0.18) {
    return {
      action: "send" as const,
      title: "Dewy ยังรอแก้วแรกอยู่ 💧",
      body: `${amountText} · เริ่มด้วยน้ำสักแก้วแบบสบาย ๆ ได้เลย`,
    };
  }

  if (expectedRatio >= 0.25 && actualRatio < expectedRatio * 0.72) {
    return {
      action: "send" as const,
      title: "Dewy เริ่มหิวน้ำแล้ว 💧",
      body: `${amountText} · วันนี้ยังช้ากว่าจังหวะที่ตั้งไว้นิดหน่อย`,
    };
  }

  if (actualRatio >= 0.85) {
    return {
      action: "send" as const,
      title: "ใกล้ถึงเป้าแล้ว ✨",
      body: `${amountText} · อีกนิดเดียว Dewy ก็อิ่มน้ำแล้ว`,
    };
  }

  return {
    action: "send" as const,
    title: "ถึงเวลาดื่มน้ำแล้ว 💧",
    body: `${amountText} · เติมน้ำอีกแก้วแล้วไปต่อได้เลย`,
  };
}

async function deliverReminder(input: ReminderWorkflowInput): Promise<DeliveryResult> {
  "use step";

  const timezone = safeTimezone(input.timezone);
  const decision = buildReminderMessage(
    input.reminders,
    input.hydration,
    timezone,
    new Date(),
  );

  if (decision.action === "skip-recent") return "skip-recent";
  if (decision.action === "skip-goal") return "skip-goal";

  const delivered = await sendWebPush(input.subscription, input.vapid, {
    title: decision.title,
    body: decision.body,
    url: "/",
    tag: "drink-warner-reminder",
  });

  return delivered ? "sent" : "expired";
}

export async function hydrationReminderWorkflow(input: ReminderWorkflowInput) {
  "use workflow";

  if (!input.reminders.enabled) return { status: "disabled", sent: 0 };

  let sent = 0;
  let cycles = 0;

  while (cycles < 5000) {
    const seconds = await secondsUntilNextReminder(input);
    await sleep(`${seconds}s`);

    const result = await deliverReminder(input);
    cycles += 1;

    if (result === "expired") {
      return { status: "subscription-expired", sent };
    }

    if (result === "sent") sent += 1;
  }

  return { status: "rotation-required", sent };
}
