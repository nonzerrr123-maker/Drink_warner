"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { HydrationMascot, type MascotMode } from "@/components/hydration-mascot";

const STORAGE_KEY = "drink-warner:dewy-layout:v1";
const BASE_SIZE = 96;
const MIN_SCALE = 0.68;
const MAX_SCALE = 1.72;
const EDGE_GAP = 8;
const BOTTOM_RESERVE = 94;

type PersistedLayout = {
  x: number;
  y: number;
  scale: number;
};

type PixelLayout = {
  x: number;
  y: number;
  scale: number;
};

type Gesture =
  | {
      mode: "drag";
      startPoint: { x: number; y: number };
      startLayout: PixelLayout;
    }
  | {
      mode: "pinch";
      startDistance: number;
      startMidpoint: { x: number; y: number };
      startLayout: PixelLayout;
    }
  | null;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function appFrame() {
  const width = Math.min(window.innerWidth, 430);
  return {
    left: Math.max(0, (window.innerWidth - width) / 2),
    width,
  };
}

function positionBounds(scale: number) {
  const frame = appFrame();
  const size = BASE_SIZE * scale;
  const minX = frame.left + EDGE_GAP;
  const maxX = Math.max(minX, frame.left + frame.width - size - EDGE_GAP);
  const minY = EDGE_GAP;
  const maxY = Math.max(minY, window.innerHeight - BOTTOM_RESERVE - size);

  return { minX, maxX, minY, maxY };
}

function clampLayout(layout: PixelLayout): PixelLayout {
  const scale = clamp(layout.scale, MIN_SCALE, MAX_SCALE);
  const bounds = positionBounds(scale);
  return {
    scale,
    x: clamp(layout.x, bounds.minX, bounds.maxX),
    y: clamp(layout.y, bounds.minY, bounds.maxY),
  };
}

function defaultLayout(): PixelLayout {
  const scale = 0.96;
  const bounds = positionBounds(scale);
  return {
    scale,
    x: bounds.maxX - 10,
    y: clamp(146, bounds.minY, bounds.maxY),
  };
}

function fromPersisted(saved: PersistedLayout): PixelLayout {
  const scale = clamp(Number(saved.scale) || 1, MIN_SCALE, MAX_SCALE);
  const bounds = positionBounds(scale);
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);

  return clampLayout({
    scale,
    x: bounds.minX + clamp(Number(saved.x) || 0, 0, 1) * width,
    y: bounds.minY + clamp(Number(saved.y) || 0, 0, 1) * height,
  });
}

