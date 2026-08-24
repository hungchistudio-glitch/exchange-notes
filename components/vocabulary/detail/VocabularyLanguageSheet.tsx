"use client";

import { Check } from "lucide-react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import LanguageOriginBadge from "@/components/language/LanguageOriginBadge";
import useTranslation from "@/hooks/i18n/useTranslation";
import {
  getLanguageName,
  getLearningLanguages,
  type LanguageCode,
} from "@/lib/languages";
import { insertValues } from "@/lib/utils";

/**
 * Correcting which language a saved word is in.
 *
 * The one place a row's language identity may change after it is written,
 * and it changes only because the reader said so — no background process,
 * no settings change, no re-detection on read. Everything else in the app
 * treats the stored language as final, which is only safe because there is
 * a door here.
 *
 * It corrects the language and nothing else. The word, its translation, its
 * examples and its whole review history are untouched: "this is Italian, not
 * Spanish" is a statement about the app's reading of the word, not about the
 * word.
 */
export default function VocabularyLanguageSheet({
  open,
  word,
  current,
  saving,
  onClose,
  onSelect,
}: {
  open: boolean;
  /** The headword, shown so the reader can see what they are labelling. */
  word: string;
  current: LanguageCode;
  saving: boolean;
  onClose: () => void;
  onSelect: (language: LanguageCode) => void;
}) {
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.vocabulary.language;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={copy.changeTitle}
      description={insertValues(copy.changeDescription, { word })}
    >
      <ul className="space-y-1.5 p-4">
        {getLearningLanguages().map((meta) => {
          const selected = meta.code === current;

          return (
            <li key={meta.code}>
              <button
                type="button"
                disabled={saving}
                onClick={() => onSelect(meta.code)}
                aria-pressed={selected}
                className={`flex min-h-[52px] w-full items-center gap-3 rounded-[18px] border px-4 py-3 text-left transition disabled:opacity-50 ${
                  selected
                    ? "border-black bg-black text-white"
                    : "border-black/[0.07] bg-white text-black hover:border-black/20"
                }`}
              >
                <LanguageOriginBadge
                  language={meta.code}
                  className={selected ? "!border-white/25 !bg-white/15" : ""}
                />

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold tracking-[-0.01em]">
                    {meta.endonym}
                  </span>

                  {/*
                    Both names, because they are answers to different
                    questions: the endonym is what will be printed on the
                    card, and this is what the reader's own interface calls
                    it. They coincide only when you are reading the app in
                    the language you are labelling.
                  */}
                  {getLanguageName(meta.code, interfaceLanguage) !==
                  meta.endonym ? (
                    <span
                      className={`block truncate text-[12px] ${
                        selected ? "text-white/70" : "text-ink-faint"
                      }`}
                    >
                      {getLanguageName(meta.code, interfaceLanguage)}
                    </span>
                  ) : null}
                </span>

                {selected ? (
                  <Check size={17} strokeWidth={2.2} className="shrink-0" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </BottomSheet>
  );
}

/** Kept beside the sheet so callers do not re-derive the label. */
export function languagePairSummary(
  term: LanguageCode,
  translation: LanguageCode,
  template: string,
  displayIn: Parameters<typeof getLanguageName>[1],
): string {
  return insertValues(template, {
    term: getLanguageName(term, displayIn),
    translation: getLanguageName(translation, displayIn),
  });
}
