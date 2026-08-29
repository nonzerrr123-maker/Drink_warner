"use client";

import { useEffect, useRef } from "react";

import { useHydration } from "@/components/hydration-provider";
import {
  CLOUD_SYNC_LAST_AT_KEY,
  CLOUD_SYNC_STORAGE_KEY,
  type CloudSyncCredentials,
} from "@/lib/cloud-sync";

function readCredentials(): CloudSyncCredentials | null {
  try {
    const stored = window.localStorage.getItem(CLOUD_SYNC_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<CloudSyncCredentials>;
    if (!parsed.runId || !parsed.token) return null;
    return { runId: parsed.runId, token: parsed.token };
  } catch {
    return null;
  }
}

export function CloudSyncAgent() {
  const { state, ready } = useHydration();
  const timerRef = useRef<number | null>(null);
  const lastPayloadRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    const credentials = readCredentials();
    if (!credentials) return;

    const serialized = JSON.stringify(state);
    if (lastPayloadRef.current === serialized) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/cloud-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            runId: credentials.runId,
            token: credentials.token,
            state,
          }),
        });

        if (!response.ok) return;
        lastPayloadRef.current = serialized;
        window.localStorage.setItem(CLOUD_SYNC_LAST_AT_KEY, new Date().toISOString());
        window.dispatchEvent(new Event("drink-warner:cloud-sync"));
      } catch {
        // Local-first behavior continues if a cloud update is temporarily unavailable.
      }
    }, 1000);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [ready, state]);

  return null;
}
