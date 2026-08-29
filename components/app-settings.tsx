"use client";

import { useMemo, useState } from "react";
import { Calculator, Droplet, UserRound } from "lucide-react";

import { useHydration } from "@/components/hydration-provider";
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
  const { state, setDailyGoal, setQuickAmount, setProfile } = useHydration();
  const [goalDraft, setGoalDraft] = useState(String(state.dailyGoal));

  const recommendedGoal = useMemo(
    () => calculateRecommendedGoal(state.profile),
    [state.profile],
  );

  function saveGoalDraft() {
    const parsed = Number(goalDraft);
    if (Number.isFinite(parsed) && parsed > 0) setDailyGoal(parsed);
    else setGoalDraft(String(state.dailyGoal));
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
            ไม่บังคับกรอก ข้อมูลนี้เก็บไว้ในเบราว์เซอร์ของอุปกรณ์นี้เท่านั้นในเวอร์ชันปัจจุบัน
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
                    <Button className="mt-3 h-9 w-full rounded-xl" onClick={() => { setDailyGoal(recommendedGoal); setGoalDraft(String(recommendedGoal)); }}>
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
            ค่านี้เป็นตัวช่วยตั้งเป้าหมายของแอปจากน้ำหนัก อายุ และเพศ ไม่ใช่คำแนะนำทางการแพทย์ และยังไม่รวมอากาศ การออกกำลังกาย การตั้งครรภ์ โรคประจำตัว หรือยาที่อาจเปลี่ยนความต้องการน้ำ
          </p>
        </section>

        <div className="my-7 h-px bg-border" />

        <section aria-labelledby="quick-title">
          <h2 id="quick-title" className="text-sm font-semibold">ปุ่มเพิ่มน้ำแบบด่วน</h2>
          <p className="mt-1 text-xs text-muted-foreground">ตั้งปริมาณ 3 ปุ่มที่ใช้บ่อยบนหน้าแรก</p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {state.quickAmounts.map((amount, index) => (
              <label key={index} className="grid gap-1.5 text-center text-xs text-muted-foreground">
                ปุ่ม {index + 1}
                <Input
                  type="number"
                  inputMode="numeric"
                  min={50}
                  max={1500}
                  step={50}
                  className="px-2 text-center"
                  value={amount}
                  onChange={(event) => setQuickAmount(index, Number(event.target.value) || 50)}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="mt-7 rounded-2xl border border-border p-4">
          <p className="text-sm font-semibold">การเก็บข้อมูล</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            ตอนนี้ Drink Warner เก็บเป้าหมาย ประวัติการดื่ม การเตือน และข้อมูลโปรไฟล์ไว้ใน localStorage ของเครื่องนี้ จึงไม่หายเมื่อ refresh แต่ยังไม่ sync ข้ามอุปกรณ์
          </p>
        </section>
      </div>
    </MobileShell>
  );
}
