"use client";

import { useMemo, useState } from "react";
import { Droplet } from "lucide-react";

import { useHydration } from "@/components/hydration-provider";
import { MobileShell } from "@/components/mobile-shell";
import { Button } from "@/components/ui/button";
import {
  dateKey,
  formatLogTime,
  formatThaiDayLabel,
  formatThaiShortDate,
  getDayLogs,
  getDayTotal,
  getRecentDateKeys,
} from "@/lib/hydration";

export function HydrationHistory() {
  const { state } = useHydration();
  const [range, setRange] = useState<7 | 30>(7);
  const [selectedDate, setSelectedDate] = useState(() => dateKey());

  const dateKeys = useMemo(() => getRecentDateKeys(range), [range]);
  const totals = dateKeys.map((key) => getDayTotal(state, key));
  const totalAmount = totals.reduce((sum, amount) => sum + amount, 0);
  const average = Math.round(totalAmount / range);
  const daysOnGoal = totals.filter((amount) => amount >= state.dailyGoal).length;
  const selectedLogs = getDayLogs(state, selectedDate);
  const selectedTotal = getDayTotal(state, selectedDate);

  return (
    <MobileShell>
      <header className="px-5 pb-2 pt-6">
        <h1 className="text-2xl font-semibold tracking-[-0.035em]">ประวัติ</h1>
        <p className="mt-1 text-sm text-muted-foreground">ดูแนวโน้มการดื่มน้ำของคุณ</p>
      </header>

      <div className="px-5 pt-4">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
          {[7, 30].map((value) => (
            <Button
              key={value}
              variant={range === value ? "default" : "ghost"}
              className="h-9 rounded-xl"
              onClick={() => setRange(value as 7 | 30)}
            >
              {value} วัน
            </Button>
          ))}
        </div>

        <section className="mt-6" aria-labelledby="history-chart">
          <div className="flex items-end justify-between">
            <div>
              <h2 id="history-chart" className="text-sm font-semibold">ภาพรวม</h2>
              <p className="mt-1 text-xs text-muted-foreground">แตะวันที่เพื่อดูรายละเอียด</p>
            </div>
            <p className="text-xs text-muted-foreground">เป้า {state.dailyGoal.toLocaleString()} ml</p>
          </div>

          <div className="mt-5 overflow-x-auto pb-2">
            <div className={range === 7 ? "grid min-w-full grid-cols-7 gap-2" : "flex min-w-max gap-2"}>
              {dateKeys.map((key) => {
                const total = getDayTotal(state, key);
                const height = Math.min(100, state.dailyGoal > 0 ? (total / state.dailyGoal) * 100 : 0);
                const active = selectedDate === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    className={range === 7 ? "min-w-0 text-center" : "w-9 text-center"}
                    aria-label={`${formatThaiShortDate(key)} ${total} มิลลิลิตร`}
                  >
                    <div className="flex h-36 items-end justify-center rounded-xl bg-muted/70 p-1.5">
                      <div
                        className={`w-full rounded-lg transition-all ${active ? "bg-primary" : "bg-primary/45"}`}
                        style={{ height: `${Math.max(total > 0 ? 5 : 0, height)}%` }}
                      />
                    </div>
                    <p className={`mt-2 text-[11px] ${active ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                      {formatThaiDayLabel(key)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3" aria-label="สรุปสถิติ">
          <div className="rounded-2xl bg-secondary/65 p-4">
            <p className="text-xs text-muted-foreground">เฉลี่ยต่อวัน</p>
            <p className="mt-1 text-xl font-semibold tracking-[-0.03em]">{average.toLocaleString()} ml</p>
          </div>
          <div className="rounded-2xl bg-secondary/65 p-4">
            <p className="text-xs text-muted-foreground">ถึงเป้าหมาย</p>
            <p className="mt-1 text-xl font-semibold tracking-[-0.03em]">{daysOnGoal}/{range} วัน</p>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="selected-day">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="selected-day" className="text-base font-semibold">{formatThaiShortDate(selectedDate)}</h2>
              <p className="mt-1 text-xs text-muted-foreground">รายการที่บันทึกในวันนั้น</p>
            </div>
            <p className="text-sm font-semibold">{selectedTotal.toLocaleString()} ml</p>
          </div>

          {selectedLogs.length > 0 ? (
            <div className="mt-3 divide-y divide-border/80">
              {selectedLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 py-3.5">
                  <div className="flex size-9 items-center justify-center rounded-full bg-secondary text-primary">
                    <Droplet className="size-4" />
                  </div>
                  <div className="flex flex-1 items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">น้ำเปล่า</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatLogTime(log.at)} น.</p>
                    </div>
                    <p className="text-sm font-semibold">{log.amount} ml</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-border px-4 py-6 text-center">
              <Droplet className="mx-auto size-5 text-primary" />
              <p className="mt-2 text-sm font-medium">ไม่มีรายการในวันนี้</p>
              <p className="mt-1 text-xs text-muted-foreground">วันที่ที่บันทึกน้ำไว้จะมีรายละเอียดแสดงตรงนี้</p>
            </div>
          )}
        </section>
      </div>
    </MobileShell>
  );
}
