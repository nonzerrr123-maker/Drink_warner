"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useHydration } from "@/components/hydration-provider";

export function AppGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, ready } = useHydration();

  useEffect(() => {
    if (!ready) return;
    if (!state.onboardingCompleted && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [pathname, ready, router, state.onboardingCompleted]);

  if (!ready) {
    return <div className="min-h-dvh bg-background" />;
  }

  if (!state.onboardingCompleted && pathname !== "/onboarding") {
    return <div className="min-h-dvh bg-background" />;
  }

  return children;
}
