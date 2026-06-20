import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import TopProgress from "@/components/TopProgress";

export const metadata: Metadata = {
  title: "LessonHub",
  description: "개인 1:1 레슨 예약 · 운영 도구",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "LessonHub", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#EC6A4C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <PwaRegister />
        <TopProgress />
        {children}
      </body>
    </html>
  );
}
