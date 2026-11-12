"use client";

import { useEffect } from "react";

import CommandDeck from "@/components/cosmic/CommandDeck";
import HomeHangyumiKey from "@/components/home/HomeHangyumiKey";
import HomeModePortal from "@/components/home/HomeModePortal";
import HomeShopKey from "@/components/home/HomeShopKey";
import { InterfaceModeProvider } from "@/contexts/InterfaceModeContext";
import { LearningLanguageProvider } from "@/contexts/LearningLanguageContext";
import { LexiconSearchProvider } from "@/contexts/LexiconSearchContext";
import { VocabularyProvider } from "@/contexts/VocabularyContext";
import type { InterfaceMode } from "@/lib/appPreferences";
import { setLaunching } from "@/lib/launchState";

/**
 * The Command Deck, signed out, for looking at Yumi.
 *
 * Every readout on the deck comes back empty here — there is no session, so
 * there are no words, no reviews due and no unread messages. That is fine and
 * in fact useful: what this screen exists to check is the character at rest,
 * which is the state the numbers have nothing to do with and the state a
 * reader spends almost all of their time in.
 *
 * `storedMode` is the reader's real setting, and passing it through rather
 * than forcing "yumi-cosmic" is the whole reason this component takes a prop.
 * InterfaceModeProvider reconciles once on mount: where the value it is given
 * disagrees with what the device has stored, it writes its own answer to the
 * cookie so the next load is decided before any React runs. Handing it a
 * forced mode therefore does not preview Cosmic Mode — it switches the account
 * into it, permanently, from a page whose entire job is to look at something.
 *
 * The deep-space palette comes from the attribute below instead. That is the
 * only thing the token layer keys on (see app/cosmic.css), it is scoped to
 * this page, and because every load re-derives it from the cookie on the
 * server, even an unmount that never runs — a hard navigation away — leaves
 * nothing behind.
 */
export default function CosmicYumiReview({
  storedMode,
}: {
  storedMode: InterfaceMode;
}) {
  /* No opening plays here: say so, as SplashGate does in the app when it
     skips one, so the deck's wake starts as it would there. */
  useEffect(() => setLaunching(false), []);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute("data-interface-mode");

    root.setAttribute("data-interface-mode", "yumi-cosmic");

    return () => {
      if (previous === null) root.removeAttribute("data-interface-mode");
      else root.setAttribute("data-interface-mode", previous);
    };
  }, []);

  return (
    <InterfaceModeProvider initialMode={storedMode}>
      <LearningLanguageProvider
        initialLearningLanguage="en"
        initialNativeLanguage="zh-TW"
      >
        <VocabularyProvider>
          <LexiconSearchProvider>
            {/* Home's corner keys, as the real home has them over the
                deck's bar (Chi, 2026-11-12: the obsidian bridge). */}
            <HomeHangyumiKey />
            <HomeShopKey />
            <HomeModePortal />
            <CommandDeck />
          </LexiconSearchProvider>
        </VocabularyProvider>
      </LearningLanguageProvider>
    </InterfaceModeProvider>
  );
}
