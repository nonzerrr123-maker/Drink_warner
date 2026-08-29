"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, Clock3, Droplet, Minus, Plus, RotateCcw } from "lucide-react";

import { HydrationMascot, type MascotMode } from "@/components/hydration-mascot";
import { MascotToast } from "@/components/mascot-toast";
import { MobileShell } from "@/components/mobile-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useHydration } from "@/components/hydration-provider";
import { dateKey, formatLogTime, formatRelativeMinutes, formatThaiFullDate, getDayLogs, getDayTotal, getNextReminderDate } from "@/lib/hydration";

function WaterProgress({ current, goal }: { current: number; goal: number }) {
  const size = 184;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const rawPercentage = goal > 0 ? Math.round((current / goal) * 100) : 0;
  const visualPercentage = Math.min(rawPercentage, 100);
  const dashOffset = circumference - (visualPercentage / 100) * circumference;

  return (
    <div className="relative mx-auto size-[184px]" role="progressbar" aria-label="ปริมาณน้ำที่ดื่มวันนี้" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={current}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-secondary" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} className="text-primary transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[34px] font-semibold leading-none tracking-[-0.04em] text-foreground">{current.toLocaleString()}</span>
        <span className="mt-1 text-sm text-muted-foreground">จาก {goal.toLocaleString()} ml</span>
        <span className="mt-2 text-xs font-medium text-primary">{rawPercentage}%</span>
      </div>
    </div>
  );
}

function timeToMinutes(value: string, fallback: number) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return fallback;
  return hours * 60 + minutes;
}

function expectedProgress(now: Date, startTime: string, endTime: string) {
  const start = timeToMinutes(startTime, 8 * 60);
  const end = timeToMinutes(endTime, 22 * 60);
  if (end <= start) return 0.5;

  const current = now.getHours() * 60 + now.getMinutes();
  if (current <= start) return 0.08;
  if (current >= end) return 1;
  return 0.08 + ((current - start) / (end - start)) * 0.92;
}

function getAmbientMode(ratio: number, paceRatio: number): MascotMode {
  if (ratio > 1.2) return "overfull";
  if (paceRatio < 0.58 && ratio < 0.75) return "thirsty";
  return "idle";
}

function feedbackFor(nextWater: number, goal: number, amount: number, now: Date, startTime: string, endTime: string) {
  const ratio = goal > 0 ? nextWater / goal : 0;
  const pace = expectedProgress(now, startTime, endTime);
  const paceRatio = pace > 0 ? ratio / pace : 1;

  if (ratio > 1.2) {
    return {
      mode: "overfull" as MascotMode,
      title: "วันนี้เกินเป้าที่ตั้งไว้แล้ว",
      description: `เพิ่ม ${amount.toLocaleString()} ml เรียบร้อย · ไม่ต้องรีบดื่มเพิ่มก็ได้`,
    };
  }

  if (ratio >= 1) {
    return {
      mode: "celebrate" as MascotMode,
      title: "ถึงเป้าหมายวันนี้แล้ว ✨",
      description: `วันนี้ครบ ${goal.toLocaleString()} ml แล้ว Dewy แฮปปี้มาก`,
    };
  }

  if (paceRatio < 0.58 && ratio < 0.75) {
    return {
      mode: "thirsty" as MascotMode,
      title: "วันนี้ยังดื่มน้อยกว่าจังหวะที่ตั้งไว้",
      description: `เพิ่ม ${amount.toLocaleString()} ml แล้ว · ค่อย ๆ เติมอีกนิดเมื่อสะดวก`,
    };
  }

  return {
    mode: "drink" as MascotMode,
    title: `เพิ่ม ${amount.toLocaleString()} ml แล้ว`,
    description: "กำลังไปได้ดี ดื่มต่อเนื่องแบบสบาย ๆ ได้เลย",
  };
}

