export type Sex = "unspecified" | "female" | "male" | "other";

export type DrinkLog = {
  id: string;
  amount: number;
  at: string;
};

export type ReminderSettings = {
  enabled: boolean;
  intervalHours: number;
  startTime: string;
  endTime: string;
};

export type UserProfile = {
  weightKg: number | null;
  sex: Sex;
  age: number | null;
};

export type HydrationState = {
  dailyGoal: number;
  quickAmounts: [number, number, number];
  days: Record<string, DrinkLog[]>;
  reminders: ReminderSettings;
  profile: UserProfile;
  onboardingCompleted: boolean;
};

export const STORAGE_KEY = "drink-warner:hydration:v1";

export const DEFAULT_HYDRATION_STATE: HydrationState = {
  dailyGoal: 2000,
  quickAmounts: [150, 250, 350],
  days: {},
  reminders: {
    enabled: true,
    intervalHours: 2,
    startTime: "08:00",
    endTime: "22:00",
  },
  profile: {
    weightKg: null,
    sex: "unspecified",
    age: null,
  },
  onboardingCompleted: false,
};

export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string) {
  return new Date(`${key}T12:00:00`);
}

export function getDayLogs(state: HydrationState, key = dateKey()) {
  return state.days[key] ?? [];
}

export function getDayTotal(state: HydrationState, key = dateKey()) {
  return getDayLogs(state, key).reduce((total, log) => total + log.amount, 0);
}

export function getRecentDateKeys(count: number, now = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(now.getDate() - (count - 1 - index));
    return dateKey(date);
  });
}

export function formatThaiFullDate(date = new Date()) {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatThaiShortDate(key: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
  }).format(parseDateKey(key));
}

export function formatThaiDayLabel(key: string) {
  return new Intl.DateTimeFormat("th-TH", { weekday: "short" }).format(
    parseDateKey(key),
  );
}

export function formatLogTime(at: string) {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(at));
}

export function calculateRecommendedGoal(profile: UserProfile) {
  const { weightKg, age, sex } = profile;

  if (!weightKg || weightKg < 30 || weightKg > 250 || !age || age < 18 || age > 100) {
    return null;
  }

  // Product-level estimate for goal setting, not a clinical formula.
  let estimate = weightKg * 30;

  if (age <= 30) estimate *= 1.05;
  if (sex === "male") estimate *= 1.05;

  const rounded = Math.round(estimate / 100) * 100;
  return Math.min(4000, Math.max(1500, rounded));
}

function timeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function getNextReminderDate(
  reminders: ReminderSettings,
  now = new Date(),
) {
  if (!reminders.enabled) return null;

  const start = timeToMinutes(reminders.startTime);
  const end = timeToMinutes(reminders.endTime);
  if (start === null || end === null || end <= start) return null;

  const interval = Math.max(1, reminders.intervalHours) * 60;
  const current = now.getHours() * 60 + now.getMinutes();

  const next = new Date(now);
  next.setSeconds(0, 0);

  let targetMinutes: number;

  if (current < start) {
    targetMinutes = start;
  } else {
    const elapsed = current - start;
    const steps = Math.floor(elapsed / interval) + 1;
    targetMinutes = start + steps * interval;

    if (targetMinutes > end) {
      next.setDate(next.getDate() + 1);
      targetMinutes = start;
    }
  }

  next.setHours(Math.floor(targetMinutes / 60), targetMinutes % 60, 0, 0);
  return next;
}

export function formatRelativeMinutes(target: Date, now = new Date()) {
  const diff = Math.max(0, Math.round((target.getTime() - now.getTime()) / 60000));
  if (diff < 60) return `อีก ${diff} นาที`;

  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return minutes > 0 ? `อีก ${hours} ชม. ${minutes} นาที` : `อีก ${hours} ชม.`;
}

export function isReminderMoment(reminders: ReminderSettings, now = new Date()) {
  if (!reminders.enabled) return false;

  const start = timeToMinutes(reminders.startTime);
  const end = timeToMinutes(reminders.endTime);
  if (start === null || end === null || end <= start) return false;

  const interval = Math.max(1, reminders.intervalHours) * 60;
  const current = now.getHours() * 60 + now.getMinutes();

  return current >= start && current <= end && (current - start) % interval === 0;
}

export function mergeHydrationState(value: unknown): HydrationState {
  if (!value || typeof value !== "object") return DEFAULT_HYDRATION_STATE;

  const candidate = value as Partial<HydrationState>;
  return {
    ...DEFAULT_HYDRATION_STATE,
    ...candidate,
    quickAmounts:
      Array.isArray(candidate.quickAmounts) && candidate.quickAmounts.length === 3
        ? (candidate.quickAmounts.map((amount) => Number(amount)) as [number, number, number])
        : DEFAULT_HYDRATION_STATE.quickAmounts,
    days:
      candidate.days && typeof candidate.days === "object"
        ? candidate.days
        : DEFAULT_HYDRATION_STATE.days,
    reminders: {
      ...DEFAULT_HYDRATION_STATE.reminders,
      ...(candidate.reminders ?? {}),
    },
    profile: {
      ...DEFAULT_HYDRATION_STATE.profile,
      ...(candidate.profile ?? {}),
    },
    onboardingCompleted: Boolean(candidate.onboardingCompleted),
  };
}
