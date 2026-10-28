import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import { Geist, Geist_Mono } from "next/font/google";

import OrbitField from "@/components/foundation/ambience/OrbitField";
import { DevicePreferencesProvider } from "@/contexts/DevicePreferencesContext";
import { rootFontSizeFor } from "@/lib/appPreferences";
import { getInterfaceLanguageMeta } from "@/lib/languages";
import { loadTranslations } from "@/lib/i18n";
import {
  getServerAppFontSize,
  getServerDailyGoalWords,
  getServerInterfaceLanguage,
  getServerInterfaceMode,
} from "@/lib/preferences/serverPreferences";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/*
 * In the reader's display language: the description is what a pasted link
 * previews, and the manifest is the one an install prompt reads (see
 * lib/pwa/webManifest.ts for why each language has its own).
 */
/*
 * Google Fonts stylesheets, applied without blocking the first paint
 * (RootLayout's <head>). Not next/font, deliberately:
 *
 *  - Noto Sans TC is the fallback for Traditional Chinese on platforms
 *    without a refined native CJK font (Windows without JhengHei, Linux,
 *    some Android builds). Google's CDN subsets it per character on the
 *    fly; self-hosting a full CJK family would bundle several MB.
 *  - Noto Serif TC is the serif Standard Mode sets titles and words in
 *    (app/tactile.css), for the Chinese Georgia has no glyphs for. Same
 *    slicing, so a screen downloads only the slices its headings use, and
 *    Cosmic, which never asks for the family, downloads no font files.
 *  - The last two are pinned to exact character lists with `text=`, which
 *    next/font cannot express: the Pronunciation Lab's Zhuyin symbols and
 *    tone marks, and its IPA symbols (lib/pronunciation/{zhuyinSounds,
 *    englishSounds}.ts). Pinning guarantees the glyphs are in the file, so
 *    they never fall back to a mismatched system font (the "亂碼/替代符號"
 *    bug).
 */
const FONT_STYLESHEETS = [
  { href: "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&display=swap" },
  { href: "https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@600&display=swap" },
  {
    href: "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&text=%CB%87%CB%8A%CB%8B%CB%99%E3%84%85%E3%84%86%E3%84%87%E3%84%88%E3%84%89%E3%84%8A%E3%84%8B%E3%84%8C%E3%84%8D%E3%84%8E%E3%84%8F%E3%84%90%E3%84%91%E3%84%92%E3%84%93%E3%84%94%E3%84%95%E3%84%96%E3%84%97%E3%84%98%E3%84%99%E3%84%9A%E3%84%9B%E3%84%9C%E3%84%9D%E3%84%9E%E3%84%9F%E3%84%A0%E3%84%A1%E3%84%A2%E3%84%A3%E3%84%A4%E3%84%A5%E3%84%A6%E3%84%A7%E3%84%A8%E3%84%A9&display=swap",
  },
  {
    href: "https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&text=abdefghijklmnoprstuvwz%C3%A6%C3%B0%C5%8B%C9%91%C9%94%C9%99%C9%9B%C9%9C%C9%A1%C9%AA%CA%83%CA%8A%CA%8C%CA%92%CB%90%CE%B8&display=swap",
  },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const language = await getServerInterfaceLanguage();

  return {
    title: "Exchange Notes",
    description: (await loadTranslations(language)).meta.appDescription,
    manifest: `/manifest/${language}`,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Exchange Notes",
    },
    /*
     * Google's OAuth brand verification asks for the app's domain to be
     * verified in Search Console. exchange-notes-app.vercel.app has no DNS
     * of its own to put a record in, so it is verified as a URL-prefix
     * property with this tag: set GOOGLE_SITE_VERIFICATION in Vercel to the
     * token Search Console gives you and redeploy. Unset, nothing is
     * rendered. See docs/reviews/2026-10-14-google-branding-handoff.md.
     */
    verification: process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : undefined,
  };
}

/*
 * Per-mode rather than a constant, because this is the colour iOS paints
 * behind the status bar and around the safe areas of an installed PWA. Left
 * at the warm neutral, Cosmic Mode would run a cream band along the top of a
 * deep-space screen on exactly the device this app is mostly used on.
 */
export async function generateViewport(): Promise<Viewport> {
  const interfaceMode = await getServerInterfaceMode();

  return {
    themeColor: interfaceMode === "yumi-cosmic" ? "#08090b" : "#f5f3ed",
    /*
     * This used to be the constant "light", on the grounds that the active
     * opening was a pure-white canvas in every interface mode. The opening
     * has a ground of its own now — obsidian in Cosmic Mode, after a 420ms
     * dissolve out of the manifest's white — so the constant described a
     * screen that no longer exists and left Cosmic Mode asking the browser
     * for light form controls and a light scrollbar over a deep-space app.
     *
     * It is safe for this to disagree with the opening's first frame: what
     * color-scheme actually decides here is UA-painted furniture, and the
     * opening has none of it. The canvas is settled separately, by the
     * inline background on <html> below.
     */
    colorScheme: interfaceMode === "yumi-cosmic" ? "dark" : "light",
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
  const interfaceTranslations = await loadTranslations(interfaceLanguage);

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

  // Fetched from the start, applied without blocking (see the <head>).
  for (const { href } of FONT_STYLESHEETS) preload(href, { as: "style" });

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
       * Pure white in both interface modes, which is not the same claim it
       * once was. The opening is no longer white throughout — in Cosmic Mode
       * it dissolves into obsidian — but it still *begins* white, because the
       * manifest splash the OS paints before this document exists is white
       * and a static manifest cannot follow a per-reader setting. So the
       * sequence is one colour handed forward twice: OS splash, this
       * attribute, the opening's first frame, and then a graded dissolve
       * inside the opening where the seam would otherwise be a flash.
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
        backgroundColor: "#ffffff",
        fontSize: rootFontSizeFor(appFontSize),
      }}
    >
      <head>
        {/* Fonts from Google's CDN rather than next/font, which has no
            `text` option (node_modules/next/dist/docs/01-app/03-api-reference/
            02-components/font.md) for the character pinning two of them
            depend on, and self-hosts, the opposite of what the CJK family
            wants. FONT_STYLESHEETS says why each one exists. */}

        {/* Google's two font hosts, connected before the stylesheets
            below ask them for anything. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* The four stylesheets below, each kept for the reason given beside
            it in FONT_STYLESHEETS. They are fetched now (preload) but
            applied by the script after them, which makes them stop blocking
            the first paint: every page waited on four cross-origin requests
            before drawing anything (2026-10-24 audit), while the fonts they
            describe were already display=swap, drawn in the fallback until
            they land. So nothing about how text looks changes, only when the
            page first appears. Without JavaScript they apply as before.
            The preloads are asked for above with react-dom's preload(),
            which writes each once; <link rel="preload"> written here as well
            came out twice. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `${JSON.stringify(FONT_STYLESHEETS.map(({ href }) => href))}.forEach(function(h){var l=document.createElement("link");l.rel="stylesheet";l.href=h;document.head.appendChild(l)})`,
          }}
        />
        <noscript>
          {FONT_STYLESHEETS.map(({ href }) => (
            <link key={href} rel="stylesheet" href={href} />
          ))}
        </noscript>
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
            interfaceTranslations,
            appFontSize,
            dailyGoalWords,
          }}
        >
          {children}
        </DevicePreferencesProvider>
      </body>
    </html>
  );
}
