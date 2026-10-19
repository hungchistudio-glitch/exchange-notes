"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import LabScreen from "@/components/pronunciation/lab/LabScreen";
import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import { useVocabulary } from "@/contexts/VocabularyContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import useLexiconSearch from "@/hooks/lexicon/useLexiconSearch";
import type { HelloSenseKnown } from "@/lib/ai/prompts/helloSense";
import { knownFromLookup } from "@/lib/hello/draft";
import { defaultPair, isValidPair } from "@/lib/hello/pairs";
import { captureYumiPoster } from "@/lib/hello/poster";
import type { HelloPair, HelloSense, HelloSnapshot } from "@/lib/hello/types";
import { LANGUAGE_CODES, getLanguageName, isLanguageCode, type LanguageCode } from "@/lib/languages";
import type { LexiconEntry } from "@/lib/lexicon/types";
import { useWornOutfit } from "@/lib/shop/wornOutfit";
import { createClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/supabase/sessionUser";
import type { VocabularyItem } from "@/lib/types/app";

import HelloInvitation from "./HelloInvitation";
import HelloShareSheet from "./HelloShareSheet";
import { LanguagePicker } from "./HelloCard";

/* =========================================================
   Making a hello (/invitations/new)

   In the order the brief sets (Chi's hello brief, §5): a word, from the
   reader's own or looked up new; two languages; a preview of exactly what
   will be public; then, and only then, the hello is made. Its link, picture
   and QR follow.

   Looking a word up here does not save it — no word count, no energy
   cookie. The two languages start as what the reader is learning and their
   own; if that is not two different languages, the editor asks rather than
   guessing a mother tongue.
   ========================================================= */

type Chosen = { key: string; label: string; known: HelloSenseKnown[] };

function fromSaved(item: VocabularyItem): Chosen {
  const texts = (item.texts ?? {}) as Partial<Record<LanguageCode, string>>;
  const known: HelloSenseKnown[] = LANGUAGE_CODES.flatMap((language) => {
    const text = texts[language]?.trim();
    return text ? [{ language, text, partOfSpeech: item.part_of_speech }] : [];
  });
  if (!known.length) {
    known.push({ language: item.word_language, text: item.word, partOfSpeech: item.part_of_speech });
    if (item.translation && item.translation_language !== item.word_language) {
      known.push({ language: item.translation_language, text: item.translation, partOfSpeech: item.part_of_speech });
    }
  }
  return { key: `saved:${item.id}`, label: item.word, known };
}

function fromLookup(entry: LexiconEntry | null | undefined): Chosen | null {
  const known = knownFromLookup(entry);
  return entry && known ? { key: `lookup:${known[0].language}:${entry.term}`, label: entry.term, known } : null;
}

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

type Created = { hello: HelloSnapshot; url: string; test: boolean; poster: Blob | null };

type Slots = [LanguageCode | null, LanguageCode | null];

/**
 * The pair the editor starts on, from the profile as it is stored — not
 * from LearningLanguageContext, which fills in a missing or repeated native
 * language with a stand-in so the rest of the app always has two. A hello
 * is public: if the profile does not say two different languages, the
 * learning one (if any) is filled in and the other is left for the reader.
 */
function startingSlots(learning: unknown, native: unknown): Slots {
  const learningCode = isLanguageCode(learning) ? learning : null;
  const nativeCode = isLanguageCode(native) ? native : null;
  const preferred = defaultPair(learningCode, nativeCode);
  return preferred ? [preferred[0], preferred[1]] : [learningCode, null];
}

export default function HelloEditor({
  wordId,
  draft,
  profile,
}: {
  wordId?: string;
  draft?: HelloSenseKnown[];
  /** The reader's stored languages, when the caller already has them (the review screen). */
  profile?: { learning: LanguageCode | null; native: LanguageCode | null };
}) {
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.hello;
  const { items } = useVocabulary();
  const { interfaceMode } = useInterfaceMode();
  const outfit = useWornOutfit();
  const search = useLexiconSearch({ items });
  const nameOf = (code: LanguageCode) => getLanguageName(code, interfaceLanguage);

  const [source, setSource] = useState<"saved" | "lookup">(draft?.length ? "lookup" : "saved");
  const [savedId, setSavedId] = useState<string | null>(wordId ?? null);
  const [filter, setFilter] = useState("");
  /* The profile's pair until the reader picks; null while it is read. */
  const [stored, setStored] = useState<Slots | null>(() =>
    profile ? startingSlots(profile.learning, profile.native) : null,
  );
  const [picked, setPicked] = useState<Slots | null>(null);
  const pair: Slots = picked ?? stored ?? [null, null];
  const [slotA, slotB] = pair;
  const [me, setMe] = useState<{ name: string | null; exchangeId: string } | null>(null);
  const [phase, setPhase] = useState<"editing" | "creating" | "failed" | "limit">("editing");
  const [created, setCreated] = useState<Created | null>(null);
  /* One key per word chosen: pressing create twice makes one hello. */
  const requestKey = useRef(newKey());

  /*
   * The word, derived rather than stored: the saved word picked (or the one
   * the page was opened for), or the lookup's answer once it has a meaning
   * to share — before any lookup here, the word handed over from a lookup
   * elsewhere (app/(protected)/invitations/new).
   */
  const savedChosen = useMemo(() => {
    const item = savedId ? items.find((candidate) => candidate.id === savedId) : undefined;
    return item ? fromSaved(item) : null;
  }, [items, savedId]);
  const lookupChosen = search.status === "ready" ? fromLookup(search.result?.entry) : null;
  const draftChosen = useMemo<Chosen | null>(
    () => (draft?.length ? { key: `draft:${draft[0].language}:${draft[0].text}`, label: draft[0].text, known: draft } : null),
    [draft],
  );
  const chosen = source === "saved" ? savedChosen : (lookupChosen ?? (search.status === "idle" ? draftChosen : null));

  useEffect(() => {
    requestKey.current = newKey();
  }, [chosen?.key, slotA, slotB, interfaceMode]);

  /* Who is sending (for the preview) and the languages they stored. */
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void (async () => {
      const user = await getSessionUser(supabase);
      if (!user) {
        if (!cancelled) setStored((current) => current ?? [null, null]);
        return;
      }
      const [{ data: name }, { data: languages }] = await Promise.all([
        supabase.from("public_profiles").select("display_name, exchange_id").eq("id", user.id).maybeSingle(),
        profile
          ? Promise.resolve({ data: null })
          : supabase.from("profiles").select("learning_language, native_language").eq("id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      if (name?.exchange_id) setMe({ name: name.display_name?.trim() || null, exchangeId: name.exchange_id });
      const row = languages as { learning_language?: unknown; native_language?: unknown } | null;
      setStored((current) => current ?? startingSlots(row?.learning_language, row?.native_language));
    })();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const savedList = useMemo(() => {
    const needle = filter.trim().toLocaleLowerCase();
    return items
      .filter((item) => !needle || item.word.toLocaleLowerCase().includes(needle) || item.translation?.toLocaleLowerCase().includes(needle))
      .slice(0, 40);
  }, [filter, items]);

  const validPair = isValidPair(pair) ? (pair as unknown as HelloPair) : null;

  const preview: HelloSnapshot | null =
    chosen && validPair
      ? {
          id: "preview00000",
          version: 1,
          createdAt: new Date(0).toISOString(),
          sender: me ?? { name: null, exchangeId: "…" },
          yumi: { outfit, mode: interfaceMode, posterUrl: null, complete: true },
          pair: validPair,
          source: chosen.known[0].language,
          sense: Object.fromEntries(
            chosen.known.map((side) => [side.language, { text: side.text, partOfSpeech: side.partOfSpeech ?? undefined }]),
          ) as HelloSense,
        }
      : null;

  const create = async () => {
    if (!chosen || !validPair || phase === "creating") return;
    setPhase("creating");
    try {
      const response = await fetch("/api/hello", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestKey: requestKey.current, mode: interfaceMode, pair: validPair, known: chosen.known }),
      });
      if (response.status === 429) {
        setPhase("limit");
        return;
      }
      if (!response.ok) throw new Error(String(response.status));
      const { url, test, hello } = (await response.json()) as { url: string; test: boolean; hello: HelloSnapshot | null };
      if (!hello) throw new Error("No hello");

      /* Her picture, in the outfit the server saved with the hello. */
      const poster = await captureYumiPoster(hello.yumi.outfit, hello.yumi.mode);
      let posterUrl = hello.yumi.posterUrl;
      if (poster) {
        const upload = await fetch(`/api/hello/${encodeURIComponent(hello.id)}/poster`, {
          method: "POST",
          headers: { "content-type": "image/png" },
          body: poster,
        }).catch(() => null);
        if (upload?.ok) posterUrl = ((await upload.json()) as { posterUrl?: string }).posterUrl ?? posterUrl;
      }
      setCreated({ hello: { ...hello, yumi: { ...hello.yumi, posterUrl } }, url, test, poster });
      setPhase("editing");
    } catch {
      setPhase("failed");
    }
  };

  if (created) {
    return (
      <LabScreen title={copy.editorTitle} backHref="/invitations" backLabel={copy.manageTitle}>
        <div className="space-y-5 pb-8">
          <HelloShareSheet hello={created.hello} url={created.url} test={created.test} poster={created.poster} />
          <HelloInvitation hello={created.hello} embedded />
        </div>
      </LabScreen>
    );
  }

  const tab = (value: "saved" | "lookup", label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={source === value}
      onClick={() => setSource(value)}
      className={`min-h-[44px] flex-1 rounded-full text-[0.875rem] font-semibold ${
        source === value ? "bg-black text-white" : "text-ink-soft"
      }`}
    >
      {label}
    </button>
  );

  return (
    <LabScreen title={copy.editorTitle} subtitle={copy.editorIntro} backHref="/invitations" backLabel={copy.manageTitle}>
      <div className="space-y-6 pb-8">
        <section aria-labelledby="hello-step-word" className="space-y-3">
          <h2 id="hello-step-word" className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            1 · {copy.stepWord}
          </h2>
          <div role="tablist" className="flex gap-1 rounded-full bg-black/[0.04] p-1">
            {tab("saved", copy.sourceSaved)}
            {tab("lookup", copy.sourceLookup)}
          </div>

          {source === "saved" ? (
            <div className="space-y-2">
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder={copy.searchSaved}
                className="min-h-[44px] w-full rounded-2xl border border-black/[0.08] bg-white px-4 text-[0.9375rem]"
              />
              {items.length === 0 ? (
                <p className="text-[0.875rem] text-ink-soft">{copy.noSaved}</p>
              ) : (
                <ul className="max-h-72 space-y-1 overflow-y-auto rounded-2xl border border-black/[0.06] bg-white p-1">
                  {savedList.map((item) => {
                    const selected = chosen?.key === `saved:${item.id}`;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setSavedId(item.id)}
                          className={`flex min-h-[44px] w-full items-baseline justify-between gap-3 rounded-xl px-3 text-left ${
                            selected ? "bg-black text-white" : "hover:bg-black/[0.03]"
                          }`}
                        >
                          <span className="font-cjk truncate text-[0.9375rem] font-semibold">{item.word}</span>
                          <span className={`font-cjk truncate text-[0.8125rem] ${selected ? "text-white/75" : "text-ink-faint"}`}>
                            {item.translation}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (search.query.trim()) search.submit(search.query, "type");
              }}
            >
              <div className="flex gap-2">
                <input
                  value={search.query}
                  onChange={(event) => search.setQuery(event.target.value)}
                  placeholder={copy.lookupPlaceholder}
                  className="min-h-[44px] min-w-0 flex-1 rounded-2xl border border-black/[0.08] bg-white px-4 text-[0.9375rem]"
                />
                <button
                  type="submit"
                  disabled={!search.query.trim() || search.status === "searching"}
                  className="min-h-[44px] rounded-full bg-black px-5 text-[0.875rem] font-semibold text-white disabled:opacity-40"
                >
                  {search.status === "searching" ? copy.lookingUp : copy.lookupButton}
                </button>
              </div>
              <p className="text-[0.75rem] text-ink-faint">{copy.notSaved}</p>
              {search.status === "error" || (search.status === "ready" && !fromLookup(search.result?.entry)) ? (
                <p role="status" className="text-[0.875rem] text-ink-soft">
                  {copy.lookupFailed}
                </p>
              ) : null}
            </form>
          )}

          {chosen ? (
            <p className="font-cjk rounded-2xl bg-black/[0.04] px-4 py-3 text-[0.9375rem]">
              {chosen.known.map((side) => side.text).join(" · ")}
            </p>
          ) : (
            <p className="text-[0.8125rem] text-ink-faint">{copy.chooseWord}</p>
          )}
        </section>

        <section aria-labelledby="hello-step-languages" className="space-y-3">
          <h2 id="hello-step-languages" className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            2 · {copy.stepLanguages}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {([0, 1] as const).map((slot) => {
              const value = pair[slot];
              const other = pair[slot === 0 ? 1 : 0];
              return (
                <LanguagePicker
                  key={slot}
                  label={slot === 0 ? copy.languageA : copy.languageB}
                  value={value}
                  placeholder="—"
                  /* The other slot's language cannot be chosen here too. */
                  choices={LANGUAGE_CODES.map((language) => ({ language, disabled: language === other }))}
                  nameOf={nameOf}
                  onChange={(language) => setPicked(slot === 0 ? [language, pair[1]] : [pair[0], language])}
                />
              );
            })}
          </div>
          {!validPair ? <p className="text-[0.8125rem] text-ink-soft">{copy.pickBoth}</p> : null}
          <p className="text-[0.75rem] text-ink-faint">{copy.fillOnCreate}</p>
        </section>

        <section aria-labelledby="hello-step-preview" className="space-y-3">
          <h2 id="hello-step-preview" className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            3 · {copy.stepPreview}
          </h2>
          <p className="text-[0.8125rem] leading-5 text-ink-soft">{copy.publicFields}</p>
          {preview ? (
            <HelloInvitation
              key={`${chosen?.key}-${validPair?.join("-")}`}
              hello={preview}
              embedded
              missingNote={copy.fillOnCreate}
              banner={<p className="mb-2 text-[0.75rem] font-semibold text-ink-faint">{copy.previewBadge}</p>}
            />
          ) : null}
        </section>

        <button
          type="button"
          onClick={() => void create()}
          disabled={!chosen || !validPair || phase === "creating"}
          className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-black text-[0.9375rem] font-semibold text-white disabled:opacity-40"
        >
          {phase === "creating" ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : null}
          {phase === "creating" ? copy.creating : copy.create}
        </button>
        {phase === "failed" || phase === "limit" ? (
          <p role="status" className="text-center text-[0.875rem] text-ink-soft">
            {phase === "limit" ? copy.createLimit : copy.createFailed}
          </p>
        ) : null}
      </div>
    </LabScreen>
  );
}