export function WaterHome() {
  const { state, ready, addDrink, removeDrink } = useHydration();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [amount, setAmount] = useState(250);
  const [undoLogId, setUndoLogId] = useState<string | null>(null);
  const [undoAmount, setUndoAmount] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [actionMode, setActionMode] = useState<MascotMode | null>(null);
  const [mascotRun, setMascotRun] = useState(0);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("");
  const [toastDescription, setToastDescription] = useState("");
  const [toastMode, setToastMode] = useState<MascotMode>("drink");
  const [toastRatio, setToastRatio] = useState(0);
  const mascotTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const today = dateKey(now);
  const logs = getDayLogs(state, today);
  const water = getDayTotal(state, today);
  const ratio = state.dailyGoal > 0 ? water / state.dailyGoal : 0;
  const pace = expectedProgress(now, state.reminders.startTime, state.reminders.endTime);
  const paceRatio = pace > 0 ? ratio / pace : 1;
  const ambientMode = getAmbientMode(ratio, paceRatio);
  const mascotMode = actionMode ?? ambientMode;
  const remaining = Math.max(state.dailyGoal - water, 0);
  const percentage = state.dailyGoal > 0 ? Math.round(ratio * 100) : 0;
  const nextReminder = getNextReminderDate(state.reminders, now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!undoLogId) return;
    const timer = window.setTimeout(() => {
      setUndoLogId(null);
      setUndoAmount(null);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [undoLogId]);

  useEffect(() => () => {
    if (mascotTimerRef.current) window.clearTimeout(mascotTimerRef.current);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  if (!ready) {
    return <MobileShell><div className="px-5 pt-6"><div className="h-7 w-20 animate-pulse rounded-lg bg-muted" /><div className="mt-2 h-4 w-32 animate-pulse rounded bg-muted" /><div className="mx-auto mt-14 size-[184px] animate-pulse rounded-full bg-secondary/70" /></div></MobileShell>;
  }

  const statusText = percentage >= 100 ? "ครบเป้าหมายวันนี้แล้ว" : percentage >= 70 ? "ใกล้ถึงเป้าหมายแล้ว" : percentage >= 40 ? "กำลังไปได้ดี" : percentage > 0 ? "ค่อย ๆ ดื่มให้สม่ำเสมอ" : "เริ่มต้นด้วยน้ำแก้วแรกของวันนี้";

  function recordDrink(nextAmount: number) {
    const nextWater = water + nextAmount;
    const feedback = feedbackFor(nextWater, state.dailyGoal, nextAmount, now, state.reminders.startTime, state.reminders.endTime);

    if (mascotTimerRef.current) window.clearTimeout(mascotTimerRef.current);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);

    setActionMode(feedback.mode === "thirsty" || feedback.mode === "overfull" ? "drink" : feedback.mode);
    setMascotRun((current) => current + 1);
    setToastMode(feedback.mode);
    setToastRatio(state.dailyGoal > 0 ? nextWater / state.dailyGoal : 0);
    setToastTitle(feedback.title);
    setToastDescription(feedback.description);
    setToastOpen(true);

    mascotTimerRef.current = window.setTimeout(() => setActionMode(null), feedback.mode === "celebrate" ? 1300 : 1050);
    toastTimerRef.current = window.setTimeout(() => setToastOpen(false), 2500);

    const log = addDrink(nextAmount);
    setUndoLogId(log.id);
    setUndoAmount(log.amount);
  }

  function openAddSheet(nextAmount = 250) { setAmount(nextAmount); setSheetOpen(true); }
  function saveCustomDrink() { recordDrink(amount); setSheetOpen(false); }
  function undoLastDrink() { if (!undoLogId) return; removeDrink(undoLogId, today); setUndoLogId(null); setUndoAmount(null); }

  return (
    <MobileShell>
      <header className="px-5 pb-2 pt-6"><h1 className="text-2xl font-semibold tracking-[-0.035em] text-foreground">วันนี้</h1><p className="mt-1 text-sm text-muted-foreground">{formatThaiFullDate(now)}</p></header>
      <div className="px-5">
        <section className="pt-4 text-center" aria-labelledby="today-goal">
          <p id="today-goal" className="text-sm font-medium text-muted-foreground">เป้าหมายการดื่มน้ำ</p>
          <div className="relative mx-auto mt-5 max-w-[310px]">
            <WaterProgress current={water} goal={state.dailyGoal} />
            <div className="pointer-events-none absolute right-0 top-3 z-10">
              <HydrationMascot key={`${mascotRun}-${mascotMode}`} mode={mascotMode} hydrationRatio={ratio} size={92} />
            </div>
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">{statusText}</p>
          <p className="mt-1 text-sm text-muted-foreground">{remaining > 0 ? `เหลืออีก ${remaining.toLocaleString()} ml` : `เกินเป้าแล้ว ${(water - state.dailyGoal).toLocaleString()} ml`}</p>
        </section>

        <section className="mt-7" aria-labelledby="quick-add">
          <Button size="lg" className="w-full rounded-2xl" onClick={() => openAddSheet()}><Plus className="size-4" />บันทึกการดื่มน้ำ</Button>
          <div className="mt-3 grid grid-cols-3 gap-2" aria-labelledby="quick-add"><span id="quick-add" className="sr-only">เพิ่มปริมาณน้ำแบบด่วน</span>{state.quickAmounts.map((quickAmount) => <Button key={quickAmount} variant="secondary" className="h-10 rounded-xl px-2 text-xs" onClick={() => recordDrink(quickAmount)}>+{quickAmount} ml</Button>)}</div>
        </section>

        {undoLogId && undoAmount ? <div className="mt-3 flex items-center justify-between rounded-xl bg-secondary/70 px-3 py-2.5 text-sm" role="status"><span>เพิ่ม {undoAmount} ml แล้ว</span><Button variant="ghost" size="sm" className="h-8 px-2 text-primary" onClick={undoLastDrink}><RotateCcw className="size-3.5" />ย้อนกลับ</Button></div> : null}

        <section className="mt-8" aria-labelledby="next-reminder">
          <h2 id="next-reminder" className="mb-3 text-base font-semibold tracking-[-0.02em]">การเตือนครั้งถัดไป</h2>
          <Link href="/reminders" className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"><Card className="border-0 bg-secondary/70 shadow-none transition hover:bg-secondary"><CardContent className="flex items-center gap-4 py-4"><HydrationMascot mode={state.reminders.enabled ? "reminder" : ambientMode} hydrationRatio={ratio} size={48} subtle /><div className="min-w-0 flex-1">{nextReminder ? <><div className="flex items-baseline justify-between gap-3"><p className="text-xl font-semibold tracking-[-0.03em]">{new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }).format(nextReminder)}</p><ChevronRight className="size-4 text-muted-foreground" /></div><p className="mt-1 text-sm font-medium text-foreground">{formatRelativeMinutes(nextReminder, now)}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-3.5" />ทุก {state.reminders.intervalHours} ชั่วโมง · {state.reminders.startTime}–{state.reminders.endTime}</p></> : <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">ปิดการเตือนอยู่</p><p className="mt-1 text-xs text-muted-foreground">แตะเพื่อตั้งเวลาเตือน</p></div><ChevronRight className="size-4 text-muted-foreground" /></div>}</div></CardContent></Card></Link>
        </section>

        <section className="mt-8" aria-labelledby="today-history">
          <div className="flex items-center justify-between"><h2 id="today-history" className="text-base font-semibold tracking-[-0.02em]">วันนี้</h2><Link href="/history" className="flex items-center gap-0.5 text-xs font-medium text-primary">ดูทั้งหมด<ChevronRight className="size-3.5" /></Link></div>
          {logs.length > 0 ? <div className="mt-2 divide-y divide-border/80">{logs.slice(0, 3).map((log) => <div key={log.id} className="flex items-center gap-3 py-3.5"><div className="flex size-9 items-center justify-center rounded-full bg-secondary text-primary"><Droplet className="size-4" /></div><div className="flex flex-1 items-center justify-between"><div><p className="text-sm font-medium text-foreground">น้ำเปล่า</p><p className="mt-0.5 text-xs text-muted-foreground">{formatLogTime(log.at)} น.</p></div><p className="text-sm font-semibold tabular-nums text-foreground">{log.amount} ml</p></div></div>)}</div> : <div className="mt-3 rounded-2xl border border-dashed border-border px-4 py-5 text-center"><Droplet className="mx-auto size-5 text-primary" /><p className="mt-2 text-sm font-medium">ยังไม่มีรายการวันนี้</p><p className="mt-1 text-xs text-muted-foreground">บันทึกแก้วแรกแล้วรายการจะมาอยู่ตรงนี้</p></div>}
        </section>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}><SheetContent side="bottom" className="mx-auto w-full max-w-[430px] pb-[calc(1rem+env(safe-area-inset-bottom))] sm:left-1/2 sm:-translate-x-1/2"><SheetHeader><SheetTitle>บันทึกการดื่มน้ำ</SheetTitle><SheetDescription>เลือกปริมาณที่ใกล้เคียงกับที่ดื่มจริง</SheetDescription></SheetHeader><div className="px-5 pb-2 pt-3"><div className="flex items-center justify-center gap-6"><Button variant="outline" size="icon" aria-label="ลด 50 มิลลิลิตร" onClick={() => setAmount((current) => Math.max(50, current - 50))}><Minus /></Button><div className="min-w-28 text-center"><p className="text-4xl font-semibold tracking-[-0.045em] tabular-nums">{amount}</p><p className="mt-1 text-sm text-muted-foreground">ml</p></div><Button variant="outline" size="icon" aria-label="เพิ่ม 50 มิลลิลิตร" onClick={() => setAmount((current) => Math.min(1500, current + 50))}><Plus /></Button></div><div className="mt-7 grid grid-cols-4 gap-2">{[150, 250, 350, 500].map((preset) => <Button key={preset} variant={preset === amount ? "default" : "secondary"} className="h-10 rounded-xl px-2 text-xs" onClick={() => setAmount(preset)}>{preset}</Button>)}</div><Button size="lg" className="mt-5 w-full rounded-2xl" onClick={saveCustomDrink}>บันทึก {amount} ml</Button></div></SheetContent></Sheet>
      <MascotToast open={toastOpen} title={toastTitle} description={toastDescription} mode={toastMode} hydrationRatio={toastRatio} />
    </MobileShell>
  );
}
