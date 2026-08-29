import type { ReminderSettings } from "@/lib/hydration";

export const PUSH_RUN_STORAGE_KEY = "drink-warner:push-run-id:v1";
export const VAPID_KEYS_STORAGE_KEY = "drink-warner:vapid-keys:v1";
export const PUSH_CONFIG_STORAGE_KEY = "drink-warner:push-config:v1";

export type PushSubscriptionPayload = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type VapidKeys = {
  publicKey: string;
  privateKey: string;
};

export type ReminderWorkflowInput = {
  subscription: PushSubscriptionPayload;
  vapid: VapidKeys;
  reminders: ReminderSettings;
  timezone: string;
};
