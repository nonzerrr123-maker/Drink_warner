import type { ReminderSettings } from "@/lib/hydration";

export const VAPID_PUBLIC_KEY =
  "BAadfKaNKd0n4rFieFSq4Lfma-7-d2mpUAPF40GTQG8t1LfmfiQKU6mGh-YDeoOxQpm06FL-a9XsYWtTnuebV_o";

export const PUSH_RUN_STORAGE_KEY = "drink-warner:push-run-id:v1";

export type PushSubscriptionPayload = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type ReminderWorkflowInput = {
  subscription: PushSubscriptionPayload;
  reminders: ReminderSettings;
  timezone: string;
};
