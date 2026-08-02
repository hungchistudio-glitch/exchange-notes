import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import SplashGate from "@/components/ui/SplashGate";

import "./globals.css";

import ServiceWorkerRegister from "./components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Exchange Notes",
  description:
    "Learn English and Traditional Chinese together, one note at a time.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Exchange Notes",
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f3ed",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Noto Sans TC fallback for Traditional Chinese on platforms
            without a refined native CJK font (e.g. Windows without
            JhengHei, Linux, some Android builds). Loaded from Google's
            CDN — which subsets per-character on the fly — rather than
            next/font, since self-hosting a full CJK family would bundle
            several MB into the app. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <SplashGate />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
