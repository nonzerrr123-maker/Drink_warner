"use client";

import { motion, useReducedMotion } from "motion/react";

export type MascotMode =
  | "idle"
  | "drink"
  | "celebrate"
  | "thirsty"
  | "reminder"
  | "overfull";

type HydrationMascotProps = {
  mode?: MascotMode;
  size?: number;
  subtle?: boolean;
  className?: string;
  hydrationRatio?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function HydrationMascot({
  mode = "idle",
  size = 104,
  subtle = true,
  className,
  hydrationRatio = 0,
}: HydrationMascotProps) {
  const reduceMotion = useReducedMotion();
  const activeMode = reduceMotion ? "idle" : mode;
  const ratio = clamp(hydrationRatio, 0, 1.5);

  // Dewy visibly fills out with the user's hydration progress, but the range
  // stays subtle enough that the character never overwhelms the UI.
  const overallScale = 0.84 + Math.min(ratio, 1) * 0.18 + Math.min(Math.max(ratio - 1, 0), 0.35) * 0.12;
  const widthScale = 0.9 + Math.min(ratio, 1) * 0.1 + (activeMode === "overfull" ? 0.08 : 0);
  const heightScale = activeMode === "thirsty" ? 1.04 : activeMode === "overfull" ? 0.98 : 1;

  const bodyAnimation =
    activeMode === "drink"
      ? { y: [0, -3, -1, 0], rotate: [0, -1.5, 1, 0] }
      : activeMode === "celebrate"
        ? { y: [0, -8, 0], rotate: [0, -3, 3, 0], scale: [1, 1.04, 1] }
        : activeMode === "reminder"
          ? { y: [0, -4, 0], rotate: [0, -2, 2, -1, 0] }
          : activeMode === "thirsty"
            ? { y: [0, 1, 0], rotate: [0, -0.8, 0] }
            : { y: [0, -2.5, 0] };

  const looping = ["idle", "thirsty", "overfull", "reminder"].includes(activeMode);

  return (
    <motion.div
      className={className}
      aria-hidden="true"
      animate={bodyAnimation}
      transition={{
        duration: activeMode === "thirsty" ? 3.8 : activeMode === "reminder" ? 1.9 : looping ? 3.2 : 0.95,
        repeat: looping ? Infinity : 0,
        ease: "easeInOut",
      }}
      style={{ width: size, height: size, opacity: subtle ? 0.82 : 1 }}
    >
      <svg viewBox="0 0 160 160" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <motion.ellipse
          cx="80"
          cy="143"
          rx="31"
          ry="7"
          fill="rgba(70,145,157,0.10)"
          animate={{ scaleX: activeMode === "overfull" ? [1, 1.12, 1] : [1, 1.03, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "80px 143px" }}
        />

        <motion.g
          animate={{ scale: overallScale, scaleX: widthScale, scaleY: heightScale }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: "80px 84px" }}
        >
          <path
            d="M80 20C59 20 43 38 43 59C43 83 58 103 80 120C102 103 117 83 117 59C117 38 101 20 80 20Z"
            fill={activeMode === "thirsty" ? "rgba(153,225,229,0.40)" : activeMode === "overfull" ? "rgba(153,225,229,0.66)" : "rgba(153,225,229,0.56)"}
            stroke="rgba(57,124,136,0.62)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M60 43C64 34 73 30 83 30C91 30 98 33 102 39" stroke="rgba(255,255,255,0.58)" strokeWidth="4" strokeLinecap="round" />

          {activeMode === "thirsty" ? (
            <>
              <path d="M64 64H72" stroke="rgba(37,61,70,0.78)" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M88 64H96" stroke="rgba(37,61,70,0.78)" strokeWidth="2.6" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="68" cy="62" r="3.2" fill="rgba(37,61,70,0.78)" />
              <circle cx="92" cy="62" r="3.2" fill="rgba(37,61,70,0.78)" />
            </>
          )}

          <circle cx="61" cy="73" r="4.6" fill={activeMode === "thirsty" ? "rgba(251,181,191,0.14)" : "rgba(251,181,191,0.28)"} />
          <circle cx="99" cy="73" r="4.6" fill={activeMode === "thirsty" ? "rgba(251,181,191,0.14)" : "rgba(251,181,191,0.28)"} />

          {activeMode === "drink" ? (
            <motion.ellipse cx="80" cy="77" rx="4.5" ry="5" fill="rgba(37,61,70,0.72)" initial={{ scaleY: 0.7 }} animate={{ scaleY: [0.7, 1, 0.75] }} transition={{ duration: 0.65, delay: 0.18 }} />
          ) : activeMode === "thirsty" ? (
            <path d="M74 79C77 76 83 76 86 79" stroke="rgba(37,61,70,0.72)" strokeWidth="2.8" strokeLinecap="round" />
          ) : activeMode === "overfull" ? (
            <path d="M71 76C75 82 85 82 89 76" stroke="rgba(37,61,70,0.72)" strokeWidth="2.8" strokeLinecap="round" />
          ) : activeMode === "reminder" ? (
            <path d="M73 76C76 80 84 80 87 76" stroke="rgba(37,61,70,0.72)" strokeWidth="2.8" strokeLinecap="round" />
          ) : (
            <path d={activeMode === "celebrate" ? "M72 75C76 81 84 81 88 75" : "M73 76C77 79 83 79 87 76"} stroke="rgba(37,61,70,0.72)" strokeWidth="2.8" strokeLinecap="round" />
          )}

          <motion.path
            d="M54 94C47 98 43 105 43 112"
            stroke="rgba(57,124,136,0.62)"
            strokeWidth="3"
            strokeLinecap="round"
            animate={activeMode === "celebrate" ? { rotate: [-8, 18, -5, 0] } : activeMode === "reminder" ? { rotate: [-4, 10, -4, 0] } : { rotate: 0 }}
            transition={{ duration: 0.9 }}
            style={{ transformOrigin: "54px 94px" }}
          />
          <motion.path
            d="M106 94C113 98 117 105 117 112"
            stroke="rgba(57,124,136,0.62)"
            strokeWidth="3"
            strokeLinecap="round"
            animate={activeMode === "drink" ? { rotate: [0, -17, -20, 0] } : activeMode === "celebrate" ? { rotate: [8, -18, 5, 0] } : activeMode === "reminder" ? { rotate: [0, -14, 8, -10, 0] } : { rotate: 0 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
            style={{ transformOrigin: "106px 94px" }}
          />
          <path d="M68 119C67 126 64 132 60 136" stroke="rgba(57,124,136,0.62)" strokeWidth="3" strokeLinecap="round" />
          <path d="M92 119C93 126 96 132 100 136" stroke="rgba(57,124,136,0.62)" strokeWidth="3" strokeLinecap="round" />
        </motion.g>

        <motion.g
          animate={activeMode === "drink" ? { x: [0, -16, -25, -24, 0], y: [0, -5, -14, -12, 0], rotate: [0, -12, -25, -21, 0] } : activeMode === "reminder" ? { x: [0, -4, 3, -3, 0], y: [0, -4, 0, -3, 0], rotate: [0, -8, 10, -6, 0] } : activeMode === "celebrate" ? { x: [0, -4, 1, 0], y: [0, -12, -6, 0], rotate: [0, -12, 8, 0] } : { x: 0, y: 0, rotate: 0 }}
          transition={{ duration: activeMode === "reminder" ? 1.4 : 0.95, ease: [0.22, 1, 0.36, 1], repeat: activeMode === "reminder" ? Infinity : 0, repeatDelay: 0.6 }}
          style={{ transformOrigin: "119px 104px" }}
        >
          <rect x="109" y="96" width="20" height="27" rx="7" fill="rgba(255,255,255,0.68)" stroke="rgba(57,124,136,0.58)" strokeWidth="2.5" />
          <path d="M112 106H126" stroke="rgba(117,205,215,0.72)" strokeWidth="3" strokeLinecap="round" />
          <path d="M112 112H126" stroke="rgba(117,205,215,0.46)" strokeWidth="3" strokeLinecap="round" />
        </motion.g>

        {activeMode === "drink" ? (
          <motion.path d="M102 91C97 86 92 82 87 79" stroke="rgba(104,195,209,0.66)" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: [0, 1, 1], opacity: [0, 0.9, 0] }} transition={{ duration: 0.58, delay: 0.2 }} />
        ) : null}

        {activeMode === "celebrate" ? [
          [45, 48, -10, -12], [116, 42, 9, -15], [38, 78, -14, -5], [122, 76, 14, -7], [78, 23, 0, -16],
        ].map(([cx, cy, x, y], index) => (
          <motion.circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.4} fill="rgba(104,195,209,0.50)" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: [0, 0.9, 0], scale: [0.4, 1, 0.8], x, y }} transition={{ duration: 0.72, delay: 0.08 + index * 0.04 }} />
        )) : null}
      </svg>
    </motion.div>
  );
}
