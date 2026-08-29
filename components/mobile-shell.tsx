"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChartNoAxesColumnIncreasing, Home, Settings2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "วันนี้", icon: Home },
  { href: "/history", label: "ประวัติ", icon: ChartNoAxesColumnIncreasing },
  { href: "/reminders", label: "เตือน", icon: Bell },
  { href: "/settings", label: "ตั้งค่า", icon: Settings2 },
];

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="min-h-dvh bg-muted/45 sm:px-4 sm:py-5">
      <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-background sm:min-h-[calc(100dvh-2.5rem)] sm:overflow-hidden sm:rounded-[28px] sm:border sm:border-border">
        <div className="pb-28">{children}</div>

        <nav
          className="fixed bottom-0 left-1/2 z-40 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-4 border-t border-border bg-background/95 px-3 pb-[calc(.65rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-sm sm:bottom-5 sm:rounded-b-[28px]"
          aria-label="เมนูหลัก"
        >
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-auto flex-col gap-1 rounded-xl py-1.5 text-[11px]",
                  active && "bg-secondary text-primary hover:bg-secondary hover:text-primary",
                )}
              >
                <Icon className="size-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </main>
  );
}
