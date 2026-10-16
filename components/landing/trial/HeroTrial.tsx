"use client";

import {
  ArrowRight,
  Bookmark,
  Check,
  Copy,
  RotateCcw,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";

import type { InterfaceLanguage } from "@/lib/appPreferences";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { trialPhraseFor } from "@/lib/landing/trialPhrases";
import {
  INTERFACE_LANGUAGE_CODE,
  LANGUAGE_CODES,
  getInterfaceLanguageMeta,
  getLanguage,
  getLanguageBySpeechTag,
  getLanguageName,
  type LanguageCode,
  type SpeechTag,
} from "@/lib/languages";
import {
  ListenButton as SharedListenButton,
  speechTagFor,
  useHydrated,
  useSpeaker,
  type Speaker,
} from "@/components/landing/listen";
import {
  getDefaultSpeechSettings,
  getInitialVoicesVersion,
  getSpeechSettings,
  getVoicesVersion,
  listClearVoicesForLanguage,
  setSpeechSettings,
  speechSupported,
  stopSpeech,
  subscribeToSpeechSettings,
  subscribeToVoices,
} from "@/lib/speech";

import styles from "./HeroTrial.module.css";

/* =========================================================
   The hero's trial: the app's four steps, done for real on one phrase

   Chi (2026-10-15): every interaction in the hero has to mean something and
   be a real try of the app; what does not, goes. So nothing here is a
   picture of a feature:

   - Keep writes a card, with the reader's own where and why, into a
     notebook that stays on screen, and that the other steps use.
   - Understand reads it aloud in a voice the reader picks from the ones
     their device has (the same setting the app uses after sign-in), at a
     natural or slow speed, and shows the idea in all five languages, with
     a language picker of its own.
   - Exchange builds the card a friend would get and copies or shares it,
     and lets the reader keep the friend's word too.
   - Review runs the app's loop on the notebook: recall, listen, reveal,
     again or got it, and says honestly what the app's scheduler would do.

   Every word of interface is in the language picked at the top of the
   page. Only the phrase and its five renderings are not interface.
   ========================================================= */

type HeroCopy = TranslationDictionary["landing"]["hero"];
type TrialCopy = HeroCopy["trial"];

const STEPS = ["keep", "understand", "exchange", "review"] as const;
type StepId = (typeof STEPS)[number];

type Kept = {
  id: "phrase" | "word";
  text: string;
  lang: string;
  speech: SpeechTag | null;
  reading?: string;
  meaning: string;
  equivalent?: string;
  where?: string;
  why?: string;
};

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );

// ------------------------------------------------------------- listening

/** A region, named in the reader's language: "Taiwan", "台灣". */
function regionName(voiceLang: string, locale: string) {
  const region = voiceLang.split(/[-_]/).find(part => /^[A-Z]{2}$/.test(part));
  if (!region) return null;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(region) ?? null;
  } catch {
    return null;
  }
}

function ListenButton({
  id,
  text,
  speech,
  speaker,
  copy,
  label,
}: {
  id: string;
  text: string;
  speech: SpeechTag;
  speaker: Speaker;
  copy: TrialCopy["listen"];
  label?: string;
}) {
  return (
    <SharedListenButton
      id={id}
      text={text}
      speech={speech}
      speaker={speaker}
      play={copy.play}
      playing={copy.playing}
      label={label}
      className={styles.listen}
    />
  );
}

/**
 * Listen, with the device's own voices for that language and a speed.
 *
 * The voice is the app's setting (lib/speech), not a copy of it: picked
 * here, it is the voice the reader hears after signing in on this device.
 */
