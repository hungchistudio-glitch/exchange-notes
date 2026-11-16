"use client";

import { Captions } from "lucide-react";
import { useState } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import { setReadingDisplay, useReadingDisplay } from "@/components/speech/Furigana";
import useTranslation from "@/hooks/i18n/useTranslation";
import { getLanguageName, type LanguageCode } from "@/lib/languages";
import type { ReadingDisplay } from "@/lib/preferences/readingDisplay";

/* =========================================================
   讀音顯示 (Chi, 2026-11-16)

   One group per language that has readings, each a row of choices: the
   reader takes readings away as they learn, and the screen gets quieter
   with them. Chi's design: Japanese furigana always / word cards only /
   off and romaji on or off; Korean romanization / IPA / off; Chinese
   zhuyin and pinyin each on or off. Kept on this device
   (lib/preferences/readingDisplay.ts).
   ========================================================= */

type Choice<T> = { value: T; label: string };

function ChoiceRow<T extends string | boolean>({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: Choice<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-1.5">
      <span className="text-sm font-medium text-ink-strong">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {choices.map((choice) => {
          const selected = choice.value === value;
          return (
            <button
              key={String(choice.value)}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(choice.value)}
              data-liquid-option=""
              className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors ${
                selected
                  ? "border-[var(--accent-amber)] bg-[var(--accent-amber-wash)] text-ink-strong"
                  : "border-line text-ink-soft hover:text-ink-strong"
              }`}
            >
              {choice.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ReadingDisplaySettingsButton() {
  const [open, setOpen] = useState(false);
  const { t, language } = useTranslation();
  const copy = t.settings.readingDisplay;
  const display = useReadingDisplay();
  const name = (code: LanguageCode) => getLanguageName(code, language);
  const onOff: Choice<boolean>[] = [
    { value: true, label: copy.on },
    { value: false, label: copy.off },
  ];
  const set = (patch: Partial<ReadingDisplay>) => setReadingDisplay(patch);

  return (
    <>
      <SettingsRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        icon={<Captions size={17} strokeWidth={1.8} />}
        onClick={() => setOpen(true)}
      />

      <BottomSheet open={open} onClose={() => setOpen(false)} title={copy.sheetTitle} description={copy.sheetDescription}>
        <div className="space-y-5">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">{name("ja")}</h3>
            <ChoiceRow
              label={copy.furigana}
              value={display.furigana}
              onChange={(furigana) => set({ furigana })}
              choices={[
                { value: "always", label: copy.always },
                { value: "cards", label: copy.cards },
                { value: "off", label: copy.off },
              ]}
            />
            <ChoiceRow label={copy.romaji} value={display.romaji} onChange={(romaji) => set({ romaji })} choices={onOff} />
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">{name("ko")}</h3>
            <ChoiceRow
              label={copy.rowTitle}
              value={display.korean}
              onChange={(korean) => set({ korean })}
              choices={[
                { value: "rr", label: copy.romanization },
                { value: "ipa", label: copy.ipa },
                { value: "off", label: copy.off },
              ]}
            />
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">{name("zh-TW")}</h3>
            <ChoiceRow label={copy.zhuyin} value={display.zhuyin} onChange={(zhuyin) => set({ zhuyin })} choices={onOff} />
            <ChoiceRow label={copy.pinyin} value={display.pinyin} onChange={(pinyin) => set({ pinyin })} choices={onOff} />
          </section>
        </div>
      </BottomSheet>
    </>
  );
}
