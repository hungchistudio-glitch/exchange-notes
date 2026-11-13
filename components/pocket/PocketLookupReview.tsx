"use client";

import { Mic, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { VoiceCaptureStatus, VoiceMicButton } from "@/components/lexicon/VoiceCapture";
import useTranslation from "@/hooks/i18n/useTranslation";
import useVoiceInput from "@/hooks/useVoiceInput";
import { setInterfaceLanguage, type InterfaceLanguage } from "@/lib/appPreferences";
import { loadTranslations, TRANSLATION_LANGUAGES } from "@/lib/i18n";
import {
  getLanguage,
  getLanguageName,
  INTERFACE_LANGUAGE_CODE,
  type LanguageCode,
} from "@/lib/languages";
import type { LexiconEntry } from "@/lib/lexicon/types";

import PocketLookupView from "./PocketLookupView";
import styles from "./PocketLookup.module.css";

type ReviewView = "widget" | "lookup" | "share";

/**
 * /pocket-lookup-review: Yumi Pocket Lookup signed out, in both modes and
 * five interface languages, against the built-in dictionary
 * (/api/pocket-lookup-review). It saves nothing and spends nothing: no
 * account, no AI. The widget tab is a stand-in for the native widget's
 * layout, not the widget itself.
 */
export default function PocketLookupReview() {
  const { t, language } = useTranslation();
  const [cosmic, setCosmic] = useState(false);
  const [view, setView] = useState<ReviewView>("widget");
  const [pair, setPair] = useState<readonly [LanguageCode, LanguageCode]>(["en", "zh-TW"]);
  const [query, setQuery] = useState("");
  const [entry, setEntry] = useState<LexiconEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const controller = useRef<AbortController | null>(null);
  // Each lookup takes a ticket; an answer for an older ticket is dropped.
  const ticket = useRef(0);
  const languageTicket = useRef(0);

  function invalidate() {
    ticket.current++;
    controller.current?.abort();
    setEntry(null);
    setFailed(false);
    setBusy(false);
  }

  async function lookup(text = query) {
    invalidate();
    if (!text.trim()) return;
    setQuery(text);
    setBusy(true);
    setVoiceOpen(false);
    const current = ticket.current;
    const abort = new AbortController();
    controller.current = abort;
    try {
      const response = await fetch("/api/pocket-lookup-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, source: pair[0], target: pair[1] }),
        signal: abort.signal,
      });
      const data = await response.json();
      if (current !== ticket.current) return;
      setEntry(data.entry ?? null);
      setFailed(!response.ok || !data.entry);
    } catch {
      if (current === ticket.current) setFailed(true);
    } finally {
      if (current === ticket.current) setBusy(false);
    }
  }

  const voice = useVoiceInput({
    lang: getLanguage(pair[0]).speechTag,
    onResult: (text) => void lookup(text),
  });
  const cancel = voice.cancel;

  useEffect(() => {
    const ticketRef = ticket;
    const controllerRef = controller;
    const hide = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      cancel();
      ticketRef.current++;
      controllerRef.current?.abort();
    };
  }, [cancel]);

  function openVoice() {
    setView("lookup");
    setVoiceOpen(true);
    if (voice.supported) voice.toggle();
  }

  async function chooseLanguage(next: InterfaceLanguage) {
    const token = ++languageTicket.current;
    await loadTranslations(next);
    if (token === languageTicket.current) setInterfaceLanguage(next);
  }

  const voicePanel = voiceOpen ? (
    <section className={styles.voice}>
      <h2>{t.pocket.voiceReady}</h2>
      {voice.supported ? (
        <VoiceMicButton
          phase={voice.phase}
          listening={voice.listening}
          levelRef={voice.bindLevel}
          onPress={voice.toggle}
          className={styles.icon}
          idleClassName=""
          activeClassName=""
        />
      ) : (
        <p>{t.pocket.voiceUnavailable}</p>
      )}
      <VoiceCaptureStatus
        phase={voice.phase}
        listening={voice.listening}
        caption={voice.caption}
        notice={voice.notice}
        tone={cosmic ? "cosmic" : "warm"}
      />
    </section>
  ) : undefined;

  return (
    <>
      <nav className={styles.review} aria-label="Preview controls">
        <button type="button" onClick={() => setCosmic(!cosmic)}>
          {cosmic ? "Cosmic" : "Standard"}
        </button>
        {(["widget", "lookup", "share"] as const).map((tab) => (
          <button
            type="button"
            key={tab}
            aria-pressed={view === tab}
            onClick={() => {
              voice.cancel();
              setVoiceOpen(false);
              setView(tab);
            }}
          >
            {tab}
          </button>
        ))}
        <select
          aria-label="Interface language"
          value={language}
          onChange={(event) => void chooseLanguage(event.target.value as InterfaceLanguage)}
        >
          {TRANSLATION_LANGUAGES.map((code) => (
            <option key={code} value={code}>
              {getLanguageName(INTERFACE_LANGUAGE_CODE[code], code)}
            </option>
          ))}
        </select>
      </nav>

      {view === "widget" ? (
        <main className={styles.page} data-cosmic={cosmic}>
          <div className={styles.inner}>
            <p className={styles.notice}>{t.pocket.preview}</p>
            <section className={`${styles.card} ${styles.widgetCard}`}>
              <p className={styles.label}>YUMI · {t.pocket.title}</p>
              <div className={`${styles.search} ${styles.widgetSearch}`}>
                <button type="button" className={styles.widgetOpen} onClick={() => setView("lookup")}>
                  <Search size={20} />
                  {t.pocket.placeholder}
                </button>
                <button
                  type="button"
                  className={styles.icon}
                  aria-label={t.pocket.voice}
                  onClick={openVoice}
                >
                  <Mic size={20} />
                </button>
              </div>
              <p className={`${styles.muted} ${styles.widgetPair}`}>
                {getLanguageName(pair[0], language)} → {getLanguageName(pair[1], language)}
              </p>
            </section>
          </div>
        </main>
      ) : (
        <PocketLookupView
          share={view === "share"}
          cosmic={cosmic}
          pair={pair}
          onPair={(learning, translation) => {
            voice.cancel();
            invalidate();
            setPair([learning, translation]);
          }}
          query={query}
          onQuery={(next) => {
            invalidate();
            setQuery(next);
          }}
          onSubmit={() => {
            voice.cancel();
            void lookup();
          }}
          entry={entry}
          busy={busy}
          failed={failed}
          saved={false}
          saving={false}
          onVoice={openVoice}
          notice={view === "share" ? t.pocket.shareNote : t.pocket.preview}
          voicePanel={voicePanel}
        />
      )}
    </>
  );
}