function VoiceControls({
  id,
  text,
  speech,
  speaker,
  copy,
  language,
}: {
  id: string;
  text: string;
  speech: SpeechTag;
  speaker: Speaker;
  copy: TrialCopy["listen"];
  language: InterfaceLanguage;
}) {
  const hydrated = useHydrated();
  const settings = useSyncExternalStore(
    subscribeToSpeechSettings,
    getSpeechSettings,
    getDefaultSpeechSettings,
  );
  const voicesVersion = useSyncExternalStore(
    subscribeToVoices,
    getVoicesVersion,
    getInitialVoicesVersion,
  );
  const selectId = useId();
  const locale = getInterfaceLanguageMeta(language).htmlLang;

  const supported = hydrated && speechSupported();
  const voices = useMemo(
    () => (supported ? listClearVoicesForLanguage(speech) : []),
    // voicesVersion is the trigger: voices arrive after the page does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supported, speech, voicesVersion],
  );
  const anyVoices = supported && window.speechSynthesis.getVoices().length > 0;
  const chosen = settings.voiceURIs[speech] ?? "";
  const languageName = getLanguageName(getLanguageBySpeechTag(speech).code, language);

  function choose(uri: string) {
    const voiceURIs = { ...settings.voiceURIs };
    if (uri) voiceURIs[speech] = uri;
    else delete voiceURIs[speech];
    setSpeechSettings({ ...settings, voiceURIs });
  }

  if (hydrated && !supported) {
    return <p className={styles.listenNote}>{copy.unsupported}</p>;
  }

  return (
    <div className={styles.voice}>
      <ListenButton id={id} text={text} speech={speech} speaker={speaker} copy={copy} />

      <label className={styles.voicePicker} htmlFor={selectId}>
        <span>{copy.voice}</span>
        <select
          id={selectId}
          value={voices.some(voice => voice.voiceURI === chosen) ? chosen : ""}
          onChange={event => choose(event.target.value)}
          disabled={!voices.length}
        >
          <option value="">{copy.automatic}</option>
          {voices.map(voice => {
            const region = regionName(voice.lang, locale);
            return (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {region ? `${voice.name} · ${region}` : voice.name}
              </option>
            );
          })}
        </select>
      </label>

      <div className={styles.speed} role="group" aria-label={copy.speed}>
        {(["natural", "slow"] as const).map(rate => (
          <button
            key={rate}
            type="button"
            aria-pressed={speaker.rate === rate}
            onClick={() => speaker.setRate(rate)}
          >
            {copy[rate]}
          </button>
        ))}
      </div>

      {anyVoices && !voices.length ? (
        <p className={styles.listenNote}>{fill(copy.noVoice, { language: languageName })}</p>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------- the trial

export default function HeroTrial({
  copy,
  language,
}: {
  copy: HeroCopy;
  language: InterfaceLanguage;
}) {
  const { tour, trial, journey } = copy;
  const phrase = trialPhraseFor(journey.phraseLang);
  const replySpeech = speechTagFor(journey.exchange.replyLang);
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const speaker = useSpeaker();
  const hydrated = useHydrated();

  const [step, setStep] = useState<StepId>("keep");
  // Null until the reader edits it, so a change of language still reads.
  const [whereDraft, setWhere] = useState<string | null>(null);
  const [whyDraft, setWhy] = useState<string | null>(null);
  const [notebook, setNotebook] = useState<Kept[]>([]);
  const [compare, setCompare] = useState<LanguageCode>(INTERFACE_LANGUAGE_CODE[language]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [pending, setPending] = useState<Array<Kept["id"]>>([]);
  const [phase, setPhase] = useState<"recall" | "answer" | "again" | "gotIt">("recall");

  const where = whereDraft ?? journey.keep.where;
  const why = whyDraft ?? journey.keep.why;
  const keptPhrase = notebook.find(item => item.id === "phrase");
  const keptWord = notebook.find(item => item.id === "word");
  const edited = !!keptPhrase && (keptPhrase.where !== where || keptPhrase.why !== why);

  const titles: Record<StepId, { title: string; description: string }> = {
    keep: { title: tour.keepTitle, description: tour.keepDescription },
    understand: { title: tour.understandTitle, description: tour.understandDescription },
    exchange: { title: tour.exchangeTitle, description: tour.exchangeDescription },
    review: { title: tour.reviewTitle, description: tour.reviewDescription },
  };

  const phraseCard = (): Kept => ({
    id: "phrase",
    text: journey.phrase,
    lang: journey.phraseLang,
    speech: phrase.speech,
    reading: journey.reading,
    meaning: journey.understand.meaning,
    equivalent: journey.understand.equivalent,
    where,
    why,
  });

  function keepPhrase() {
    const card = phraseCard();
    setNotebook(current => [card, ...current.filter(item => item.id !== "phrase")]);
  }

  function keepWord() {
    const { replyWord, replyLang, replyMeaning, reply } = journey.exchange;
    setNotebook(current => [
      ...current.filter(item => item.id !== "word"),
      { id: "word", text: replyWord, lang: replyLang, speech: replySpeech, meaning: replyMeaning, why: reply },
    ]);
  }

  function remove(id: Kept["id"]) {
    setNotebook(current => current.filter(item => item.id !== id));
    setPending(current => current.filter(item => item !== id));
  }

  function startReview(ids: Array<Kept["id"]>) {
    setPending(ids);
    setPhase("recall");
  }

  function go(next: StepId, focus = false) {
    setStep(next);
    stopSpeech();
    if (next === "review") startReview(notebook.map(item => item.id));
    if (focus) tabRefs.current[STEPS.indexOf(next)]?.focus();
  }

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    const index = STEPS.indexOf(step);
    const move: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: STEPS.length - 1,
    };
    if (!(event.key in move)) return;
    event.preventDefault();
    go(STEPS[(move[event.key] + STEPS.length) % STEPS.length], true);
  }

  // ------------------------------------------------------------ exchange

  const card = keptPhrase ?? phraseCard();
  const cardText = [
    `${journey.phrase} (${journey.reading})`,
    `${journey.keep.whyLabel}: ${card.why}`,
    `— ${card.where}`,
    "",
    trial.exchange.cardFooter,
  ].join("\n");

  const copyTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  async function copyCard() {
    window.clearTimeout(copyTimer.current);
    try {
      await navigator.clipboard.writeText(`${cardText} · ${window.location.origin}`);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    copyTimer.current = window.setTimeout(() => setCopyState("idle"), 2400);
  }

  const canShare = hydrated && typeof navigator.share === "function";
  async function shareCard() {
    try {
      await navigator.share({ title: journey.phrase, text: cardText, url: window.location.origin });
    } catch {
      // Closing the share sheet is not an error worth showing.
    }
  }

  // ------------------------------------------------------------ review

  const queue = pending.filter(id => notebook.some(item => item.id === id));
  const current = notebook.find(item => item.id === queue[0]) ?? null;
  const reviewedAll = step === "review" && notebook.length > 0 && !queue.length;

  function grade(result: "again" | "gotIt") {
    setPhase(result);
  }

  function nextCard() {
    setPending(list => {
      const [head, ...rest] = list.filter(id => notebook.some(item => item.id === id));
      // "Again" brings it back at the end of this sitting, as the app would
      // bring it back sooner.
      return phase === "again" && head ? [...rest, head] : rest;
    });
    setPhase("recall");
  }

  const listen = trial.listen;
  const stepIndex = STEPS.indexOf(step);
  const nextStep = STEPS[stepIndex + 1];

  return (
    <section className={styles.trial} aria-labelledby={`${baseId}-title`}>
      <header className={styles.top}>
        <h2 id={`${baseId}-title`}>{trial.title}</h2>
        <p>{trial.hint}</p>
      </header>

      <div className={styles.tabs} role="tablist" aria-label={trial.stepsLabel}>
        {STEPS.map((id, index) => (
          <button
            key={id}
            ref={element => { tabRefs.current[index] = element; }}
            id={`${baseId}-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={step === id}
            aria-controls={`${baseId}-panel`}
            tabIndex={step === id ? 0 : -1}
            onClick={() => go(id)}
            onKeyDown={onTabKey}
          >
            <span aria-hidden="true">{index + 1}</span>
            {trial.tabs[id]}
          </button>
        ))}
      </div>

      <div
        id={`${baseId}-panel`}
        className={styles.panel}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${step}`}
      >
        <div className={styles.panelHead}>
          <h3>{titles[step].title}</h3>
          <p>{titles[step].description}</p>
        </div>

        {step === "keep" ? (
          <div className={styles.keep}>
            <p className={styles.phrase}>
              <strong lang={journey.phraseLang}>{journey.phrase}</strong>
              <span lang={journey.phraseLang}>{journey.reading}</span>
            </p>
            <label className={styles.field}>
              <span>{trial.keep.whereLabel}</span>
              <input value={where} onChange={event => setWhere(event.target.value)} maxLength={80} />
            </label>
            <label className={styles.field}>
              <span>{journey.keep.whyLabel}</span>
              <textarea value={why} onChange={event => setWhy(event.target.value)} rows={2} maxLength={160} />
            </label>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primary}
                onClick={keepPhrase}
                disabled={!!keptPhrase && !edited}
              >
                {keptPhrase && !edited ? (
                  <Check size={16} aria-hidden="true" />
                ) : (
                  <Bookmark size={16} aria-hidden="true" />
                )}
                {!keptPhrase ? trial.keep.save : edited ? trial.keep.update : trial.keep.saved}
              </button>
            </div>
          </div>
        ) : null}

        {step === "understand" ? (
          <div className={styles.understand}>
            <div className={styles.readingHead}>
              <p className={styles.phraseSmall}>
                <strong lang={journey.phraseLang}>{journey.phrase}</strong>
                <span lang={journey.phraseLang}>{journey.reading}</span>
              </p>
              <VoiceControls
                id="phrase"
                text={journey.phrase}
                speech={phrase.speech}
                speaker={speaker}
                copy={listen}
                language={language}
              />
            </div>

            <dl className={styles.reading}>
              <p className={styles.yumiLabel}>
                <Sparkles size={13} aria-hidden="true" /> {journey.understand.label}
              </p>
              <div>
                <dt>{journey.understand.meaningLabel}</dt>
                <dd>{journey.understand.meaning}</dd>
              </div>
              <div>
                <dt>{journey.understand.toneLabel}</dt>
                <dd>{journey.understand.tone}</dd>
              </div>
              <div>
                <dt>{journey.understand.cultureLabel}</dt>
                <dd>{journey.understand.culture}</dd>
              </div>
            </dl>

            <div className={styles.compare}>
              <p className={styles.compareTitle}>{trial.compare.title}</p>
              <div className={styles.compareLanguages} role="group" aria-label={trial.compare.label}>
                {LANGUAGE_CODES.map(code => (
                  <button
                    key={code}
                    type="button"
                    lang={getLanguage(code).htmlLang}
                    aria-pressed={compare === code}
                    onClick={() => setCompare(code)}
                  >
                    {getLanguage(code).endonym}
                  </button>
                ))}
              </div>
              <div className={styles.rendering} lang={getLanguage(compare).htmlLang}>
                <strong>{phrase.renderings[compare].text}</strong>
                <p>{phrase.renderings[compare].note}</p>
                <ListenButton
                  id={`compare-${compare}`}
                  text={phrase.renderings[compare].text}
                  speech={getLanguage(compare).speechTag}
                  speaker={speaker}
                  copy={listen}
                  label={`${listen.play}: ${phrase.renderings[compare].text}`}
                />
              </div>
            </div>
          </div>
        ) : null}

        {step === "exchange" ? (
          <div className={styles.exchange}>
            <figure className={styles.card}>
              <figcaption>{trial.exchange.cardLabel}</figcaption>
              <div className={styles.cardFace}>
                <p className={styles.phraseSmall}>
                  <strong lang={journey.phraseLang}>{journey.phrase}</strong>
                  <span lang={journey.phraseLang}>{journey.reading}</span>
                </p>
                <p className={styles.cardWhy}>“{card.why}”</p>
                <p className={styles.cardWhere}>— {card.where}</p>
                <p className={styles.cardFooter}>{trial.exchange.cardFooter}</p>
              </div>
              <div className={styles.actions}>
                <button type="button" className={styles.primary} onClick={copyCard}>
                  {copyState === "copied" ? (
                    <Check size={16} aria-hidden="true" />
                  ) : (
                    <Copy size={16} aria-hidden="true" />
                  )}
                  {copyState === "copied" ? trial.exchange.copied : trial.exchange.copy}
                </button>
                {canShare ? (
                  <button type="button" className={styles.secondary} onClick={shareCard}>
                    <Share2 size={16} aria-hidden="true" />
                    {trial.exchange.share}
                  </button>
                ) : null}
              </div>
              <p className={styles.status} role="status">
                {copyState === "failed" ? trial.exchange.copyFailed : ""}
              </p>
            </figure>

            <div className={styles.reply}>
              <p className={styles.replyTitle}>{trial.exchange.replyTitle}</p>
              <p className={styles.friend}>
                <span aria-hidden="true">{journey.exchange.friend.charAt(0)}</span>
                {journey.exchange.friend}
              </p>
              <blockquote>
                <ReplyWithWord exchange={journey.exchange} />
              </blockquote>
              <p className={styles.insight}>
                <Sparkles size={13} aria-hidden="true" /> {journey.exchange.insight}
                {" · "}
                <span lang={journey.exchange.replyLang}>{journey.exchange.replyWord}</span>
                {": "}
                {journey.exchange.replyMeaning}
              </p>
              <div className={styles.actions}>
                {replySpeech ? (
                  <ListenButton
                    id="reply"
                    text={journey.exchange.replyWord}
                    speech={replySpeech}
                    speaker={speaker}
                    copy={listen}
                    label={`${listen.play}: ${journey.exchange.replyWord}`}
                  />
                ) : null}
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={keepWord}
                  disabled={!!keptWord}
                >
                  {keptWord ? <Check size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}
                  {fill(keptWord ? trial.exchange.keptWord : trial.exchange.keepWord, {
                    word: journey.exchange.replyWord,
                  })}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === "review" ? (
          <div className={styles.review}>
            {!notebook.length ? (
              <div className={styles.reviewEmpty}>
                <p>{trial.review.empty}</p>
                <button
                  type="button"
                  className={styles.primary}
                  onClick={() => {
                    keepPhrase();
                    startReview(["phrase"]);
                  }}
                >
                  <Bookmark size={16} aria-hidden="true" />
                  {trial.review.keepAndReview}
                </button>
              </div>
            ) : reviewedAll || !current ? (
              <div className={styles.reviewEmpty}>
                <p>
                  <Check size={16} aria-hidden="true" /> {trial.review.done}
                </p>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => startReview(notebook.map(item => item.id))}
                >
                  <RotateCcw size={16} aria-hidden="true" />
                  {trial.review.restart}
                </button>
              </div>
            ) : (
              <div className={styles.flashcard} data-phase={phase}>
                <p className={styles.progressLabel}>
                  {fill(trial.review.progress, {
                    n: notebook.length - queue.length + 1,
                    total: notebook.length,
                  })}
                </p>
                <p className={styles.flashWord} lang={current.lang}>{current.text}</p>
                {phase === "recall" ? (
                  <p className={styles.prompt}>{trial.review.prompt}</p>
                ) : (
                  <div className={styles.answer}>
                    {current.reading ? <p lang={current.lang}>{current.reading}</p> : null}
                    <p className={styles.answerMeaning}>{current.meaning}</p>
                    {current.equivalent ? (
                      <p className={styles.answerEquivalent}>
                        {journey.understand.equivalentLabel}: <strong>{current.equivalent}</strong>
                      </p>
                    ) : null}
                    {current.id === "phrase" && current.why ? (
                      <p className={styles.answerWhy}>
                        {journey.keep.whyLabel}: “{current.why}”
                      </p>
                    ) : null}
                  </div>
                )}

                <div className={styles.actions}>
                  {current.speech ? (
                    <ListenButton
                      id={`review-${current.id}`}
                      text={current.text}
                      speech={current.speech}
                      speaker={speaker}
                      copy={listen}
                    />
                  ) : null}
                  {phase === "recall" ? (
                    <button type="button" className={styles.primary} onClick={() => setPhase("answer")}>
                      {trial.review.reveal}
                    </button>
                  ) : phase === "answer" ? (
                    <>
                      <button type="button" className={styles.secondary} onClick={() => grade("again")}>
                        <RotateCcw size={16} aria-hidden="true" />
                        {trial.review.again}
                      </button>
                      <button type="button" className={styles.primary} onClick={() => grade("gotIt")}>
                        <Check size={16} aria-hidden="true" />
                        {trial.review.gotIt}
                      </button>
                    </>
                  ) : (
                    <button type="button" className={styles.primary} onClick={nextCard}>
                      {trial.review.next}
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
                <p className={styles.status} role="status">
                  {phase === "again" ? trial.review.againResult : phase === "gotIt" ? trial.review.gotItResult : ""}
                </p>
              </div>
            )}
          </div>
        ) : null}

        {nextStep ? (
          <button type="button" className={styles.next} onClick={() => go(nextStep, true)}>
            {fill(trial.nextStep, { step: trial.tabs[nextStep] })}
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <aside className={styles.notebook} aria-labelledby={`${baseId}-notebook`}>
        <p id={`${baseId}-notebook`} className={styles.notebookTitle}>
          <Bookmark size={14} aria-hidden="true" />
          {trial.notebook.title}
          <span>{notebook.length}</span>
        </p>
        {notebook.length ? (
          <ul>
            {notebook.map(item => (
              <li key={item.id}>
                <strong lang={item.lang}>{item.text}</strong>
                <span>{item.id === "phrase" ? item.where : item.meaning}</span>
                <button
                  type="button"
                  aria-label={fill(trial.notebook.remove, { phrase: item.text })}
                  onClick={() => remove(item.id)}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.notebookEmpty}>{trial.notebook.empty}</p>
        )}
      </aside>
    </section>
  );
}

/** The friend's reply, with the word they offered set apart in its language. */
function ReplyWithWord({ exchange }: { exchange: HeroCopy["journey"]["exchange"] }) {
  const { reply, replyWord, replyLang } = exchange;
  const at = reply.indexOf(replyWord);
  if (at < 0) return <>{reply}</>;
  return (
    <>
      {reply.slice(0, at)}
      <mark lang={replyLang}>{replyWord}</mark>
      {reply.slice(at + replyWord.length)}
    </>
  );
}
