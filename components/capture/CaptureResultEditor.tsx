import { Check, LoaderCircle, Send, Volume2 } from "lucide-react";

import AppBadge from "@/components/ui/AppBadge";
import AppButton from "@/components/ui/AppButton";
import AppCard from "@/components/ui/AppCard";
import type { VocabularyCategory } from "@/lib/types/app";

type EditableResult = {
  englishName: string;
  chineseName: string;
  partOfSpeech: string;
  englishExample: string;
  chineseExample: string;
  confidence: "high" | "medium" | "low";
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
  onChange: (patch: Partial<EditableResult>) => void;
  onSpeak: (text: string, language: "en-US" | "zh-TW") => void;
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
  "mt-2 w-full rounded-[16px] border border-black/[0.08] bg-white px-4 py-3 text-[15px] outline-none transition focus:border-black/30";

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
  return (
    <div className="mt-5 space-y-4">
      <AppCard padding="lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="app-eyebrow">AI result</p>
            <h2 className="mt-2 text-[23px] font-semibold tracking-[-0.035em]">
              Review before saving
            </h2>
          </div>
          <AppBadge>{result.confidence} confidence</AppBadge>
        </div>

        <div className="mt-6 grid gap-5">
          <label className="block">
            <span className="text-[12px] font-semibold text-black/55">
              English word
            </span>
            <div className="relative">
              <input
                value={result.englishName}
                onChange={(event) =>
                  onChange({ englishName: event.target.value })
                }
                className={`${fieldClass} pr-12`}
                autoCapitalize="none"
              />
              <button
                type="button"
                aria-label="Play English pronunciation"
                onClick={() => onSpeak(result.englishName, "en-US")}
                className="absolute right-2 top-1/2 mt-1 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-black/45 hover:bg-black/[0.04]"
              >
                <Volume2 size={16} />
              </button>
            </div>
            {englishPronunciation ? (
              <p className="mt-1.5 text-[11px] text-black/38">
                {englishPronunciation}
              </p>
            ) : null}
          </label>

          <label className="block">
            <span className="text-[12px] font-semibold text-black/55">
              繁體中文
            </span>
            <div className="relative">
              <input
                value={result.chineseName}
                onChange={(event) =>
                  onChange({ chineseName: event.target.value })
                }
                className={`${fieldClass} pr-12`}
              />
              <button
                type="button"
                aria-label="播放中文發音"
                onClick={() => onSpeak(result.chineseName, "zh-TW")}
                className="absolute right-2 top-1/2 mt-1 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-black/45 hover:bg-black/[0.04]"
              >
                <Volume2 size={16} />
              </button>
            </div>
            {chinesePronunciation ? (
              <p className="mt-1.5 text-[11px] text-black/38">
                {chinesePronunciation}
              </p>
            ) : null}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[12px] font-semibold text-black/55">
                Part of speech
              </span>
              <input
                value={result.partOfSpeech}
                onChange={(event) =>
                  onChange({ partOfSpeech: event.target.value })
                }
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-black/55">
                Collection
              </span>
              <select
                value={result.category}
                onChange={(event) =>
                  onChange({
                    category: event.target.value as VocabularyCategory,
                  })
                }
                className={fieldClass}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category.replaceAll("-", " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-[12px] font-semibold text-black/55">
              English example
            </span>
            <textarea
              value={result.englishExample}
              onChange={(event) =>
                onChange({ englishExample: event.target.value })
              }
              rows={3}
              className={`${fieldClass} resize-none leading-6`}
            />
          </label>

          <label className="block">
            <span className="text-[12px] font-semibold text-black/55">
              中文例句
            </span>
            <textarea
              value={result.chineseExample}
              onChange={(event) =>
                onChange({ chineseExample: event.target.value })
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
          disabled={
            saving ||
            saved ||
            !result.englishName.trim() ||
            !result.chineseName.trim()
          }
          className="w-full"
        >
          {saving ? <LoaderCircle size={16} className="animate-spin" /> : null}
          {saved ? <Check size={16} /> : null}
          {saving
            ? "Saving"
            : saved
              ? "Saved to Vocabulary"
              : "Save to Vocabulary"}
        </AppButton>

        <AppButton
          variant="secondary"
          size="lg"
          onClick={onSend}
          disabled={sending || loadingPartners}
          className="w-full"
        >
          {loadingPartners ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          {loadingPartners ? "Loading partners" : "Send to partner"}
        </AppButton>
      </div>
    </div>
  );
}
