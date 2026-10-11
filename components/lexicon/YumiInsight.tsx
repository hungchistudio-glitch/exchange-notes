"use client";

import { ChevronDown, Volume2 } from "lucide-react";
import { useId, useState } from "react";

import ExchangeNotesMark from "@/components/ui/ExchangeNotesMark";
import useTranslation from "@/hooks/i18n/useTranslation";
import { getLanguage, type LanguageCode } from "@/lib/languages";
import { readInsight } from "@/lib/lexicon/types";
import { speak } from "@/lib/speech";

import type { LexiconTone } from "@/components/lexicon/LexiconResults";

/*
 * Yumi's reading of a sentence, under its translation.
 *
 * One line is always there — the point of what was said, the thing a friend
 * who speaks both languages would lean over and tell you. The rest waits
 * behind "read more": tone, what is meant without being said, the culture
 * around it, and the expressions that do not mean what their words do. A
 * card that opened with all five would bury the one line most people came
 * for.
 *
 * Written in the app's display language (LexiconInsight.language), which is
 * why `lang` is set on the block: a screen reader should read a Chinese
 * explanation of an English sentence in a Chinese voice.
 */
export default function YumiInsight({
  insight: rawInsight,
  phraseLanguage,
  tone,
}: {
  insight: unknown;
  /** The language the explained expressions are quoted in. */
  phraseLanguage: LanguageCode;
  tone: LexiconTone;
}) {
  const { t } = useTranslation();
  const copy = t.lexicon.insight;
  const [open, setOpen] = useState(false);
  const detailsId = useId();

  const insight = readInsight(rawInsight);
  if (!insight) return null;

  const sections = [
    { key: "literal", label: copy.literal, text: insight.literal },
    { key: "tone", label: copy.tone, text: insight.tone },
    { key: "implied", label: copy.implied, text: insight.implied },
    { key: "context", label: copy.context, text: insight.context },
  ].filter((section) => section.text);

  const hasMore = sections.length > 0 || insight.phrases.length > 0;
  const cosmic = tone === "cosmic";
  const label = cosmic
    ? "hud-label"
    : "text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ink-faint";

  return (
    <section
      lang={getLanguage(insight.language).speechTag}
      aria-label={copy.title}
      className={`yumi-insight mt-4 rounded-[18px] p-4 ${
        cosmic
          ? "border border-[var(--cosmic-cyan-dim)]"
          : "bg-[linear-gradient(135deg,#fff8e6,#f6f1ff)]"
      }`}
    >
      <header className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            cosmic ? "border border-[var(--cosmic-cyan-dim)]" : "bg-white"
          }`}
        >
          <ExchangeNotesMark className="h-5 w-5" />
        </span>
        <p className={cosmic ? "hud-label" : "text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-soft"}>
          {copy.title}
        </p>
      </header>

      <p className="mt-2.5 text-[0.9375rem] font-medium leading-7 text-ink-strong">
        {insight.gist}
      </p>

      {hasMore && open && (
        <div id={detailsId} className="yumi-insight-details mt-3 space-y-3">
          {sections.map((section) => (
            <div key={section.key}>
              <p className={label}>{section.label}</p>
              <p className="mt-1 text-[0.8125rem] leading-6 text-ink-soft">
                {section.text}
              </p>
            </div>
          ))}

          {insight.phrases.length > 0 && (
            <div>
              <p className={label}>{copy.phrases}</p>
              <ul className="mt-1.5 space-y-2">
                {insight.phrases.map((item) => (
                  <li key={item.phrase} className="flex items-start gap-2.5">
                    <div className="min-w-0 flex-1">
                      <p
                        lang={getLanguage(phraseLanguage).speechTag}
                        className={`text-[0.875rem] font-semibold underline decoration-dotted underline-offset-4 ${
                          cosmic
                            ? "decoration-[var(--cosmic-cyan)]"
                            : "decoration-[var(--accent-amber)]"
                        }`}
                      >
                        {item.phrase}
                      </p>
                      <p className="mt-0.5 text-[0.8125rem] leading-6 text-ink-soft">
                        {item.note}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        speak(item.phrase, getLanguage(phraseLanguage).speechTag)
                      }
                      aria-label={`${t.lexicon.listen}: ${item.phrase}`}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 ${
                        cosmic
                          ? "border border-[var(--cosmic-cyan-dim)] text-[var(--cosmic-cyan)]"
                          : "bg-white text-ink-soft"
                      }`}
                    >
                      <Volume2 size={14} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={detailsId}
          className={`mt-2.5 flex min-h-11 items-center gap-1 text-[0.75rem] font-semibold ${
            cosmic ? "text-[var(--cosmic-cyan)]" : "text-ink-soft"
          }`}
        >
          {open ? copy.less : copy.more}
          <ChevronDown
            size={14}
            strokeWidth={2}
            aria-hidden="true"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </section>
  );
}
