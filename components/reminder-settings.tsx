"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Clock3 } from "lucide-react";

import { useHydration } from "@/components/hydration-provider";
import { MobileShell } from "@/components/mobile-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRelativeMinutes, getNextReminderDate } from "@/lib/hydration";

export function ReminderSettingsScreen() {
  const { state, setReminders } = useHydration();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!("Notification" in window)) setPermission("unsupported");
    else setPermission(Notification.permission);

    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const nextReminder = getNextReminderDate(state.reminders, now);

  async function requestPermission() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  return (
    <MobileShell>
      <header className="px-5 pb-2 pt-6">
        <h1 className="text-2xl font-semibold tracking-[-0.035em]">การเตือน</h1>
        <p className="mt-1 text-sm text-muted-foreground">ตั้งช่วงเวลาที่อยากให้ช่วยเตือน</p>
      </header>

      <div className="px-5 pt-4">
        <button
          type="button"
          onClick={() => setReminders({ enabled: !state.reminders.enabled })}
          className="flex w-full items-center gap-4 rounded-2xl bg-secondary/70 p-4 text-left outline-none transition hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
          aria-pressed={state.reminders.enabled}
        >
          <div className="flex size-11 items-center justify-center rounded-full bg-background text-primary">
            {state.reminders.enabled ? <Bell className="size-5" /> : <BellOff className="size-5" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">เตือนให้ดื่มน้ำ</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {state.reminders.enabled ? "เปิดใช้งานอยู่" : "ปิดใช้งานอยู่"}
            </p>
          </div>
          <span className={`h-6 w-11 rounded-full p-0.5 transition ${state.reminders.enabled ? "bg-primary" : "bg-border"}`}>
            <span className={`block size-5 rounded-full bg-background transition-transform ${state.reminders.enabled ? "translate-x-5" : "translate-x-0"}`} />
          </span>
        </button>

        <section className="mt-7" aria-labelledby="interval-title">
          <h2 id="interval-title" className="text-sm font-semibold">ความถี่</h2>
          <p className="mt-1 text-xs text-muted-foreground">เลือกว่าจะให้เตือนทุกกี่ชั่วโมง</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((hours) => (
              <Button
                key={hours}
                variant={state.reminders.intervalHours === hours ? "default" : "secondary"}
                className="h-10 rounded-xl px-2 text-xs"
                onClick={() => setReminders({ intervalHours: hours })}
              >
                {hours} ชม.
              </Button>
            ))}
          </div>
        </section>

        <section className="mt-7" aria-labelledby="active-hours-title">
          <h2 id="active-hours-title" className="text-sm font-semibold">ช่วงเวลาที่ให้เตือน</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-xs text-muted-foreground">
              เริ่ม
              <Input
                type="time"
                value={state.reminders.startTime}
                onChange={(event) => setReminders({ startTime: event.target.value })}
              />
            </label>
            <label className="grid gap-1.5 text-xs text-muted-foreground">
              สิ้นสุด
              <Input
                type="time"
                value={state.reminders.endTime}
                onChange={(event) => setReminders({ endTime: event.target.value })}
              />
            </label>
          </div>
        </section>

        <section className="mt-7" aria-labelledby="next-title">
          <h2 id="next-title" className="mb-3 text-sm font-semibold">ครั้งถัดไป</h2>
          <Card className="border-0 bg-secondary/70 shadow-none">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex size-11 items-center justify-center rounded-full bg-background text-primary">
                <Clock3 className="size-5" />
              </div>
              {nextReminder ? (
                <div>
                  <p className="text-xl font-semibold tracking-[-0.03em]">
                    {new Intl.DateTimeFormat("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    }).format(nextReminder)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatRelativeMinutes(nextReminder, now)}</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold">ไม่มีการเตือนที่กำลังทำงาน</p>
                  <p className="mt-1 text-xs text-muted-foreground">เปิดการเตือนเพื่อดูเวลาครั้งถัดไป</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-7 rounded-2xl border border-border p-4" aria-labelledby="notification-permission">
          <h2 id="notification-permission" className="text-sm font-semibold">การแจ้งเตือนของเบราว์เซอร์</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            อนุญาตให้เว็บแสดง Notification ตามเวลาที่ตั้งไว้ ขณะเว็บหรือ PWA ยังเปิดทำงานอยู่
          </p>

          {permission === "granted" ? (
            <p className="mt-3 text-sm font-medium text-primary">อนุญาตแล้ว ✓</p>
          ) : permission === "unsupported" ? (
            <p className="mt-3 text-sm text-muted-foreground">เบราว์เซอร์นี้ไม่รองรับ Notification</p>
          ) : (
            <Button variant="outline" className="mt-3 w-full" onClick={requestPermission}>
              ขอสิทธิ์แจ้งเตือน
            </Button>
          )}

          <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
            การแจ้งเตือนเมื่อปิดเว็บสนิทจะต้องต่อระบบ Web Push/Backend เพิ่มในขั้นถัดไป
          </p>
        </section>
      </div>
    </MobileShell>
  );
}
