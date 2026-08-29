import { randomBytes } from "node:crypto";
import { getRun, resumeHook, start } from "workflow/api";

import { hydrationCloudSyncWorkflow } from "@/lib/cloud-sync-workflow";
import { mergeHydrationState, type HydrationState } from "@/lib/hydration";

export const runtime = "nodejs";

type CloudSyncRequest = {
  action: "start" | "update" | "restore";
  runId?: string;
  token?: string;
  state?: HydrationState;
};

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

function validCredentials(runId?: string, token?: string) {
  return Boolean(
    runId &&
      runId.length >= 8 &&
      token &&
      token.length >= 24 &&
      token.length <= 128,
  );
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  }

  let body: CloudSyncRequest;
  try {
    body = (await request.json()) as CloudSyncRequest;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "start") {
    const token = randomBytes(24).toString("base64url");
    const state = mergeHydrationState(body.state);
    const run = await start(hydrationCloudSyncWorkflow, [state, token]);
    return Response.json({ ok: true, runId: run.runId, token });
  }

  if (!validCredentials(body.runId, body.token)) {
    return Response.json({ error: "Invalid sync key" }, { status: 400 });
  }

  if (body.action === "update") {
    await resumeHook(`hydration-sync:${body.token}`, {
      type: "update",
      state: mergeHydrationState(body.state),
    });
    return Response.json({ ok: true });
  }

  if (body.action === "restore") {
    await resumeHook(`hydration-sync:${body.token}`, { type: "restore" });
    const restored = await getRun(body.runId!).returnValue;
    return Response.json({ ok: true, state: mergeHydrationState(restored) });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
