import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import OrbitField from "@/components/foundation/ambience/OrbitField";
import { getServerInterfaceMode } from "@/lib/preferences/interfaceModeServer";

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

/*
 * Per-mode rather than a constant, because this is the colour iOS paints
 * behind the status bar and around the safe areas of an installed PWA. Left
 * at the warm neutral, Cosmic Mode would run a cream band along the top of a
 * deep-space screen on exactly the device this app is mostly used on.
 */
export async function generateViewport(): Promise<Viewport> {
  const interfaceMode = await getServerInterfaceMode();

  return {
    themeColor: interfaceMode === "yumi-cosmic" ? "#060a14" : "#f5f3ed",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read here, on the server, rather than corrected on the client: the cosmic
  // token layer keys off this attribute, so anything later than the HTML
  // itself means painting the standard surface first and the deep-space one a
  // moment after. See lib/appPreferences.ts for why the mode is a cookie.
  const interfaceMode = await getServerInterfaceMode();

  return (
    <html
      lang="en"
      data-interface-mode={interfaceMode}
      /*
       * The attribute is written imperatively too, by InterfaceModeProvider,
       * the moment the mode changes — and that write is the one that must
       * stand. This element belongs to the root layout, whose payload is not
       * re-fetched on a soft navigation, so without this React can find the
       * cookie's answer in the DOM and the previous mode in its own tree and
       * try to "correct" the live one back to stale. Telling it the DOM wins
       * is the documented resolution for exactly this shape of state; see
       * node_modules/next/dist/docs/01-app/02-guides/
       * preventing-flash-before-hydration.md.
       */
      suppressHydrationWarning
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
        {/*
          The opening animation is deliberately not here. Mounted at the root
          it played over the sign-in page — the first thing a signed-out
          visitor saw was a 2.5s brand film in front of a login form, and by
          the time they were actually inside the app the session flag said it
          had already run. It lives in the protected layout instead, so the
          order is: sign in, opening, home.
        */}
        <OrbitField />
        {children}
        <ServiceWorkerRegister />
        <NativePushRegister />
      </body>
    </html>
  );
}
