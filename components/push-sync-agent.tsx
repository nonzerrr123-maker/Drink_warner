"use client";

import { useEffect, useRef } from "react";

import { useHydration } from "@/components/hydration-provider";
import {
  getHydrationPushContext,
  getPushConfigSignature,
  PUSH_CONFIG_STORAGE_KEY,
  PUSH_RUN_STORAGE_KEY,
  VAPID_KEYS_STORAGE_KEY,
  type PushSubscriptionPayload,
  type VapidKeys,
} from "@/lib/push";

function readVapidKeys() {
  try {
    const stored = window.localStorage.getItem(VAPID_KEYS_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<VapidKeys>;
    if (!parsed.publicKey || !parsed.privateKey) return null;
    return parsed as VapidKeys;
  } catch {
    return null;
  }
}

function subscriptionPayload(subscription: PushSubscription): PushSubscriptionPayload {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: {
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    },
  };
}

export function PushSyncAgent() {
  const { state, ready } = useHydration();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const vapid = readVapidKeys();
    if (!vapid) return;

    const now = new Date();
    const nextConfig = getPushConfigSignature(state, now);
    if (window.localStorage.getItem(PUSH_CONFIG_STORAGE_KEY) === nextConfig) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return;

        const previousRunId = window.localStorage.getItem(PUSH_RUN_STORAGE_KEY);
        const response = await fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "schedule",
            subscription: subscriptionPayload(subscription),
            vapid,
            reminders: state.reminders,
            hydration: getHydrationPushContext(state, now),
            timezone:
              Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Bangkok",
            previousRunId,
          }),
        });
        const data = await response.json();
        if (!response.ok) return;

        window.localStorage.setItem(PUSH_CONFIG_STORAGE_KEY, nextConfig);
        if (data.runId) {
          window.localStorage.setItem(PUSH_RUN_STORAGE_KEY, data.runId);
        } else {
          window.localStorage.removeItem(PUSH_RUN_STORAGE_KEY);
        }
      } catch {
        // Keep the current reminder workflow if a contextual refresh fails.
      }
    }, 800);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [ready, state]);

  return null;
}
