import type { Metadata, Viewport } from "next";

import { HydrationProvider } from "@/components/hydration-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Drink Warner",
  description: "เว็บแอปช่วยติดตามและเตือนการดื่มน้ำในแต่ละวัน",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7fcfb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>
        <HydrationProvider>{children}</HydrationProvider>
      </body>
    </html>
  );
}
