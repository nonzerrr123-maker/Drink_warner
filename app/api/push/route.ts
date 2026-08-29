import { getRun, start } from "workflow/api";

import type { ReminderSettings } from "@/lib/hydration";
import type {
  HydrationPushContext,
  PushSubscriptionPayload,
  VapidKeys,
} from "@/lib/push";
import { sendWebPush } from "@/lib/push-server";
import { hydrationReminderWorkflow } from "@/lib/reminder-workflow";

export const runtime = "nodejs";

type PushRequest = {
  action: "schedule" | "cancel" | "test";
  subscription?: PushSubscriptionPayload;
  vapid?: VapidKeys;
  reminders?: ReminderSettings;
  hydration?: HydrationPushContext;
  timezone?: string;
  previousRunId?: string | null;
};

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

function validSubscription(value: PushSubscriptionPayload | undefined) {
  return Boolean(value?.endpoint && value.keys?.p256dh && value.keys?.auth);
}

function validVapid(value: VapidKeys | undefined) {
  return Boolean(
    value?.publicKey &&
      value.publicKey.length >= 80 &&
      value?.privateKey &&
      value.privateKey.length >= 40,
  );
}

function sanitizeHydration(value: HydrationPushContext | undefined): HydrationPushContext {
  const capturedAt =
    value?.capturedAt && !Number.isNaN(Date.parse(value.capturedAt))
      ? value.capturedAt
      : new Date().toISOString();
  const lastDrinkAt =
    value?.lastDrinkAt && !Number.isNaN(Date.parse(value.lastDrinkAt))
      ? value.lastDrinkAt
      : null;

  return {
    dayKey: /^\d{4}-\d{2}-\d{2}$/.test(value?.dayKey ?? "")
      ? value!.dayKey
      : capturedAt.slice(0, 10),
    dailyGoal: Math.min(6000, Math.max(500, Math.round(Number(value?.dailyGoal) || 2000))),
    waterToday: Math.min(20000, Math.max(0, Math.round(Number(value?.waterToday) || 0))),
    lastDrinkAt,
    capturedAt,
  };
}

async function cancelRun(runId?: string | null) {
  if (!runId) return;
  try {
    await getRun(runId).cancel();
  } catch {
    // Completed, expired, or already-cancelled runs do not block rescheduling.
  }
}

export async function GET() {
  return Response.json({ ready: true });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json({ error: "Origin not allowed" }, { status: 403 });
  }

  let body: PushRequest;
  try {
    body = (await request.json()) as PushRequest;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "cancel") {
    await cancelRun(body.previousRunId);
    return Response.json({ ok: true, runId: null });
  }

  if (!validSubscription(body.subscription) || !validVapid(body.vapid)) {
    return Response.json(
      { error: "Invalid push subscription or device key" },
      { status: 400 },
    );
  }

  if (body.action === "test") {
    const delivered = await sendWebPush(body.subscription!, body.vapid!, {
      title: "Drink Warner พร้อมแล้ว 💧",
      body: "ถ้าเห็นข้อความนี้ แปลว่าการแจ้งเตือนบนเครื่องนี้ใช้งานได้แล้ว",
      url: "/reminders",
      tag: "drink-warner-test",
    });

    return Response.json({ ok: delivered });
  }

  if (body.action !== "schedule" || !body.reminders) {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  const intervalHours = Math.min(
    12,
    Math.max(1, Math.round(Number(body.reminders.intervalHours) || 2)),
  );

  const reminders: ReminderSettings = {
    enabled: Boolean(body.reminders.enabled),
    intervalHours,
    startTime: /^\d{2}:\d{2}$/.test(body.reminders.startTime)
      ? body.reminders.startTime
      : "08:00",
    endTime: /^\d{2}:\d{2}$/.test(body.reminders.endTime)
      ? body.reminders.endTime
      : "22:00",
  };

  await cancelRun(body.previousRunId);

  if (!reminders.enabled) {
    return Response.json({ ok: true, runId: null });
  }

  const run = await start(hydrationReminderWorkflow, [
    {
      subscription: body.subscription!,
      vapid: body.vapid!,
      reminders,
      timezone: body.timezone || "Asia/Bangkok",
      hydration: sanitizeHydration(body.hydration),
    },
  ]);

  return Response.json({ ok: true, runId: run.runId }, { status: 202 });
}
