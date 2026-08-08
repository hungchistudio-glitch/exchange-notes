import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import SplashGate from "@/components/ui/SplashGate";

import "./globals.css";

import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import NativePushRegister from "./components/NativePushRegister";

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

        {/* Two narrowly-scoped Google Fonts requests, each pinned to an
            exact character list via the `text=` param instead of relying
            on automatic language-subsetting. This guarantees the glyphs
            are actually present in the downloaded font file — the
            Pronunciation Lab's Zhuyin symbols/tone marks and IPA symbols
            are small, fixed sets, so this is cheap and removes any risk of
            them silently falling back to a mismatched system font (the
            "亂碼/替代符號" bug). See lib/pronunciation/{zhuyinSounds,
            englishSounds}.ts for the source symbols. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&text=%CB%87%CB%8A%CB%8B%CB%99%E3%84%85%E3%84%86%E3%84%87%E3%84%88%E3%84%89%E3%84%8A%E3%84%8B%E3%84%8C%E3%84%8D%E3%84%8E%E3%84%8F%E3%84%90%E3%84%91%E3%84%92%E3%84%93%E3%84%94%E3%84%95%E3%84%96%E3%84%97%E3%84%98%E3%84%99%E3%84%9A%E3%84%9B%E3%84%9C%E3%84%9D%E3%84%9E%E3%84%9F%E3%84%A0%E3%84%A1%E3%84%A2%E3%84%A3%E3%84%A4%E3%84%A5%E3%84%A6%E3%84%A7%E3%84%A8%E3%84%A9&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&text=abdefghijklmnoprstuvwz%C3%A6%C3%B0%C5%8B%C9%91%C9%94%C9%99%C9%9B%C9%9C%C9%A1%C9%AA%CA%83%CA%8A%CA%8C%CA%92%CB%90%CE%B8&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <SplashGate />
        {children}
        <ServiceWorkerRegister />
        <NativePushRegister />
      </body>
    </html>
  );
}
