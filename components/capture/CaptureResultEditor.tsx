"use client";

import {
  Check,
  Send,
  Volume2,
} from "lucide-react";

import AppBadge from "@/components/ui/AppBadge";
import AppButton from "@/components/ui/AppButton";
import AppCard from "@/components/ui/AppCard";
import useTranslation from "@/hooks/i18n/useTranslation";
import type {
  VocabularyCategory,
} from "@/lib/types/app";

type EditableResult = {
  englishName: string;
  chineseName: string;
  partOfSpeech: string;
  englishExample: string;
  chineseExample: string;
  confidence:
    | "high"
    | "medium"
    | "low";
  category: VocabularyCategory;
};

type CaptureResultEditorProps = {
  result: EditableResult;
  englishPronunciation: string;
  chinesePronunciation: string;
  saving: boolean;
  saved: boolean;
  loadingPartners: boolean;
  sending: boolean;
  onChange: (
    patch: Partial<EditableResult>,
  ) => void;
  onSpeak: (
    text: string,
    language: "en-US" | "zh-TW",
  ) => void;
  onSave: () => void;
  onSend: () => void;
};

const categories: VocabularyCategory[] = [
  "people",
  "objects",
  "actions",
  "other",
];

const fieldClass =
  "mt-2 w-full rounded-[16px] border border-black/[0.08] bg-white px-4 py-3.5 text-[15px] leading-6 outline-none transition focus:border-black/30";

function insertValue(
  template: string,
  value: string,
) {
  return template.replace(
    "{value}",
    value,
  );
}

export default function CaptureResultEditor({
  result,
  englishPronunciation,
  chinesePronunciation,
  saving,
  saved,
  loadingPartners,
  sending,
  onChange,
  onSpeak,
  onSave,
  onSend,
}: CaptureResultEditorProps) {
  const { t } = useTranslation();
  const copy = t.capture.result;

  const categoryLabels:
    Record<
      VocabularyCategory,
      string
    > = {
      people:
        t.capture.categories.people,
      objects:
        t.capture.categories.objects,
      actions:
        t.capture.categories.actions,
      other:
        t.capture.categories.other,
    };

  return (
    <div className="mt-5 space-y-4">
      <AppCard padding="lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/34">
              {copy.eyebrow}
            </p>

            <h2 className="mt-2 text-[22px] font-semibold leading-tight tracking-[-0.035em]">
              {copy.title}
            </h2>
          </div>

          <AppBadge>
            {insertValue(
              copy.confidence,
              result.confidence,
            )}
          </AppBadge>
        </div>

        <div className="mt-7 grid gap-5">
          <label className="block">
            <span className="text-[11px] font-semibold tracking-[0.01em] text-black/52">
              {copy.englishWord}
            </span>

            <div className="relative">
              <input
                value={result.englishName}
                onChange={(event) =>
                  onChange({
                    englishName:
                      event.target.value,
                  })
                }
                className={`${fieldClass} pr-12`}
                autoCapitalize="none"
              />

              <button
                type="button"
                aria-label={
                  copy.playEnglishAriaLabel
                }
                onClick={() =>
                  onSpeak(
                    result.englishName,
                    "en-US",
                  )
                }
                className="absolute right-2 top-1/2 mt-1 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-black/45 hover:bg-black/[0.04]"
              >
                <Volume2 size={16} />
              </button>
            </div>

            {englishPronunciation ? (
              <p className="mt-1.5 text-[10px] leading-5 text-black/36">
                {englishPronunciation}
              </p>
            ) : null}
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold tracking-[0.01em] text-black/52">
              {copy.traditionalChinese}
            </span>

            <div className="relative">
              <input
                value={result.chineseName}
                onChange={(event) =>
                  onChange({
                    chineseName:
                      event.target.value,
                  })
                }
                className={`${fieldClass} pr-12`}
              />

              <button
                type="button"
                aria-label={
                  copy.playChineseAriaLabel
                }
                onClick={() =>
                  onSpeak(
                    result.chineseName,
                    "zh-TW",
                  )
                }
                className="absolute right-2 top-1/2 mt-1 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-black/45 hover:bg-black/[0.04]"
              >
                <Volume2 size={16} />
              </button>
            </div>

            {chinesePronunciation ? (
              <p className="mt-1.5 text-[10px] leading-5 text-black/36">
                {chinesePronunciation}
              </p>
            ) : null}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-semibold tracking-[0.01em] text-black/52">
                {copy.partOfSpeech}
              </span>

              <input
                value={result.partOfSpeech}
                onChange={(event) =>
                  onChange({
                    partOfSpeech:
                      event.target.value,
                  })
                }
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold tracking-[0.01em] text-black/52">
                {copy.collection}
              </span>

              <select
                value={result.category}
                onChange={(event) =>
                  onChange({
                    category:
                      event.target
                        .value as VocabularyCategory,
                  })
                }
                className={fieldClass}
              >
                {categories.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {
                        categoryLabels[
                          category
                        ]
                      }
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] font-semibold tracking-[0.01em] text-black/52">
              {copy.englishExample}
            </span>

            <textarea
              value={result.englishExample}
              onChange={(event) =>
                onChange({
                  englishExample:
                    event.target.value,
                })
              }
              rows={3}
              className={`${fieldClass} resize-none leading-6`}
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold tracking-[0.01em] text-black/52">
              {copy.chineseExample}
            </span>

            <textarea
              value={result.chineseExample}
              onChange={(event) =>
                onChange({
                  chineseExample:
                    event.target.value,
                })
              }
              rows={3}
              className={`${fieldClass} resize-none leading-6`}
            />
          </label>
        </div>
      </AppCard>

      <div className="grid gap-2.5">
        <AppButton
          size="lg"
          onClick={onSave}
          loading={saving}
          loadingLabel={copy.saving}
          disabled={
            saved ||
            !result.englishName.trim() ||
            !result.chineseName.trim()
          }
          fullWidth
          leftIcon={
            saved ? (
              <Check
                size={16}
                strokeWidth={1.9}
              />
            ) : undefined
          }
          className="text-[14px] font-semibold"
        >
          {saved
            ? copy.saved
            : copy.saveToVocabulary}
        </AppButton>

        <AppButton
          variant="secondary"
          size="lg"
          onClick={onSend}
          loading={loadingPartners}
          loadingLabel={copy.loadingPartners}
          disabled={sending}
          fullWidth
          leftIcon={
            <Send
              size={16}
              strokeWidth={1.8}
            />
          }
          className="text-[14px] font-semibold"
        >
          {copy.sendToPartner}
        </AppButton>
      </div>
    </div>
  );
}
