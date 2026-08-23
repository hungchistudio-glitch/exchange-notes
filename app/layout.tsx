import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import OrbitField from "@/components/foundation/ambience/OrbitField";
import { DevicePreferencesProvider } from "@/contexts/DevicePreferencesContext";
import { rootFontSizeFor } from "@/lib/appPreferences";
import { getInterfaceLanguageMeta } from "@/lib/languages";
import {
  getServerAppFontSize,
  getServerDailyGoalWords,
  getServerInterfaceLanguage,
  getServerInterfaceMode,
} from "@/lib/preferences/serverPreferences";

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
    /*
     * Not per-mode, unlike themeColor above, and that is the point.
     *
     * On a cold launch of the installed app the OS fades from its splash to
     * the web view, and the web view has nothing painted yet. Its canvas is
     * whatever the user agent picks, which without this is white — a screen
     * recording of the launch shows the splash reach black, then ramp up
     * through grey to near-white, then cut to the app. This tells the agent
     * to pick a dark canvas for that gap instead.
     *
     * Dark is right in both modes because the first thing the app draws is
     * always the opening animation, which is near-black either way (SplashGate
     * renders it on every load of a signed-in page). Standard Mode turns cream
     * only once the opening has finished, seconds later.
     */
    colorScheme: "dark",
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

  /*
   * Read on the server for the same reason as the mode, and with more at
   * stake: this decides every translated string in the tree. Rendered from a
   * default while the browser knew better, React found a mismatch on the
   * first piece of text it hydrated, threw away the whole server tree and
   * rebuilt the page — an English app repainting into a Chinese one, on every
   * single load. See lib/preferences/serverPreferences.ts.
   */
  const interfaceLanguage = await getServerInterfaceLanguage();

  /*
   * Two more the server has to answer, for the same reason and with the same
   * shape. Font size is the root font size, so a reader on "small" was
   * getting the whole interface laid out at 16px and relaid at 15px on every
   * load; the daily goal is rendered as a number, so a server that guessed
   * the default and a browser that knew better disagreed in text — which is
   * the mismatch that rebuilds the document.
   */
  const appFontSize = await getServerAppFontSize();
  const dailyGoalWords = await getServerDailyGoalWords();

  return (
    <html
      /*
       * From the language table rather than decided here, so a sixth
       * interface language needs a row and not another branch. It used to be
       * a hardcoded "en" that the client corrected after mount, which told
       * assistive technology and the browser's own text handling the wrong
       * language for the length of every page load.
       */
      lang={getInterfaceLanguageMeta(interfaceLanguage).htmlLang}
      data-interface-language={interfaceLanguage}
      data-app-font-size={appFontSize}
      /*
       * globals.css sets `scroll-behavior: smooth` on this element, for
       * in-page anchors. Next 15 and earlier quietly suspended that during a
       * route change; Next 16 stopped, and stopping is visible — a navigation
       * away from a long screen animates the whole page up to the top instead
       * of arriving there, which reads as the screen sliding under you rather
       * than as having gone somewhere.
       *
       * This attribute asks for the old behaviour back: auto during the
       * navigation, the stylesheet's smooth everywhere else. See
       * node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md,
       * "Scroll Behavior Override" — which is also the warning this silences,
       * logged on every page load until now.
       */
      data-scroll-behavior="smooth"
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
      /*
       * Inline, and on <html> rather than in a stylesheet, because the moment
       * this covers is the one before any stylesheet has applied. An attribute
       * on the element is in effect as the document is parsed; globals.css
       * arrives later, and the three Google Fonts links in <head> below are
       * render-blocking third-party requests that can push that later still on
       * a cold start.
       *
       * #07080b is the outer stop of the opening animation's backdrop, the
       * same value the manifest splash uses, so the whole launch — splash,
       * this gap, then the opening itself — is one continuous colour.
       *
       * body's own background covers this the moment globals.css lands, in
       * whichever mode is active, so nothing downstream is affected.
       */
      /*
       * The font size is here for a different reason than the colour above:
       * it is the root size every rem in the app is measured against, and
       * until now it was only ever applied on the client. A reader on "small"
       * or "large" therefore got the whole interface laid out at the default
       * and relaid a moment later — a full reflow of every screen, on every
       * load. Rendered here it is right from the first paint, and
       * DevicePreferencesProvider only has to keep it in step afterwards.
       */
      style={{
        backgroundColor: "#07080b",
        fontSize: rootFontSizeFor(appFontSize),
      }}
    >
      <head>
        {/* eslint-disable @next/next/no-page-custom-font --
            The rule wants font <link>s moved out of a page and into the
            document, and in the App Router this file *is* that document —
            a root layout is the one place these belong. It fires anyway
            because the rule predates the App Router and only recognises
            pages/_document.

            Its other suggestion, next/font, cannot express what the three
            links below need. next/font has no `text` option (see
            node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md
            — src, weight, style, subsets, axes, display, preload, fallback,
            adjustFontFallback, variable, declarations), so the character
            pinning two of them depend on has no equivalent, and it
            self-hosts, which is the opposite of what the CJK family wants.
            Each link is deliberate for a reason given below it. */}

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
        {/* eslint-enable @next/next/no-page-custom-font */}
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
        <DevicePreferencesProvider
          initial={{
            interfaceLanguage,
            appFontSize,
            dailyGoalWords,
          }}
        >
          {children}
        </DevicePreferencesProvider>
        <ServiceWorkerRegister />
        <NativePushRegister />
      </body>
    </html>
  );
}
