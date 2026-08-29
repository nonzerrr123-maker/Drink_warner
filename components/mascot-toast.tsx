"use client";

import { AnimatePresence, motion } from "motion/react";

import { HydrationMascot, type MascotMode } from "@/components/hydration-mascot";

type MascotToastProps = {
  open: boolean;
  title: string;
  description?: string;
  mode?: MascotMode;
  mascotMode?: MascotMode;
  hydrationRatio?: number;
};

export function MascotToast({
  open,
  title,
  description,
  mode,
  mascotMode,
  hydrationRatio = 1,
}: MascotToastProps) {
  const resolvedMode = mode ?? mascotMode ?? "celebrate";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4"
          role="status"
          aria-live="polite"
        >
          <div className="flex w-full max-w-[360px] items-center gap-3 rounded-2xl border border-border/70 bg-background/94 px-4 py-3 shadow-sm backdrop-blur-md">
            <HydrationMascot mode={resolvedMode} hydrationRatio={hydrationRatio} size={54} subtle={false} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              {description ? <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p> : null}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
