import {
  dateKey,
  getDayLogs,
  getDayTotal,
  type HydrationState,
  type ReminderSettings,
} from "@/lib/hydration";

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

export type HydrationPushContext = {
  dayKey: string;
  dailyGoal: number;
  waterToday: number;
  lastDrinkAt: string | null;
  capturedAt: string;
};

export type ReminderWorkflowInput = {
  subscription: PushSubscriptionPayload;
  vapid: VapidKeys;
  reminders: ReminderSettings;
  timezone: string;
  hydration: HydrationPushContext;
};

export function getHydrationPushContext(
  state: HydrationState,
  now = new Date(),
): HydrationPushContext {
  const key = dateKey(now);
  const logs = getDayLogs(state, key);

  return {
    dayKey: key,
    dailyGoal: state.dailyGoal,
    waterToday: getDayTotal(state, key),
    lastDrinkAt: logs[0]?.at ?? null,
    capturedAt: now.toISOString(),
  };
}

export function getPushConfigSignature(
  state: HydrationState,
  now = new Date(),
) {
  const hydration = getHydrationPushContext(state, now);

  return JSON.stringify({
    reminders: state.reminders,
    dayKey: hydration.dayKey,
    dailyGoal: hydration.dailyGoal,
    waterToday: hydration.waterToday,
    lastDrinkAt: hydration.lastDrinkAt,
  });
}
