import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LessonHub",
    short_name: "LessonHub",
    description: "개인 1:1 레슨 예약 · 운영 도구",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF3EE",
    theme_color: "#EC6A4C",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
