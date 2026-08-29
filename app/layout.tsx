import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Drink Warner",
  description: "Drink Warner application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
