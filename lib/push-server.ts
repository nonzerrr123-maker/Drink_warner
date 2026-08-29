import webpush from "web-push";

import { VAPID_PUBLIC_KEY, type PushSubscriptionPayload } from "@/lib/push";

export function isPushServerConfigured() {
  return Boolean(process.env.VAPID_PRIVATE_KEY);
}

export async function sendWebPush(
  subscription: PushSubscriptionPayload,
  payload: {
    title: string;
    body: string;
    url?: string;
    tag?: string;
  },
) {
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) throw new Error("VAPID_PRIVATE_KEY is not configured");

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "https://drinkwarner.vercel.app",
    VAPID_PUBLIC_KEY,
    privateKey,
  );

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
      { TTL: 60 * 60 },
    );
    return true;
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) return false;
    throw error;
  }
}
