"use client";

import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import { getLanguage } from "@/lib/languages";
import { Volume2 } from "lucide-react";

import { formatMessageTime } from "@/lib/messages/format";
import type { SharedNewsCard as SharedNewsCardData } from "@/lib/messages/newsCard";
import { getPhonetics } from "@/lib/pronunciation";
import { speak, type SpeechLanguage } from "@/lib/speech";

/*
 * A Daily News card someone sent into a conversation.
 *
 * Lifted verbatim out of the old single-file thread when Messages split into
 * two pages — the card itself was never the problem, the 1200-line component
 * around it was. The one change is width: with no sidebar competing for the
 * screen it is allowed to be wider than a message bubble, because it is
 * reference material rather than something someone said.
 */

type NewsCardMessageProps = {
  card: SharedNewsCardData;
  createdAt: string;
};

function SpeakerButton({
  text,
  language,
  label,
  size = "md",
}: {
  text: string;
  language: SpeechLanguage;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      onClick={() => speak(text, language)}
      aria-label={label}
      className={`flex shrink-0 items-center justify-center rounded-full border ${
        size === "sm" ? "h-6 w-6" : "h-7 w-7"
      }`}
      style={{
        background: "var(--msg-surface-soft)",
        borderColor: "var(--msg-line)",
        color: "var(--msg-ink-soft)",
      }}
    >
      <Volume2 size={size === "sm" ? 11 : 13} strokeWidth={1.8} />
    </button>
  );
}

