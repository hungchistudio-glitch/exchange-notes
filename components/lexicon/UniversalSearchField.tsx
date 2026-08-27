"use client";

import { Camera, Mic, Search } from "lucide-react";

import { useLexiconSearchSheet } from "@/contexts/LexiconSearchContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import useLexiconOnboarding from "@/hooks/lexicon/useLexiconOnboarding";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import { getLanguageName } from "@/lib/languages";
import { insertValues } from "@/lib/utils";

/* =========================================================
   The first thing on the home screen you can actually use

   Looking a word up was the app's most common intention and its best-hidden
   feature: it lived behind a button on the Vocabulary screen called AI
   Search, which you had to already know about to go looking for. Readers
   reported "I don't know where to type a word", which is not a discovery
   problem to be solved with a tooltip — it is the home screen not offering
   the thing people came to do.

   So this sits directly under Yumi, above everything else, permanently.

   It looks like a field and behaves like a button, which is deliberate. A
   real input here would open the keyboard over the bottom half of the home
   screen and leave the answer nowhere to go; tapping opens the full sheet,
   where the field is pinned at the top and the answer gets the screen. What
   the reader sees is the same either way: somewhere to type.
   ========================================================= */

export default function UniversalSearchField() {
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.lexicon;
  const { openSearch } = useLexiconSearchSheet();
  const { pair } = useDisplayLanguages();
  const onboarding = useLexiconOnboarding();

  /*
   * The placeholder names the language being learned, in the language the
   * app is being read in. Those are two different settings and this is the
   * one line where confusing them is most visible: a Chinese interface
   * studying French should read 搜尋或新增法文單字, not "Search or add a
   * French word".
   */
  const placeholder = insertValues(copy.fieldPlaceholderLanguage, {
    language: getLanguageName(pair[0], interfaceLanguage),
  });

  function open() {
    onboarding.dismiss();
    openSearch();
  }

  return (
    <div>
      <div className="flex items-center gap-2 rounded-full border border-[#eadfc4] bg-white px-2 py-2 shadow-[0_8px_28px_rgba(35,28,12,0.07)]">
        <button
          type="button"
          onClick={open}
          aria-label={copy.open}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-full pl-3 pr-1 text-left transition-transform active:scale-[0.99]"
        >
          <Search
            size={18}
            strokeWidth={2}
            className="shrink-0 text-ink-soft"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate py-2.5 text-[15px] text-ink-faint">
            {placeholder}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onboarding.dismiss();
            openSearch({ action: "voice" });
          }}
          aria-label={copy.modeVoice}
          title={copy.modeVoice}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink-strong transition-transform active:scale-95"
        >
          <Mic size={17} strokeWidth={1.8} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => {
            onboarding.dismiss();
            openSearch({ action: "camera" });
          }}
          aria-label={copy.modeCamera}
          title={copy.modeCamera}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink-strong transition-transform active:scale-95"
        >
          <Camera size={17} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>

      {/* One sentence, once. Positioned under the field it describes rather
          than as an overlay pointing at it — an overlay would have to be
          dismissed before the reader could use the thing it is pointing at,
          which is a strange way to introduce a search box. */}
      {onboarding.visible && (
        <div className="mt-2.5 flex items-start gap-2 px-1">
          <p className="min-w-0 flex-1 text-[12px] leading-5 text-ink-faint">
            <span className="font-semibold text-ink-soft">
              {copy.onboardingTitle}
            </span>{" "}
            {copy.onboardingDescription}
          </p>

          <button
            type="button"
            onClick={onboarding.dismiss}
            className="shrink-0 text-[12px] font-semibold text-ink-soft underline underline-offset-2"
          >
            {copy.onboardingDismiss}
          </button>
        </div>
      )}
    </div>
  );
}