function toPersisted(layout: PixelLayout): PersistedLayout {
  const safe = clampLayout(layout);
  const bounds = positionBounds(safe.scale);
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);

  return {
    scale: safe.scale,
    x: clamp((safe.x - bounds.minX) / width, 0, 1),
    y: clamp((safe.y - bounds.minY) / height, 0, 1),
  };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function FloatingHydrationMascot({
  mode,
  hydrationRatio,
  animationKey,
}: {
  mode: MascotMode;
  hydrationRatio: number;
  animationKey: string;
}) {
  const [layout, setLayout] = useState<PixelLayout>({ x: 0, y: 0, scale: 1 });
  const [mounted, setMounted] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const layoutRef = useRef(layout);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<Gesture>(null);
  const tapRef = useRef<{ x: number; y: number; at: number } | null>(null);
  const controlsTimerRef = useRef<number | null>(null);

  function updateLayout(next: PixelLayout) {
    const safe = clampLayout(next);
    layoutRef.current = safe;
    setLayout(safe);
  }

  function persist(next = layoutRef.current) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersisted(next)));
    } catch {
      // The mascot still works for this session if storage is unavailable.
    }
  }

  function openControls() {
    setControlsOpen(true);
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = window.setTimeout(() => setControlsOpen(false), 3200);
  }

  useEffect(() => {
    let initial = defaultLayout();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) initial = fromPersisted(JSON.parse(raw) as PersistedLayout);
    } catch {
      // Fall back to the default position.
    }

    layoutRef.current = initial;
    setLayout(initial);
    setMounted(true);

    function onResize() {
      const current = layoutRef.current;
      let persisted: PersistedLayout | null = null;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) persisted = JSON.parse(raw) as PersistedLayout;
      } catch {
        persisted = null;
      }

      updateLayout(persisted ? fromPersisted(persisted) : clampLayout(current));
    }

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    };
  }, []);

  function beginGesture() {
    const points = [...pointersRef.current.values()];
    if (points.length >= 2) {
      gestureRef.current = {
        mode: "pinch",
        startDistance: Math.max(1, distance(points[0], points[1])),
        startMidpoint: midpoint(points[0], points[1]),
        startLayout: layoutRef.current,
      };
      return;
    }

    if (points.length === 1) {
      gestureRef.current = {
        mode: "drag",
        startPoint: points[0],
        startLayout: layoutRef.current,
      };
    } else {
      gestureRef.current = null;
    }
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    tapRef.current = { x: event.clientX, y: event.clientY, at: Date.now() };
    setControlsOpen(false);
    beginGesture();
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const points = [...pointersRef.current.values()];
    const gesture = gestureRef.current;

    if (points.length >= 2) {
      if (!gesture || gesture.mode !== "pinch") {
        beginGesture();
        return;
      }

      const currentDistance = Math.max(1, distance(points[0], points[1]));
      const currentMidpoint = midpoint(points[0], points[1]);
      const nextScale = clamp(
        gesture.startLayout.scale * (currentDistance / gesture.startDistance),
        MIN_SCALE,
        MAX_SCALE,
      );
      const sizeDelta = BASE_SIZE * (nextScale - gesture.startLayout.scale);

      updateLayout({
        scale: nextScale,
        x:
          gesture.startLayout.x +
          (currentMidpoint.x - gesture.startMidpoint.x) -
          sizeDelta / 2,
        y:
          gesture.startLayout.y +
          (currentMidpoint.y - gesture.startMidpoint.y) -
          sizeDelta / 2,
      });
      return;
    }

    if (points.length === 1 && gesture?.mode === "drag") {
      updateLayout({
        ...gesture.startLayout,
        x: gesture.startLayout.x + (points[0].x - gesture.startPoint.x),
        y: gesture.startLayout.y + (points[0].y - gesture.startPoint.y),
      });
    }
  }

  function onPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    const tap = tapRef.current;
    pointersRef.current.delete(event.pointerId);
    persist();

    const remaining = [...pointersRef.current.values()];
    if (remaining.length > 0) {
      beginGesture();
    } else {
      gestureRef.current = null;
      if (
        tap &&
        Date.now() - tap.at < 280 &&
        Math.hypot(event.clientX - tap.x, event.clientY - tap.y) < 7
      ) {
        openControls();
      }
    }
  }

  function resizeBy(delta: number) {
    const current = layoutRef.current;
    const nextScale = clamp(current.scale + delta, MIN_SCALE, MAX_SCALE);
    const sizeDelta = BASE_SIZE * (nextScale - current.scale);
    const next = clampLayout({
      scale: nextScale,
      x: current.x - sizeDelta / 2,
      y: current.y - sizeDelta / 2,
    });
    updateLayout(next);
    persist(next);
    openControls();
  }

  function resetLayout() {
    const next = defaultLayout();
    updateLayout(next);
    persist(next);
    openControls();
  }

  if (!mounted) return null;

  const size = BASE_SIZE * layout.scale;

  return (
    <div
      className="fixed z-30 select-none"
      style={{
        left: layout.x,
        top: layout.y,
        width: size,
        height: size,
        touchAction: "none",
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label="Dewy ลากเพื่อย้ายตำแหน่ง ใช้สองนิ้วเพื่อย่อหรือขยาย"
        className="h-full w-full cursor-grab rounded-full outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring/50"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={(event) => {
          if (event.key === "+" || event.key === "=") resizeBy(0.1);
          if (event.key === "-") resizeBy(-0.1);
          if (event.key === "Enter" || event.key === " ") openControls();
        }}
      >
        <HydrationMascot
          key={animationKey}
          mode={mode}
          hydrationRatio={hydrationRatio}
          size={size}
        />
      </div>

      {controlsOpen ? (
        <div
          className="absolute left-1/2 top-full mt-1 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/70 bg-background/95 p-1 shadow-sm backdrop-blur"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label="ย่อ Dewy"
            onClick={() => resizeBy(-0.1)}
          >
            <Minus className="size-3.5" />
          </button>
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label="ขยาย Dewy"
            onClick={() => resizeBy(0.1)}
          >
            <Plus className="size-3.5" />
          </button>
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label="คืนตำแหน่ง Dewy"
            onClick={resetLayout}
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
