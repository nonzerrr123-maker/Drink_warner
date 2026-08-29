import { getRun, start } from "workflow/api";

import type { ReminderSettings } from "@/lib/hydration";
import { hydrationReminderWorkflow } from "@/lib/reminder-workflow";
import {
  VAPID_PUBLIC_KEY,
  type PushSubscriptionPayload,
} from "@/lib/push";
import { isPushServerConfigured, sendWebPush } from "@/lib/push-server";

export const runtime = "nodejs";

type PushRequest = {
  action: "schedule" | "cancel" | "test";
  subscription?: PushSubscriptionPayload;
  reminders?: ReminderSettings;
  timezone?: string;
  previousRunId?: string | null;
};

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

function validSubscription(value: PushSubscriptionPayload | undefined) {
  return Boolean(
    value?.endpoint &&
      value.keys?.p256dh &&
      value.keys?.auth,
  );
}

async function cancelRun(runId?: string | null) {
  if (!runId) return;
  try {
    await getRun(runId).cancel();
  } catch {
    // A completed, expired, or already-cancelled run does not block rescheduling.
  }
}

export async function GET() {
  return Response.json({
    configured: isPushServerConfigured(),
    publicKey: VAPID_PUBLIC_KEY,
  });
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

  if (!body.action) {
    return Response.json({ error: "Missing action" }, { status: 400 });
  }

  if (body.action === "cancel") {
    await cancelRun(body.previousRunId);
    return Response.json({ ok: true, runId: null });
  }

  if (!isPushServerConfigured()) {
    return Response.json(
      { error: "Push server is not configured" },
      { status: 503 },
    );
  }

  if (!validSubscription(body.subscription)) {
    return Response.json({ error: "Invalid push subscription" }, { status: 400 });
  }

  if (body.action === "test") {
    const delivered = await sendWebPush(body.subscription!, {
      title: "Drink Warner พร้อมแล้ว 💧",
      body: "ถ้าเห็นข้อความนี้ แปลว่าการแจ้งเตือนบนเครื่องนี้ใช้งานได้แล้ว",
      url: "/reminders",
      tag: "drink-warner-test",
    });

    return Response.json({ ok: delivered });
  }

  await cancelRun(body.previousRunId);

  if (!body.reminders?.enabled) {
    return Response.json({ ok: true, runId: null });
  }

  const intervalHours = Math.min(
    12,
    Math.max(1, Math.round(Number(body.reminders.intervalHours) || 2)),
  );

  const reminders: ReminderSettings = {
    enabled: true,
    intervalHours,
    startTime: /^\d{2}:\d{2}$/.test(body.reminders.startTime)
      ? body.reminders.startTime
      : "08:00",
    endTime: /^\d{2}:\d{2}$/.test(body.reminders.endTime)
      ? body.reminders.endTime
      : "22:00",
  };

  const run = await start(hydrationReminderWorkflow, [
    {
      subscription: body.subscription!,
      reminders,
      timezone: body.timezone || "Asia/Bangkok",
    },
  ]);

  return Response.json({ ok: true, runId: run.runId }, { status: 202 });
}