export default function NewsCardMessage({ card, createdAt }: NewsCardMessageProps) {
  const { pair } = useDisplayLanguages();
  /*
   * The two languages the reader chose, and only those. A card that cannot
   * lead in the language being learned is filtered out upstream rather than
   * shown in a language nobody asked for.
   */
  const [primaryLanguage, secondaryLanguage] = pair;

  const titlePronunciation = getPhonetics(
    card.titles[secondaryLanguage] ?? "",
    secondaryLanguage,
  );
  const summaryPronunciation = getPhonetics(
    card.summaries[secondaryLanguage] ?? "",
    secondaryLanguage,
  );

  return (
    <article
      className="w-full max-w-[420px] rounded-[22px] border p-4 sm:p-5"
      style={{
        background: "var(--msg-surface)",
        borderColor: "var(--msg-line)",
        color: "var(--msg-ink)",
      }}
    >
      <span
        className="text-[0.625rem] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--msg-ink-faint)" }}
      >
        📰 News
      </span>

      <div className="mt-1.5 flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-[1rem] font-bold leading-[1.3]">
          {(card.titles[primaryLanguage] ?? "")}
        </p>
        <SpeakerButton
          text={(card.titles[primaryLanguage] ?? "")}
          language={getLanguage(primaryLanguage).speechTag}
          label={(card.titles[primaryLanguage] ?? "")}
        />
      </div>

      <div className="mt-1 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className="text-[0.875rem] font-medium leading-[1.5]"
            style={{ color: "var(--msg-ink-soft)" }}
          >
            {(card.titles[secondaryLanguage] ?? "")}
          </p>
          {(titlePronunciation.pinyin || titlePronunciation.zhuyin) && (
            <p
              className="mt-0.5 text-[0.625rem] leading-4"
              style={{ color: "var(--msg-ink-faint)" }}
            >
              {[titlePronunciation.pinyin, titlePronunciation.zhuyin]
                .filter(Boolean)
                .join("  ")}
            </p>
          )}
        </div>
        <SpeakerButton
          text={(card.titles[secondaryLanguage] ?? "")}
          language={getLanguage(secondaryLanguage).speechTag}
          label={(card.titles[secondaryLanguage] ?? "")}
        />
      </div>

      <div
        className="mt-3 space-y-2 border-t pt-3"
        style={{ borderColor: "var(--msg-line)" }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 text-xs leading-5">
            {(card.summaries[primaryLanguage] ?? "")}
          </p>
          <SpeakerButton
            text={(card.summaries[primaryLanguage] ?? "")}
            language={getLanguage(primaryLanguage).speechTag}
            label={(card.summaries[primaryLanguage] ?? "")}
          />
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p
              className="text-xs leading-5"
              style={{ color: "var(--msg-ink-soft)" }}
            >
              {(card.summaries[secondaryLanguage] ?? "")}
            </p>
            {(summaryPronunciation.pinyin || summaryPronunciation.zhuyin) && (
              <p
                className="mt-0.5 text-[0.625rem] leading-4"
                style={{ color: "var(--msg-ink-faint)" }}
              >
                {[summaryPronunciation.pinyin, summaryPronunciation.zhuyin]
                  .filter(Boolean)
                  .join("  ")}
              </p>
            )}
          </div>
          <SpeakerButton
            text={(card.summaries[secondaryLanguage] ?? "")}
            language={getLanguage(secondaryLanguage).speechTag}
            label={(card.summaries[secondaryLanguage] ?? "")}
          />
        </div>
      </div>

      {card.vocabulary.length > 0 && (
        <div
          className="mt-3 border-t pt-3"
          style={{ borderColor: "var(--msg-line)" }}
        >
          <span
            className="text-[0.625rem] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--msg-ink-faint)" }}
          >
            Vocabulary / 學習單字
          </span>

          {/*
            Two columns where there is room for two. The wider conversation
            page is the whole point of the redesign, and a word and its
            translation no longer have to be stacked in a 120px column.
          */}
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {card.vocabulary.map((item, index) => {
              /*
               * The annotation belongs to the side it describes. Asking for
               * the translation's own language means pinyin and zhuyin turn
               * up under Chinese and nowhere else, rather than under
               * whichever field happened to be called "chinese".
               */
              const wordPronunciation = getPhonetics(
                (item.texts[secondaryLanguage] ?? ""),
                secondaryLanguage,
              );

              return (
                <div
                  key={`${(item.texts[primaryLanguage] ?? "")}-${index}`}
                  className="rounded-xl p-2.5"
                  style={{ background: "var(--msg-surface-soft)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-xs font-semibold">
                      {(item.texts[primaryLanguage] ?? "")}
                    </p>
                    <SpeakerButton
                      text={(item.texts[primaryLanguage] ?? "")}
                      language={getLanguage(primaryLanguage).speechTag}
                      label={(item.texts[primaryLanguage] ?? "")}
                      size="sm"
                    />
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className="truncate text-xs"
                        style={{ color: "var(--msg-ink-soft)" }}
                      >
                        {(item.texts[secondaryLanguage] ?? "")}
                      </p>
                      {(wordPronunciation.pinyin ||
                        wordPronunciation.zhuyin) && (
                        <p
                          className="text-[0.625rem]"
                          style={{ color: "var(--msg-ink-faint)" }}
                        >
                          {[wordPronunciation.pinyin, wordPronunciation.zhuyin]
                            .filter(Boolean)
                            .join("  ")}
                        </p>
                      )}
                    </div>
                    <SpeakerButton
                      text={(item.texts[secondaryLanguage] ?? "")}
                      language={getLanguage(secondaryLanguage).speechTag}
                      label={(item.texts[secondaryLanguage] ?? "")}
                      size="sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div
        className="mt-3 flex items-center justify-between gap-2 border-t pt-2.5"
        style={{ borderColor: "var(--msg-line)" }}
      >
        {card.sourceUrl ? (
          <a
            href={card.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 truncate text-[0.625rem] underline"
            style={{ color: "var(--msg-ink-faint)" }}
          >
            {card.sourceName || card.sourceUrl}
          </a>
        ) : (
          <span
            className="min-w-0 truncate text-[0.625rem]"
            style={{ color: "var(--msg-ink-faint)" }}
          >
            {card.sourceName}
          </span>
        )}
        <time
          dateTime={createdAt}
          className="shrink-0 text-[0.625rem]"
          style={{ color: "var(--msg-ink-faint)" }}
        >
          {formatMessageTime(createdAt)}
        </time>
      </div>
    </article>
  );
}
