import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Drink Warner",
    short_name: "Drink Warner",
    description: "ติดตามและเตือนการดื่มน้ำในแต่ละวัน",
    start_url: "/",
    display: "standalone",
    background_color: "#f7fcfb",
    theme_color: "#f7fcfb",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
