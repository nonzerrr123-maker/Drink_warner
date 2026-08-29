"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { HydrationMascot, type MascotMode } from "@/components/hydration-mascot";

type MascotToastProps = {
  open: boolean;
  title: string;
  description?: string;
  mascotMode?: Exclude<MascotMode, "idle">;
};

export function MascotToast({
  open,
  title,
  description,
  mascotMode = "celebrate",
}: MascotToastProps) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="pointer-events-none fixed inset-x-0 bottom-[calc(5.8rem+env(safe-area-inset-bottom))] z-[70] flex justify-center px-4"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.985 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          role="status"
          aria-live="polite"
        >
          <div className="flex w-full max-w-[370px] items-center gap-2.5 rounded-2xl border border-border/70 bg-background/92 py-2.5 pl-2 pr-4 shadow-[0_8px_28px_rgba(49,95,101,0.08)] backdrop-blur-md">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden">
              <HydrationMascot mode={mascotMode} size={58} subtle />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-semibold tracking-[-0.01em] text-foreground">{title}</p>
              {description ? (
                <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{description}</p>
              ) : null}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
