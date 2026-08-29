"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Calculator, Droplet, Sparkles, UserRound } from "lucide-react";

import { useHydration } from "@/components/hydration-provider";
import { MascotToast } from "@/components/mascot-toast";
import { MobileShell } from "@/components/mobile-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateRecommendedGoal, type Sex } from "@/lib/hydration";

const sexOptions: { value: Sex; label: string }[] = [
  { value: "unspecified", label: "ไม่ระบุ" },
  { value: "female", label: "หญิง" },
  { value: "male", label: "ชาย" },
  { value: "other", label: "อื่น ๆ" },
];

export function AppSettings() {
  const { state, ready, setDailyGoal, setQuickAmount, setProfile } = useHydration();
  const [goalDraft, setGoalDraft] = useState(String(state.dailyGoal));
  const [quickDrafts, setQuickDrafts] = useState<[string, string, string]>([
    String(state.quickAmounts[0]),
    String(state.quickAmounts[1]),
    String(state.quickAmounts[2]),
  ]);
  const [goalToastOpen, setGoalToastOpen] = useState(false);
  const [goalToastDescription, setGoalToastDescription] = useState("");
  const goalToastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ready) return;
    setGoalDraft(String(state.dailyGoal));
    setQuickDrafts(state.quickAmounts.map(String) as [string, string, string]);
  }, [ready, state.dailyGoal, state.quickAmounts]);

  useEffect(() => {
    return () => {
      if (goalToastTimerRef.current) window.clearTimeout(goalToastTimerRef.current);
    };
  }, []);

  const recommendedGoal = useMemo(
    () => calculateRecommendedGoal(state.profile),
    [state.profile],
  );

  function showGoalSaved(goal: number, source: "manual" | "recommended") {
    if (goalToastTimerRef.current) window.clearTimeout(goalToastTimerRef.current);

    setGoalToastDescription(
      source === "recommended"
        ? `ใช้เป้าหมายแนะนำ ${goal.toLocaleString()} ml/วัน เรียบร้อยแล้ว`
        : `เป้าหมายใหม่คือ ${goal.toLocaleString()} ml/วัน`,
    );
    setGoalToastOpen(true);
    goalToastTimerRef.current = window.setTimeout(() => setGoalToastOpen(false), 2400);
  }

  function applyDailyGoal(goal: number, source: "manual" | "recommended", alwaysConfirm = false) {
    const normalized = Math.min(6000, Math.max(500, Math.round(goal / 50) * 50));
    const changed = normalized !== state.dailyGoal;
    setDailyGoal(normalized);
    setGoalDraft(String(normalized));

    if (changed || alwaysConfirm) showGoalSaved(normalized, source);
  }

  function saveGoalDraft() {
    const parsed = Number(goalDraft);
    if (Number.isFinite(parsed) && parsed > 0) {
      applyDailyGoal(parsed, "manual");
    } else {
      setGoalDraft(String(state.dailyGoal));
    }
  }

  function saveQuickAmount(index: number) {
    const parsed = Number(quickDrafts[index]);
    const normalized = Number.isFinite(parsed) && parsed > 0
      ? Math.min(1500, Math.max(50, Math.round(parsed / 50) * 50))
      : state.quickAmounts[index];
    setQuickAmount(index, normalized);
    setQuickDrafts((current) => {
      const next = [...current] as [string, string, string];
      next[index] = String(normalized);
      return next;
    });
  }

  if (!ready) {
    return (
      <MobileShell>
        <div className="px-5 pt-6">
          <div className="h-7 w-20 animate-pulse rounded-lg bg-muted" />
          <div className="mt-6 h-24 animate-pulse rounded-2xl bg-muted" />
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <header className="px-5 pb-2 pt-6">
        <h1 className="text-2xl font-semibold tracking-[-0.035em]">ตั้งค่า</h1>
        <p className="mt-1 text-sm text-muted-foreground">ปรับเป้าหมายให้เข้ากับวิธีใช้ของคุณ</p>
      </header>

      <div className="px-5 pt-4">
        <section aria-labelledby="goal-title">
          <div className="flex items-center gap-2">
            <Droplet className="size-4 text-primary" />
            <h2 id="goal-title" className="text-sm font-semibold">เป้าหมายต่อวัน</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">กำหนดเองได้เสมอ</p>

          <div className="mt-3 flex gap-2">
            <Input
              inputMode="numeric"
              value={goalDraft}
              onChange={(event) => setGoalDraft(event.target.value.replace(/[^0-9]/g, ""))}
              onBlur={saveGoalDraft}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              aria-label="เป้าหมายมิลลิลิตรต่อวัน"
            />
            <div className="flex h-11 items-center rounded-xl bg-muted px-3 text-sm text-muted-foreground">ml</div>
          </div>
        </section>

        <div className="my-7 h-px bg-border" />

        <section aria-labelledby="profile-title">
          <div className="flex items-center gap-2">
            <UserRound className="size-4 text-primary" />
            <h2 id="profile-title" className="text-sm font-semibold">ข้อมูลสำหรับเป้าหมายแนะนำ</h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            กรอกเฉพาะข้อมูลที่ต้องการใช้ช่วยคำนวณเป้าหมายโดยประมาณ
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-xs text-muted-foreground">
              น้ำหนัก (kg)
              <Input
                type="number"
                inputMode="decimal"
                min={30}
                max={250}
                placeholder="เช่น 65"
                value={state.profile.weightKg ?? ""}
                onChange={(event) =>
                  setProfile({ weightKg: event.target.value ? Number(event.target.value) : null })
                }
              />
            </label>
            <label className="grid gap-1.5 text-xs text-muted-foreground">
              อายุ
              <Input
                type="number"
                inputMode="numeric"
                min={18}
                max={100}
                placeholder="เช่น 28"
                value={state.profile.age ?? ""}
                onChange={(event) =>
                  setProfile({ age: event.target.value ? Number(event.target.value) : null })
                }
              />
            </label>
          </div>

          <div className="mt-4">
            <p className="text-xs text-muted-foreground">เพศ</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {sexOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={state.profile.sex === option.value ? "default" : "secondary"}
                  className="h-10 rounded-xl px-1.5 text-xs"
                  onClick={() => setProfile({ sex: option.value })}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-secondary/70 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-primary">
                <Calculator className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">เป้าหมายแนะนำโดยประมาณ</p>
                {recommendedGoal ? (
                  <>
                    <p className="mt-1 text-2xl font-semibold tracking-[-0.035em]">
                      {recommendedGoal.toLocaleString()} ml/วัน
                    </p>
                    <Button
                      className="mt-3 h-9 w-full rounded-xl"
                      onClick={() => applyDailyGoal(recommendedGoal, "recommended", true)}
                    >
                      ใช้เป้าหมายนี้
                    </Button>
                  </>
                ) : (
                  <p className="mt-1 text-sm font-medium">กรอกน้ำหนักและอายุ 18 ปีขึ้นไปเพื่อดูค่าประมาณ</p>
                )}
              </div>
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
            ค่านี้เป็นตัวช่วยตั้งเป้าหมายจากน้ำหนัก อายุ และเพศ ไม่ใช่คำแนะนำทางการแพทย์ และความต้องการน้ำอาจเปลี่ยนตามกิจกรรม อากาศ การตั้งครรภ์ สุขภาพ หรือยาที่ใช้
          </p>
        </section>

        <div className="my-7 h-px bg-border" />

        <section aria-labelledby="quick-title">
          <h2 id="quick-title" className="text-sm font-semibold">ปุ่มเพิ่มน้ำแบบด่วน</h2>
          <p className="mt-1 text-xs text-muted-foreground">ตั้งปริมาณ 3 ปุ่มที่ใช้บ่อยบนหน้าแรก</p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {state.quickAmounts.map((_, index) => (
              <label key={index} className="grid gap-1.5 text-center text-xs text-muted-foreground">
                ปุ่ม {index + 1}
                <Input
                  type="number"
                  inputMode="numeric"
                  min={50}
                  max={1500}
                  step={50}
                  className="px-2 text-center"
                  value={quickDrafts[index]}
                  onChange={(event) => {
                    const value = event.target.value.replace(/[^0-9]/g, "");
                    setQuickDrafts((current) => {
                      const next = [...current] as [string, string, string];
                      next[index] = value;
                      return next;
                    });
                  }}
                  onBlur={() => saveQuickAmount(index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
              </label>
            ))}
          </div>
        </section>

        <Link
          href="/onboarding"
          className="mt-7 flex items-center gap-3 rounded-2xl border border-border p-4 transition hover:bg-secondary/40"
        >
          <div className="flex size-9 items-center justify-center rounded-full bg-secondary text-primary">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">ตั้งค่าเริ่มต้นอีกครั้ง</p>
            <p className="mt-1 text-xs text-muted-foreground">กลับไปเลือกเป้าหมายและช่วงเวลาเตือนกับ Dewy</p>
          </div>
        </Link>
      </div>

      <MascotToast
        open={goalToastOpen}
        title="ตั้งเป้าหมายสำเร็จแล้ว"
        description={goalToastDescription}
        mascotMode="celebrate"
      />
    </MobileShell>
  );
}
