"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  ChartNoAxesColumnIncreasing,
  Clock3,
  Droplet,
  Home,
  Minus,
  Plus,
  Settings2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const DAILY_GOAL = 2000;
const QUICK_AMOUNTS = [150, 250, 350];
const SHEET_AMOUNTS = [150, 250, 350, 500];

type DrinkLog = {
  amount: number;
  time: string;
};

const initialLogs: DrinkLog[] = [
  { amount: 250, time: "13:48" },
  { amount: 350, time: "11:32" },
  { amount: 250, time: "09:10" },
];

function WaterProgress({ current, goal }: { current: number; goal: number }) {
  const size = 184;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(Math.round((current / goal) * 100), 100);
  const dashOffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className="relative mx-auto size-[184px]"
      role="progressbar"
      aria-label="ปริมาณน้ำที่ดื่มวันนี้"
      aria-valuemin={0}
      aria-valuemax={goal}
      aria-valuenow={current}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="size-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-secondary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="text-primary transition-all duration-500"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[34px] font-semibold leading-none tracking-[-0.04em] text-foreground">
          {current.toLocaleString()}
        </span>
        <span className="mt-1 text-sm text-muted-foreground">จาก {goal.toLocaleString()} ml</span>
        <span className="mt-2 text-xs font-medium text-primary">{percentage}%</span>
      </div>
    </div>
  );
}

