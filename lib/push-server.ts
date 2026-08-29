import webpush from "web-push";

import type { PushSubscriptionPayload, VapidKeys } from "@/lib/push";

export async function sendWebPush(
  subscription: PushSubscriptionPayload,
  vapid: VapidKeys,
  payload: {
    title: string;
    body: string;
    url?: string;
    tag?: string;
  },
) {
  webpush.setVapidDetails(
    "https://drinkwarner.vercel.app",
    vapid.publicKey,
    vapid.privateKey,
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
