"use client";

import type { ReactNode } from "react";
import { LoaderCircle, Volume2 } from "lucide-react";

type LanguageCode = "en-US" | "zh-TW";

type WordLanguageBlock = {
  label: string;
  text: string;
  pronunciationLabel: string;
  pronunciation: string;
  language: LanguageCode;
};

type ExampleBlock = {
  label: string;
  text: string;
  language: LanguageCode;
};

type AdaptiveWordCardProps = {
  imageUrl?: string | null;
  imageAlt?: string;

  primary: WordLanguageBlock;
  secondary: WordLanguageBlock;

  englishExample?: ExampleBlock | null;
  chineseExample?: ExampleBlock | null;

  partOfSpeech?: string | null;
  confidence?: string | null;
  statusLabel?: string | null;

  pronunciationLoading?: boolean;
  pronunciationError?: string;

  onSpeak: (text: string, language: LanguageCode) => void;
  onRetryPronunciation?: () => void;

  headerLabel?: string;
  actions?: ReactNode;
  footer?: ReactNode;
};

function SpeakerButton({
  text,
  language,
  label,
  size = "large",
  onSpeak,
}: {
  text: string;
  language: LanguageCode;
  label: string;
  size?: "large" | "small";
  onSpeak: (text: string, language: LanguageCode) => void;
}) {
  const large = size === "large";

  return (
    <button
      type="button"
      onClick={() => onSpeak(text, language)}
      disabled={!text.trim()}
      aria-label={label}
      title={label}
      className={`flex shrink-0 items-center justify-center rounded-full bg-[#f5f2eb] text-black/65 transition-transform active:scale-95 disabled:opacity-30 ${
        large ? "h-10 w-10" : "h-9 w-9"
      }`}
    >
      <Volume2 size={large ? 17 : 15} strokeWidth={1.8} />
    </button>
  );
}

function PronunciationLine({
  label,
  pronunciation,
  loading,
}: {
  label: string;
  pronunciation: string;
  loading: boolean;
}) {
  return (
    <div className="mt-3 flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
      <span className="min-w-[38px] font-semibold tracking-[0.08em] text-black/27">
        {label}
      </span>

      {pronunciation ? (
        <span
          className="text-black/48"
          style={{
            fontFamily:
              '"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif',
          }}
        >
          {pronunciation}
        </span>
      ) : loading ? (
        <span className="inline-flex items-center gap-1.5 text-black/25">
          <LoaderCircle size={11} className="animate-spin" />
          Loading
        </span>
      ) : (
        <span className="text-black/25">Listen with speaker</span>
      )}
    </div>
  );
}

function ExampleSection({
  example,
  onSpeak,
}: {
  example: ExampleBlock;
  onSpeak: (text: string, language: LanguageCode) => void;
}) {
  return (
    <section className="rounded-[22px] bg-[#f8f6f1] px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/30">
          {example.label}
        </p>

        <SpeakerButton
          text={example.text}
          language={example.language}
          label={`Play ${example.label}`}
          size="small"
          onSpeak={onSpeak}
        />
      </div>

      <p
        className={`mt-2 break-words leading-7 tracking-[-0.01em] ${
          example.language === "en-US"
            ? "text-[16px] text-black/82"
            : "text-[15px] text-black/57"
        }`}
      >
        {example.text}
      </p>
    </section>
  );
}

export default function AdaptiveWordCard({
  imageUrl,
  imageAlt = "",
  primary,
  secondary,
  englishExample,
  chineseExample,
  partOfSpeech,
  confidence,
  statusLabel,
  pronunciationLoading = false,
  pronunciationError = "",
  onSpeak,
  onRetryPronunciation,
  headerLabel = "Word",
  actions,
  footer,
}: AdaptiveWordCardProps) {
  return (
    <article className="overflow-hidden rounded-[30px] border border-black/[0.055] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.055)]">
      {imageUrl && (
        <div className="relative aspect-[16/10] overflow-hidden bg-[#ebe7de]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={imageAlt}
            className="h-full w-full object-cover"
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/15 to-transparent" />

          {statusLabel && (
            <span className="absolute bottom-4 left-4 rounded-full border border-white/30 bg-white/82 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-black/55 backdrop-blur-xl">
              {statusLabel}
            </span>
          )}
        </div>
      )}

      <div className="p-5 sm:p-6">
        <header className="flex items-center justify-between gap-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/35">
            {headerLabel}
          </p>

          {confidence && (
            <span className="rounded-full bg-[#f5f2eb] px-3 py-1.5 text-[10px] font-medium capitalize text-black/40">
              {confidence}
            </span>
          )}
        </header>

        <section className="mt-7">
          <div className="flex items-center gap-3">
            <h2 className="min-w-0 break-words text-[40px] font-semibold leading-[0.98] tracking-[-0.05em] sm:text-[46px]">
              {primary.text}
            </h2>

            <SpeakerButton
              text={primary.text}
              language={primary.language}
              label={`Play ${primary.text}`}
              onSpeak={onSpeak}
            />
          </div>

          <PronunciationLine
            label={primary.pronunciationLabel}
            pronunciation={primary.pronunciation}
            loading={pronunciationLoading}
          />
        </section>

        <section className="mt-6">
          <div className="flex items-center gap-3">
            <h3 className="min-w-0 break-words text-[26px] font-medium leading-none tracking-[-0.035em] text-black/72">
              {secondary.text}
            </h3>

            <SpeakerButton
              text={secondary.text}
              language={secondary.language}
              label={`Play ${secondary.text}`}
              size="small"
              onSpeak={onSpeak}
            />
          </div>

          <PronunciationLine
            label={secondary.pronunciationLabel}
            pronunciation={secondary.pronunciation}
            loading={pronunciationLoading}
          />
        </section>

        {(partOfSpeech || pronunciationError) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
            {partOfSpeech && (
              <span className="capitalize text-black/32">{partOfSpeech}</span>
            )}

            {partOfSpeech && pronunciationError && (
              <span className="text-black/15">•</span>
            )}

            {pronunciationError && onRetryPronunciation && (
              <button
                type="button"
                onClick={onRetryPronunciation}
                className="text-black/28 underline decoration-black/15 underline-offset-4 transition-colors hover:text-black/55"
                title={pronunciationError}
              >
                Refresh pronunciation
              </button>
            )}
          </div>
        )}

        {(englishExample?.text || chineseExample?.text) && (
          <div className="mt-7 space-y-3">
            {englishExample?.text && (
              <ExampleSection example={englishExample} onSpeak={onSpeak} />
            )}

            {chineseExample?.text && (
              <ExampleSection example={chineseExample} onSpeak={onSpeak} />
            )}
          </div>
        )}

        {actions && <div className="mt-6">{actions}</div>}

        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </article>
  );
}
