"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  DEFAULT_HYDRATION_STATE,
  type DrinkLog,
  type HydrationState,
  type ReminderSettings,
  type UserProfile,
  STORAGE_KEY,
  dateKey,
  isReminderMoment,
  mergeHydrationState,
} from "@/lib/hydration";
import { PUSH_RUN_STORAGE_KEY } from "@/lib/push";

type HydrationContextValue = {
  state: HydrationState;
  ready: boolean;
  addDrink: (amount: number) => DrinkLog;
  removeDrink: (id: string, key?: string) => void;
  setDailyGoal: (goal: number) => void;
  setQuickAmount: (index: number, amount: number) => void;
  setReminders: (next: Partial<ReminderSettings>) => void;
  setProfile: (next: Partial<UserProfile>) => void;
};

const HydrationContext = createContext<HydrationContextValue | null>(null);

export function HydrationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HydrationState>(DEFAULT_HYDRATION_STATE);
  const [ready, setReady] = useState(false);
  const lastNotificationRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setState(mergeHydrationState(JSON.parse(stored)));
    } catch {
      // Ignore malformed or unavailable local storage and continue with defaults.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [ready, state]);

  useEffect(() => {
    if (!ready || !state.reminders.enabled) return;

    const checkReminder = () => {
      if (window.localStorage.getItem(PUSH_RUN_STORAGE_KEY)) return;
      if (!("Notification" in window) || Notification.permission !== "granted") return;

      const now = new Date();
      if (!isReminderMoment(state.reminders, now)) return;

      const notificationKey = `${dateKey(now)}-${now.getHours()}-${now.getMinutes()}`;
      if (lastNotificationRef.current === notificationKey) return;

      lastNotificationRef.current = notificationKey;
      new Notification("ถึงเวลาดื่มน้ำแล้ว 💧", {
        body: "พักสักครู่แล้วเติมน้ำให้ร่างกายกัน",
        icon: "/icon-192.png",
      });
    };

    checkReminder();
    const timer = window.setInterval(checkReminder, 30_000);
    return () => window.clearInterval(timer);
  }, [ready, state.reminders]);

  const addDrink = useCallback((amount: number) => {
    const safeAmount = Math.max(1, Math.round(amount));
    const now = new Date();
    const key = dateKey(now);
    const log: DrinkLog = {
      id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
      amount: safeAmount,
      at: now.toISOString(),
    };

    setState((current) => ({
      ...current,
      days: {
        ...current.days,
        [key]: [log, ...(current.days[key] ?? [])],
      },
    }));

    return log;
  }, []);

  const removeDrink = useCallback((id: string, key = dateKey()) => {
    setState((current) => ({
      ...current,
      days: {
        ...current.days,
        [key]: (current.days[key] ?? []).filter((log) => log.id !== id),
      },
    }));
  }, []);

  const setDailyGoal = useCallback((goal: number) => {
    setState((current) => ({
      ...current,
      dailyGoal: Math.min(6000, Math.max(500, Math.round(goal / 50) * 50)),
    }));
  }, []);

  const setQuickAmount = useCallback((index: number, amount: number) => {
    setState((current) => {
      const quickAmounts = [...current.quickAmounts] as [number, number, number];
      quickAmounts[index] = Math.min(1500, Math.max(50, Math.round(amount / 50) * 50));
      return { ...current, quickAmounts };
    });
  }, []);

  const setReminders = useCallback((next: Partial<ReminderSettings>) => {
    setState((current) => ({
      ...current,
      reminders: { ...current.reminders, ...next },
    }));
  }, []);

  const setProfile = useCallback((next: Partial<UserProfile>) => {
    setState((current) => ({
      ...current,
      profile: { ...current.profile, ...next },
    }));
  }, []);

  const value = useMemo(
    () => ({
      state,
      ready,
      addDrink,
      removeDrink,
      setDailyGoal,
      setQuickAmount,
      setReminders,
      setProfile,
    }),
    [state, ready, addDrink, removeDrink, setDailyGoal, setQuickAmount, setReminders, setProfile],
  );

  return <HydrationContext.Provider value={value}>{children}</HydrationContext.Provider>;
}

export function useHydration() {
  const context = useContext(HydrationContext);
  if (!context) throw new Error("useHydration must be used inside HydrationProvider");
  return context;
}