export function WaterHome() {
  const [water, setWater] = useState(1250);
  const [logs, setLogs] = useState<DrinkLog[]>(initialLogs);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [amount, setAmount] = useState(250);

  const remaining = Math.max(DAILY_GOAL - water, 0);
  const percentage = Math.min(Math.round((water / DAILY_GOAL) * 100), 100);

  const statusText = useMemo(() => {
    if (percentage >= 100) return "ครบเป้าหมายวันนี้แล้ว";
    if (percentage >= 70) return "ใกล้ถึงเป้าหมายแล้ว";
    if (percentage >= 40) return "กำลังไปได้ดี";
    return "ค่อย ๆ ดื่มให้สม่ำเสมอ";
  }, [percentage]);

  function openAddSheet(nextAmount = 250) {
    setAmount(nextAmount);
    setSheetOpen(true);
  }

  function saveDrink() {
    const nextWater = Math.min(water + amount, DAILY_GOAL);
    const actualAdded = nextWater - water;

    if (actualAdded <= 0) {
      setSheetOpen(false);
      return;
    }

    const time = new Intl.DateTimeFormat("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());

    setWater(nextWater);
    setLogs((currentLogs) => [
      { amount: actualAdded, time },
      ...currentLogs,
    ]);
    setSheetOpen(false);
  }

  return (
    <main className="min-h-dvh bg-muted/45 sm:px-4 sm:py-5">
      <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-background sm:min-h-[calc(100dvh-2.5rem)] sm:overflow-hidden sm:rounded-[28px] sm:border sm:border-border">
        <header className="flex items-start justify-between px-5 pb-2 pt-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Drink Warner</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-foreground">
              วันนี้
            </h1>
          </div>

          <Button variant="ghost" size="icon" aria-label="การแจ้งเตือน">
            <Bell className="size-5" />
          </Button>
        </header>

        <div className="px-5 pb-28">
          <section className="pt-4 text-center" aria-labelledby="today-goal">
            <p id="today-goal" className="text-sm font-medium text-muted-foreground">
              เป้าหมายการดื่มน้ำ
            </p>

            <div className="mt-5">
              <WaterProgress current={water} goal={DAILY_GOAL} />
            </div>

            <p className="mt-4 text-sm font-medium text-foreground">{statusText}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {remaining > 0 ? `เหลืออีก ${remaining.toLocaleString()} ml` : "ทำได้ตามเป้าหมายแล้ว"}
            </p>
          </section>

          <section className="mt-7" aria-labelledby="quick-add">
            <Button
              size="lg"
              className="w-full rounded-2xl"
              onClick={() => openAddSheet()}
              disabled={water >= DAILY_GOAL}
            >
              <Plus className="size-4" />
              บันทึกการดื่มน้ำ
            </Button>

            <div className="mt-3 grid grid-cols-3 gap-2" aria-labelledby="quick-add">
              <span id="quick-add" className="sr-only">
                เพิ่มปริมาณน้ำแบบด่วน
              </span>
              {QUICK_AMOUNTS.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  variant="secondary"
                  className="h-10 rounded-xl px-2 text-xs"
                  onClick={() => openAddSheet(quickAmount)}
                  disabled={water >= DAILY_GOAL}
                >
                  +{quickAmount} ml
                </Button>
              ))}
            </div>
          </section>

          <section className="mt-8" aria-labelledby="next-reminder">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="next-reminder" className="text-base font-semibold tracking-[-0.02em]">
                การเตือนครั้งถัดไป
              </h2>
            </div>

            <Card className="border-0 bg-secondary/70 shadow-none">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background text-primary">
                  <Bell className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xl font-semibold tracking-[-0.03em]">14:30</p>
                    <span className="text-xs font-medium text-muted-foreground">เปิดอยู่</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock3 className="size-3.5" />
                    เตือนทุก 2 ชั่วโมง
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="mt-8" aria-labelledby="today-history">
            <div className="flex items-center justify-between">
              <h2 id="today-history" className="text-base font-semibold tracking-[-0.02em]">
                วันนี้
              </h2>
              <span className="text-xs text-muted-foreground">{logs.length} รายการ</span>
            </div>

            <div className="mt-2 divide-y divide-border/80">
              {logs.slice(0, 4).map((log, index) => (
                <div
                  key={`${log.time}-${log.amount}-${index}`}
                  className="flex items-center gap-3 py-3.5"
                >
                  <div className="flex size-9 items-center justify-center rounded-full bg-secondary text-primary">
                    <Droplet className="size-4" />
                  </div>
                  <div className="flex flex-1 items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">น้ำเปล่า</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{log.time} น.</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {log.amount} ml
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <nav className="fixed bottom-0 left-1/2 z-40 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-4 border-t border-border bg-background px-3 pb-[calc(.65rem+env(safe-area-inset-bottom))] pt-2 sm:bottom-5 sm:rounded-b-[28px]" aria-label="เมนูหลัก">
          {[
            { label: "วันนี้", icon: Home, active: true },
            { label: "ประวัติ", icon: ChartNoAxesColumnIncreasing },
            { label: "เตือน", icon: Bell },
            { label: "ตั้งค่า", icon: Settings2 },
          ].map((item) => (
            <Button
              key={item.label}
              variant="ghost"
              className={cn(
                "h-auto flex-col gap-1 rounded-xl py-1.5 text-[11px]",
                item.active && "bg-secondary text-primary hover:bg-secondary hover:text-primary",
              )}
              aria-current={item.active ? "page" : undefined}
            >
              <item.icon className="size-[18px]" />
              {item.label}
            </Button>
          ))}
        </nav>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="mx-auto w-full max-w-[430px] pb-[calc(1rem+env(safe-area-inset-bottom))] sm:left-1/2 sm:-translate-x-1/2">
          <SheetHeader>
            <SheetTitle>บันทึกการดื่มน้ำ</SheetTitle>
            <SheetDescription>เลือกปริมาณที่ใกล้เคียงกับที่ดื่มจริง</SheetDescription>
          </SheetHeader>

          <div className="px-5 pb-2 pt-3">
            <div className="flex items-center justify-center gap-6">
              <Button
                variant="outline"
                size="icon"
                aria-label="ลด 50 มิลลิลิตร"
                onClick={() => setAmount((current) => Math.max(50, current - 50))}
              >
                <Minus />
              </Button>

              <div className="min-w-28 text-center">
                <p className="text-4xl font-semibold tracking-[-0.045em] tabular-nums">{amount}</p>
                <p className="mt-1 text-sm text-muted-foreground">ml</p>
              </div>

              <Button
                variant="outline"
                size="icon"
                aria-label="เพิ่ม 50 มิลลิลิตร"
                onClick={() => setAmount((current) => Math.min(1000, current + 50))}
              >
                <Plus />
              </Button>
            </div>

            <div className="mt-7 grid grid-cols-4 gap-2">
              {SHEET_AMOUNTS.map((preset) => (
                <Button
                  key={preset}
                  variant={preset === amount ? "default" : "secondary"}
                  className="h-10 rounded-xl px-2 text-xs"
                  onClick={() => setAmount(preset)}
                >
                  {preset}
                </Button>
              ))}
            </div>

            <Button size="lg" className="mt-5 w-full rounded-2xl" onClick={saveDrink}>
              บันทึก {amount} ml
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
