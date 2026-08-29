"use client";

import { useMemo, useState } from "react";
import { BellRing, ChevronLeft, ChevronRight, Droplet, Share2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { HydrationMascot, type MascotMode } from "@/components/hydration-mascot";
import { useHydration } from "@/components/hydration-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateRecommendedGoal, type Sex } from "@/lib/hydration";

const sexOptions: { value: Sex; label: string }[] = [
  { value: "unspecified", label: "ไม่ระบุ" },
  { value: "female", label: "หญิง" },
  { value: "male", label: "ชาย" },
  { value: "other", label: "อื่น ๆ" },
];

const steps: { title: string; eyebrow: string; mascot: MascotMode }[] = [
  { title: "สวัสดี เราชื่อ Dewy", eyebrow: "ยินดีต้อนรับ", mascot: "idle" },
  { title: "ให้ Dewy รู้จักคุณนิดหนึ่ง", eyebrow: "ข้อมูลส่วนตัว", mascot: "idle" },
  { title: "ตั้งเป้าหมายที่เหมาะกับคุณ", eyebrow: "เป้าหมายต่อวัน", mascot: "celebrate" },
  { title: "เลือกจังหวะที่อยากให้เตือน", eyebrow: "พร้อมเริ่ม", mascot: "reminder" },
];

export function OnboardingScreen() {
  const router = useRouter();
  const {
    state,
    ready,
    setDailyGoal,
    setProfile,
    setReminders,
    setOnboardingCompleted,
  } = useHydration();
  const [step, setStep] = useState(0);
  const [goalDraft, setGoalDraft] = useState(String(state.dailyGoal));

  const recommendedGoal = useMemo(
    () => calculateRecommendedGoal(state.profile),
    [state.profile],
  );

  if (!ready) {
    return <div className="min-h-dvh bg-background" />;
  }

  const current = steps[step];

  function applyGoal(value: number) {
    const normalized = Math.min(6000, Math.max(500, Math.round(value / 50) * 50));
    setDailyGoal(normalized);
    setGoalDraft(String(normalized));
  }

  function next() {
    if (step < steps.length - 1) setStep((value) => value + 1);
  }

  function finish() {
    setOnboardingCompleted(true);
    router.replace("/");
  }

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(169,226,225,0.20),transparent_34%)] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] text-foreground">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[430px] flex-col">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => step > 0 && setStep((value) => value - 1)}
            className={`flex size-10 items-center justify-center rounded-full transition ${step === 0 ? "pointer-events-none opacity-0" : "hover:bg-secondary"}`}
            aria-label="ย้อนกลับ"
          >
            <ChevronLeft className="size-5" />
          </button>

          <div className="flex gap-1.5" aria-label={`ขั้นตอน ${step + 1} จาก ${steps.length}`}>
            {steps.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 rounded-full transition-all ${index === step ? "w-7 bg-primary" : index < step ? "w-3 bg-primary/40" : "w-3 bg-border"}`}
              />
            ))}
          </div>

          <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{step + 1}/{steps.length}</span>
        </div>

        <div className="flex flex-1 flex-col pt-7">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">{current.eyebrow}</p>
            <h1 className="mx-auto mt-2 max-w-[330px] text-[28px] font-semibold leading-[1.15] tracking-[-0.045em]">
              {current.title}
            </h1>
          </div>

          <div className="mx-auto mt-5 flex h-[150px] items-center justify-center">
            <HydrationMascot
              key={`${step}-${current.mascot}`}
              mode={current.mascot}
              size={148}
              subtle
              hydrationRatio={step >= 2 ? Math.min(state.dailyGoal / 2500, 1.15) : 0.55}
            />
          </div>

          {step === 0 ? (
            <section className="mx-auto mt-3 max-w-[340px] text-center">
              <p className="text-[15px] leading-6 text-muted-foreground">
                Dewy จะโตและสดชื่นตามน้ำที่คุณดื่ม พร้อมช่วยเตือนแบบเบา ๆ ให้คุณไม่ลืมเติมน้ำระหว่างวัน
              </p>
              <div className="mt-7 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                <div className="rounded-2xl bg-secondary/60 px-2 py-3">
                  <Droplet className="mx-auto mb-2 size-4 text-primary" />
                  บันทึกง่าย
                </div>
                <div className="rounded-2xl bg-secondary/60 px-2 py-3">
                  <BellRing className="mx-auto mb-2 size-4 text-primary" />
                  เตือนพอดี
                </div>
                <div className="rounded-2xl bg-secondary/60 px-2 py-3">
                  <Sparkles className="mx-auto mb-2 size-4 text-primary" />
                  เห็นพัฒนาการ
                </div>
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="mt-2">
              <p className="text-center text-sm leading-6 text-muted-foreground">ข้ามได้ทั้งหมด ใช้เพื่อช่วยคำนวณเป้าหมายโดยประมาณ</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs text-muted-foreground">
                  น้ำหนัก (kg)
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={30}
                    max={250}
                    placeholder="เช่น 65"
                    value={state.profile.weightKg ?? ""}
                    onChange={(event) => setProfile({ weightKg: event.target.value ? Number(event.target.value) : null })}
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
                    onChange={(event) => setProfile({ age: event.target.value ? Number(event.target.value) : null })}
                  />
                </label>
              </div>
              <p className="mt-5 text-xs text-muted-foreground">เพศ</p>
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
            </section>
          ) : null}

          {step === 2 ? (
            <section className="mt-1">
              {recommendedGoal ? (
                <button
                  type="button"
                  onClick={() => applyGoal(recommendedGoal)}
                  className={`w-full rounded-3xl border p-5 text-left transition ${state.dailyGoal === recommendedGoal ? "border-primary/40 bg-secondary/80" : "border-border bg-background hover:bg-secondary/40"}`}
                >
                  <p className="text-xs text-muted-foreground">Dewy แนะนำ</p>
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <p className="text-3xl font-semibold tracking-[-0.05em]">{recommendedGoal.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">ml/วัน</span></p>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">แตะเพื่อใช้</span>
                  </div>
                </button>
              ) : (
                <div className="rounded-3xl bg-secondary/60 p-5 text-center">
                  <p className="text-sm font-medium">เริ่มที่ 2,000 ml/วันได้เลย</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">ถ้าอยากได้ค่าประมาณส่วนตัว สามารถกลับไปกรอกน้ำหนักและอายุได้</p>
                </div>
              )}

              <label className="mt-5 grid gap-2 text-sm font-medium">
                หรือกำหนดเอง
                <div className="flex gap-2">
                  <Input
                    inputMode="numeric"
                    value={goalDraft}
                    onChange={(event) => setGoalDraft(event.target.value.replace(/[^0-9]/g, ""))}
                    onBlur={() => {
                      const value = Number(goalDraft);
                      if (Number.isFinite(value) && value > 0) applyGoal(value);
                      else setGoalDraft(String(state.dailyGoal));
                    }}
                  />
                  <div className="flex h-11 items-center rounded-xl bg-muted px-3 text-sm text-muted-foreground">ml</div>
                </div>
              </label>

              <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
                เป้าหมายแนะนำเป็นค่าประมาณจากข้อมูลที่กรอก ไม่ใช่คำแนะนำทางการแพทย์ และความต้องการน้ำอาจเปลี่ยนตามกิจกรรม อากาศ และสุขภาพ
              </p>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="mt-1">
              <button
                type="button"
                onClick={() => setReminders({ enabled: !state.reminders.enabled })}
                className="flex w-full items-center justify-between rounded-2xl bg-secondary/70 p-4 text-left"
              >
                <div>
                  <p className="text-sm font-semibold">เตือนให้ดื่มน้ำ</p>
                  <p className="mt-1 text-xs text-muted-foreground">{state.reminders.enabled ? "เปิดอยู่" : "ปิดอยู่"}</p>
                </div>
                <span className={`h-6 w-11 rounded-full p-0.5 transition ${state.reminders.enabled ? "bg-primary" : "bg-border"}`}>
                  <span className={`block size-5 rounded-full bg-background transition-transform ${state.reminders.enabled ? "translate-x-5" : "translate-x-0"}`} />
                </span>
              </button>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((hours) => (
                  <Button
                    key={hours}
                    variant={state.reminders.intervalHours === hours ? "default" : "secondary"}
                    className="h-10 rounded-xl px-1 text-xs"
                    onClick={() => setReminders({ intervalHours: hours })}
                  >
                    {hours} ชม.
                  </Button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs text-muted-foreground">
                  เริ่มเตือน
                  <Input type="time" value={state.reminders.startTime} onChange={(event) => setReminders({ startTime: event.target.value })} />
                </label>
                <label className="grid gap-1.5 text-xs text-muted-foreground">
                  สิ้นสุด
                  <Input type="time" value={state.reminders.endTime} onChange={(event) => setReminders({ endTime: event.target.value })} />
                </label>
              </div>

              <div className="mt-5 flex gap-3 rounded-2xl border border-border/80 p-4">
                <Share2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">ใช้บน iPhone แบบแอปได้</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">เปิดด้วย Safari → Share → Add to Home Screen แล้วเปิด Drink Warner จากไอคอนเพื่อเปิด Web Push ภายหลัง</p>
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <div className="mt-7">
          {step < steps.length - 1 ? (
            <Button size="lg" className="w-full rounded-2xl" onClick={next}>
              {step === 1 ? "ต่อไป" : "ไปต่อ"}
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button size="lg" className="w-full rounded-2xl" onClick={finish}>
              เริ่มใช้ Drink Warner
              <Droplet className="size-4" />
            </Button>
          )}

          {step === 1 ? (
            <button type="button" onClick={next} className="mt-3 w-full py-2 text-xs text-muted-foreground">ข้ามข้อมูลส่วนตัว</button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
