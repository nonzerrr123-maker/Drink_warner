import type { Metadata, Viewport } from "next";

import { HydrationProvider } from "@/components/hydration-provider";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Drink Warner",
  applicationName: "Drink Warner",
  description: "เว็บแอปช่วยติดตามและเตือนการดื่มน้ำในแต่ละวัน",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Drink Warner",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        <PwaRegister />
        <HydrationProvider>{children}</HydrationProvider>
      </body>
    </html>
  );
}
