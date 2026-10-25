"use client";

import { ArrowLeft, Check, Info, Languages, Volume2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import EnergyCookie from "@/components/shop/EnergyCookie";
import useTranslation from "@/hooks/i18n/useTranslation";
import useOnline from "@/hooks/useOnline";
import useReducedMotion from "@/hooks/useReducedMotion";
import {
  KEYBOARDS, LEVELS, MAX_MISSES, PIECES, REWARDS, isLevel, normalizeGuess,
  type HangyumiLevel, type HangyumiRound,
} from "@/lib/hangyumi/rules";
import { HangyumiClosedError, type HangyumiService } from "@/lib/hangyumi/service";
import { fill, plural } from "@/lib/i18n/format";
import {
  INTERFACE_LANGUAGE_CODE, LANGUAGE_CODES, getLanguage, getLanguageName, resolveSupportLanguage, type LanguageCode,
} from "@/lib/languages";
import type { YumiOutfit } from "@/lib/shop/catalog";
import { announceEnergyLanded } from "@/lib/shop/energy";
import { speak, speechSupported } from "@/lib/speech";

import HangyumiStage from "./HangyumiStage";
import styles from "./Hangyumi.module.css";

/* =========================================================
   Hangyumi, the screen

   One word at a time from the graded bank, in the language being learnt,
   with its clue in the reader's own. A back arrow and nothing else to the
   left; the difficulty bar to the right. Every guess goes to the server,
   which says what it revealed and what it paid; the cookies it paid fly
   from the key to today's count.

   The language key beside the difficulty bar changes only the language
   the game deals in (Chi: "單純學習語言的切換"); the app's own learning
   language is left alone, and the clue stays in the reader's native
   language, or the next best one when they play in their own.

   The round in progress is remembered per language and level, so a reload
   or a second tab carries on with the same word rather than dealing a new
   one (the server deals once per round id).
   ========================================================= */

type Props = {
  service: HangyumiService;
  /** The app's learning language: what the game deals in until the reader picks another. */
  defaultLanguage: LanguageCode;
  /** The reader's native language, for the clue. */
  nativeLanguage: LanguageCode | null;
  /** The reader's own outfit, put on when a word is won. */
  loadOutfit?: () => Promise<YumiOutfit>;
  backHref?: string;
  reviewHref?: string;
};

type Phase = "loading" | "ready" | "missing" | "error";

const LEVEL_KEY = "hangyumi-level";
const LANGUAGE_KEY = "hangyumi-language";
const isLanguageCode = (value: unknown): value is LanguageCode =>
  typeof value === "string" && (LANGUAGE_CODES as readonly string[]).includes(value);
const roundKey = (language: LanguageCode, level: HangyumiLevel) => `hangyumi-round:${language}:${level}`;

function readStorage(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function writeStorage(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* private mode: the round is simply not remembered */ }
}
function newRoundId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16));
}

const QWERTY = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

export default function HangyumiGame({
  service, defaultLanguage, nativeLanguage, loadOutfit, backHref = "/home", reviewHref = "/hangyumi/review",
}: Props) {
  const { t, language: interfaceLanguage, locale } = useTranslation();
  const [chosenLanguage, setChosenLanguage] = useState<LanguageCode | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const levelsRef = useRef<HTMLDivElement>(null);
  const learningLanguage = chosenLanguage ?? defaultLanguage;
  const hintLanguage = resolveSupportLanguage(learningLanguage, INTERFACE_LANGUAGE_CODE[interfaceLanguage], nativeLanguage);
  const copy = t.hangyumi;
  const online = useOnline();
  const reducedMotion = useReducedMotion();

  const [level, setLevel] = useState<HangyumiLevel>("B1");
  const [queuedLevel, setQueuedLevel] = useState<HangyumiLevel | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [failure, setFailure] = useState<"failed" | "closed">("failed");
  const [round, setRound] = useState<HangyumiRound | null>(null);
  const [todayEarned, setTodayEarned] = useState<number | null>(null);
  const [reviewer, setReviewer] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [bump, setBump] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [outfit, setOutfit] = useState<YumiOutfit | null>(null);
  const [deal, setDeal] = useState(0);

  const counterRef = useRef<HTMLSpanElement>(null);
  const flightRef = useRef<HTMLDivElement>(null);
  const spokenRef = useRef<string | null>(null);
  const roundRef = useRef<HangyumiRound | null>(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  // The level last played, once the page is in the browser.
  useEffect(() => {
    const saved = readStorage(LEVEL_KEY);
    const savedLanguage = readStorage(LANGUAGE_KEY);
    queueMicrotask(() => {
      if (isLevel(saved)) setLevel(saved);
      if (isLanguageCode(savedLanguage)) setChosenLanguage(savedLanguage);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void service.today().then(today => {
      if (cancelled) return;
      setTodayEarned(today.earned);
      setReviewer(today.reviewer);
    }, () => {});
    void loadOutfit?.().then(worn => { if (!cancelled) setOutfit(worn); }, () => {});
    return () => { cancelled = true; };
  }, [service, loadOutfit]);

  // Deal (or pick up) the round for this language and level.
  useEffect(() => {
    let cancelled = false;
    const key = roundKey(learningLanguage, level);
    const id = readStorage(key) ?? newRoundId();
    writeStorage(key, id);
    queueMicrotask(() => { if (!cancelled) { setPhase("loading"); setNotice(""); } });
    service.start({ roundId: id, language: learningLanguage, level, hintLanguage }).then(started => {
      if (cancelled) return;
      if (started.status === "missing") {
        setRound(null);
        setPhase("missing");
        return;
      }
      setRound(started);
      setTodayEarned(started.today.earned);
      setPhase("ready");
      spokenRef.current = started.status === "playing" ? null : started.id;
    }, error => {
      if (cancelled) return;
      setFailure(error instanceof HangyumiClosedError ? "closed" : "failed");
      setPhase("error");
    });
    return () => { cancelled = true; };
  }, [service, learningLanguage, hintLanguage, level, deal]);

  const chooseLevel = useCallback((next: HangyumiLevel) => {
    writeStorage(LEVEL_KEY, next);
    const current = roundRef.current;
    // A word already being guessed is finished first; the bar says what comes next.
    if (current && current.status === "playing" && current.guessed.length > 0 && next !== level) {
      setQueuedLevel(next === current.level ? null : next);
      return;
    }
    setQueuedLevel(null);
    setLevel(next);
  }, [level]);

  const chooseLanguage = useCallback((next: LanguageCode) => {
    writeStorage(LANGUAGE_KEY, next);
    setChosenLanguage(next);
    setQueuedLevel(null);
    setLanguageOpen(false);
  }, []);

  const nextWord = useCallback(() => {
    const nextLevel = queuedLevel ?? level;
    writeStorage(roundKey(learningLanguage, nextLevel), newRoundId());
    setQueuedLevel(null);
    setLevel(nextLevel);
    setDeal(n => n + 1);
  }, [queuedLevel, level, learningLanguage]);

  const flyCookies = useCallback((from: DOMRect | null, amount: number) => {
    const layer = flightRef.current;
    const counter = counterRef.current;
    if (!layer || !counter || !from || reducedMotion || typeof layer.animate !== "function") {
      setBump(n => n + 1);
      return;
    }
    const to = counter.getBoundingClientRect();
    const crumbs = Math.min(6, Math.max(1, Math.round(amount / 3)));
    const template = layer.querySelector<HTMLElement>("[data-cookie-template]");
    for (let i = 0; i < crumbs; i++) {
      const cookie = (template?.cloneNode(true) as HTMLElement | undefined) ?? document.createElement("span");
      cookie.removeAttribute("data-cookie-template");
      cookie.className = styles.flyingCookie;
      layer.appendChild(cookie);
      const startX = from.left + from.width / 2 - 11 + (i - crumbs / 2) * 6;
      const startY = from.top + from.height / 2 - 11;
      const dx = to.left + to.width / 2 - 11 - startX;
      const dy = to.top + to.height / 2 - 11 - startY;
      const lift = -60 - i * 8;
      const animation = cookie.animate([
        { transform: `translate(${startX}px, ${startY}px) scale(0.4)`, opacity: 0 },
        { transform: `translate(${startX + dx * 0.35}px, ${startY + dy * 0.35 + lift}px) scale(1.1)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${startX + dx}px, ${startY + dy}px) scale(0.55)`, opacity: 0.9 },
      ], { duration: 720, delay: i * 70, easing: "cubic-bezier(.3,.6,.25,1)", fill: "both" });
      animation.onfinish = () => {
        cookie.remove();
        if (i === crumbs - 1) setBump(n => n + 1);
      };
    }
  }, [reducedMotion]);

  const guess = useCallback(async (raw: string, from: DOMRect | null) => {
    const current = roundRef.current;
    const letter = normalizeGuess(raw);
    if (!current || current.status !== "playing" || !letter || pendingRef.current) return;
    if (current.guessed.includes(letter)) return;
    if (current.keyboard && !current.keyboard.includes(letter)) return;
    pendingRef.current = true;
    setPending(true);
    try {
      const result = await service.guess(current.id, letter);
      setRound(result);
      const paid = result.paid.letter + result.paid.word;
      const messages: string[] = [];
      if (paid > 0) {
        if (result.paid.word > 0) messages.push(fill(copy.wordPaid, { count: result.paid.word }));
        flyCookies(from, paid);
        announceEnergyLanded(paid);
      }
      if (result.paid.capped && result.today.remaining === 0 && paid === 0) messages.push(copy.capReached);
      else if (result.paid.capped && paid > 0) messages.push(fill(copy.capped, { count: paid }));
      if (result.paid.already) messages.push(copy.alreadyPaid);
      setNotice(messages.join(" "));
      // The count moves when the last cookie lands; without a flight, now.
      if (paid === 0 || reducedMotion) setTodayEarned(result.today.earned);
      else window.setTimeout(() => setTodayEarned(result.today.earned), 640);
    } catch (error) {
      setFailure(error instanceof HangyumiClosedError ? "closed" : "failed");
      setNotice(copy.failed);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [service, copy, flyCookies, reducedMotion]);

  // The difficulty folds away again on a tap anywhere else, or Escape.
  useEffect(() => {
    if (!levelsOpen) return;
    function away(event: PointerEvent) {
      if (event.target instanceof Node && levelsRef.current?.contains(event.target)) return;
      setLevelsOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setLevelsOpen(false);
    }
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [levelsOpen]);

  // A real keyboard works too.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return;
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, [contenteditable='true']")) return;
      const current = roundRef.current;
      if (!current) return;
      if (event.key === "Enter" && current.status !== "playing") {
        event.preventDefault();
        nextWord();
        return;
      }
      if (event.key.length === 1 && normalizeGuess(event.key)) {
        const key = document.querySelector<HTMLElement>(`[data-hangyumi-key="${CSS.escape(normalizeGuess(event.key)!)}"]`);
        void guess(event.key, key?.getBoundingClientRect() ?? null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guess, nextWord]);

  // Once a round is over, say the word.
  useEffect(() => {
    if (!round || round.status === "playing" || !round.answer || spokenRef.current === round.id) return;
    spokenRef.current = round.id;
    if (speechSupported()) speak(round.answer, getLanguage(round.language).speechTag);
  }, [round]);

  const languageName = getLanguageName(learningLanguage, interfaceLanguage);
  const shownLevel = queuedLevel ?? level;
  const isChinese = learningLanguage === "zh-TW";
  const hits = useMemo(() => new Set(round?.guessed.filter(g => !round.wrong.includes(g)) ?? []), [round]);
  const wrong = useMemo(() => new Set(round?.wrong ?? []), [round]);

  const chineseKeys = round?.keyboard ?? null;
  const rows = useMemo(() => {
    if (isChinese) return chineseKeys ? [chineseKeys] : [];
    const layout = KEYBOARDS[learningLanguage as Exclude<LanguageCode, "zh-TW">];
    return [...QWERTY.map(row => [...row]), ...(layout.accents.length ? [layout.accents] : [])];
  }, [isChinese, chineseKeys, learningLanguage]);

  const misses = round?.misses ?? 0;
  const status = round?.status ?? "playing";
  const stageLabel = status === "won" ? copy.studioWon : status === "lost" ? copy.studioLost : fill(copy.studio, { count: misses });
  const nextPiece = status === "playing" && misses < MAX_MISSES ? copy.pieces[PIECES[misses]] : null;
  const missesLeft = MAX_MISSES - misses;
  const earned = todayEarned ?? round?.today.earned ?? 0;

  return (
    <div className={styles.page} data-status={status}>
      <header className={styles.bar}>
        <Link href={backHref} className={styles.back} aria-label={copy.back} title={copy.back}>
          <ArrowLeft size={22} strokeWidth={1.9} aria-hidden="true" />
        </Link>
        <h1 className={styles.srOnly}>{copy.title}</h1>
        <button
          type="button"
          className={styles.languageKey}
          onClick={() => setLanguageOpen(true)}
          aria-label={fill(copy.language, { language: languageName })}
          title={fill(copy.language, { language: languageName })}
        >
          <Languages size={18} strokeWidth={1.9} aria-hidden="true" />
          <span>{getLanguage(learningLanguage).badge}</span>
        </button>
        {/* The difficulty, as one chip; a tap opens the others out to its
            left (Chi), a choice or a tap elsewhere folds them away. */}
        <div
          ref={levelsRef}
          className={styles.levels}
          data-open={levelsOpen ? "true" : "false"}
          role={levelsOpen ? "radiogroup" : undefined}
          aria-label={levelsOpen ? copy.level : undefined}
        >
          {LEVELS.map(choice => {
            const chosen = shownLevel === choice;
            const current = level === choice && !queuedLevel ? "true" : "false";
            if (!levelsOpen) {
              return (
                <button
                  key={choice}
                  type="button"
                  className={styles.level}
                  data-chosen={chosen ? "true" : "false"}
                  data-current={current}
                  hidden={!chosen}
                  aria-expanded="false"
                  aria-label={fill(copy.levelChoice, { level: choice })}
                  onClick={() => setLevelsOpen(true)}
                >
                  {choice}
                </button>
              );
            }
            return (
              <button
                key={choice}
                type="button"
                role="radio"
                aria-checked={chosen}
                aria-label={fill(copy.levelChoice, { level: choice })}
                className={styles.level}
                data-chosen={chosen ? "true" : "false"}
                data-current={current}
                onClick={() => {
                  setLevelsOpen(false);
                  chooseLevel(choice);
                }}
              >
                {choice}
              </button>
            );
          })}
        </div>
      </header>
      {queuedLevel && <p className={styles.queued}>{fill(copy.nextLevel, { level: queuedLevel })}</p>}

      {/* The studio, with what is happening on it laid over its corners:
          today's cookies and the rules up top, the pieces hung below. */}
      <section className={styles.stageWrap}>
        <HangyumiStage misses={misses} status={status} outfit={outfit} label={stageLabel} />
        <div className={styles.stageTop}>
          <span className={styles.todayCount} data-bump={bump % 2 ? "a" : "b"} ref={counterRef}>
            <EnergyCookie className={styles.todayCookie} />
            <span aria-hidden="true">{earned}<small> / 333</small></span>
            <span className={styles.srOnly}>{fill(copy.todayLabel, { earned, cap: 333 })}</span>
          </span>
          {round && round.earned > 0 && <span className={styles.roundEarned}>{fill(copy.roundEarned, { count: round.earned })}</span>}
          <button type="button" className={styles.info} onClick={() => setRulesOpen(true)} aria-label={copy.rulesTitle} title={copy.rulesTitle}>
            <Info size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </div>
        {phase === "ready" && round && (
          <div className={styles.stageBottom}>
            <span className={styles.pieces} aria-hidden="true">
              {PIECES.map((piece, index) => (
                <span key={piece} className={styles.piece} data-hung={misses > index || round.status === "lost" ? "true" : "false"} data-piece={piece}>
                  {piece === "eye" ? "O" : piece === "arm" ? "I" : "U"}
                </span>
              ))}
            </span>
            <span className={styles.missesText}>
              {round.status === "playing"
                ? plural(missesLeft, locale, copy.missesLeftOne, copy.missesLeftOther, { count: missesLeft })
                : null}
              {nextPiece && <span className={styles.srOnly}> {fill(copy.nextPiece, { piece: nextPiece })}</span>}
            </span>
          </div>
        )}
        <p className={styles.live} aria-live="polite" data-shown={notice ? "true" : "false"}>{notice}</p>
      </section>

      {!online && phase !== "ready" && <p className={styles.panel}>{copy.offline}</p>}

      {phase === "loading" && <p className={styles.panel} aria-busy="true">{copy.loading}</p>}

      {phase === "error" && (
        <div className={styles.panel}>
          <p>{failure === "closed" ? copy.closed : copy.failed}</p>
          {failure !== "closed" && <button type="button" className={styles.secondary} onClick={() => setDeal(n => n + 1)}>{copy.retry}</button>}
        </div>
      )}

      {phase === "missing" && (
        <div className={styles.panel}>
          <p>{fill(copy.missing, { level, language: languageName })}</p>
          <p className={styles.muted}>{copy.missingNote}</p>
          {reviewer && <Link className={styles.secondary} href={reviewHref}>{copy.review}</Link>}
        </div>
      )}

      {phase === "ready" && round && (
        <>
          <section className={styles.clue} aria-label={copy.clue}>
            <div className={styles.clueHead}>
              <span className={styles.pos}>{copy.partsOfSpeech[round.partOfSpeech]}</span>
              <span className={styles.rewardNote}>{fill(copy.levelRewards, { letter: round.rewards.letter, word: round.rewards.word })}</span>
            </div>
            <p className={styles.hint} lang={getLanguage(round.hintLanguage).htmlLang}>{round.hint}</p>
          <div
            className={styles.word}
            data-chinese={isChinese ? "true" : "false"}
            style={{ "--letters": round.slots.length } as React.CSSProperties}
            lang={getLanguage(round.language).htmlLang}
            aria-label={copy.word}
            role="group"
          >
            {round.slots.map((slot, index) => slot.letter ? (
              <span
                key={index}
                className={styles.slot}
                data-filled={slot.char ? "true" : "false"}
                data-missed={round.status === "lost" && slot.char && !round.guessed.includes(slot.char.toLocaleLowerCase()) ? "true" : "false"}
              >
                {slot.char ?? <span className={styles.srOnly}>{copy.hidden}</span>}
              </span>
            ) : (
              <span key={index} className={styles.gap}>{slot.char === " " ? " " : slot.char}</span>
            ))}
          </div>

          </section>

          {/* The keyboard, or once the round is over its result, held to the
              bottom of the screen where a thumb is. */}
          <div className={styles.dock}>
          {round.status === "playing" ? (
            <div
              className={styles.keyboard}
              data-chinese={isChinese ? "true" : "false"}
              role="group"
              aria-label={isChinese ? copy.charactersLabel : copy.lettersLabel}
            >
              {rows.map((row, rowIndex) => (
                <div key={rowIndex} className={styles.keyRow} data-accents={!isChinese && rowIndex === 3 ? "true" : "false"}>
                  {row.map(char => {
                    const used = hits.has(char) ? "hit" : wrong.has(char) ? "miss" : "no";
                    return (
                      <button
                        key={char}
                        type="button"
                        className={styles.key}
                        data-hangyumi-key={char}
                        data-used={used}
                        disabled={used !== "no" || pending}
                        aria-label={used === "no" ? fill(copy.guessKey, { char }) : fill(copy.usedKey, { char })}
                        onClick={event => void guess(char, event.currentTarget.getBoundingClientRect())}
                      >
                        {char}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <section className={styles.result} data-status={round.status} aria-live="polite">
              <h2>{round.status === "won" ? copy.won : copy.lost}</h2>
              <p className={styles.muted}>
                {round.status === "won"
                  ? fill(copy.wonBody, { count: round.earned })
                  : round.earned > 0
                    ? plural(round.earned, locale, copy.lostBodyOne, copy.lostBodyOther, { count: round.earned })
                    : copy.lostBodyNone}
              </p>
              <p className={styles.answerLabel}>{copy.answer}</p>
              <div className={styles.answerRow}>
                <span className={styles.answer} lang={getLanguage(round.language).htmlLang}>{round.answer}</span>
                {speechSupported() && round.answer && (
                  <button
                    type="button"
                    className={styles.listen}
                    onClick={() => speak(round.answer!, getLanguage(round.language).speechTag)}
                    aria-label={copy.listen}
                    title={copy.listen}
                  >
                    <Volume2 size={20} strokeWidth={1.9} aria-hidden="true" />
                  </button>
                )}
              </div>
              <button type="button" className={styles.primary} onClick={nextWord}>{copy.next}</button>
            </section>
          )}
          </div>
        </>
      )}

      <div ref={flightRef} className={styles.flight} aria-hidden="true">
        <span data-cookie-template="" className={styles.cookieTemplate}><EnergyCookie /></span>
      </div>

      <BottomSheet open={languageOpen} onClose={() => setLanguageOpen(false)} title={copy.languageTitle} maxHeight="70vh">
        <div className={styles.languages} role="radiogroup" aria-label={copy.languageTitle}>
          {LANGUAGE_CODES.map(code => (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={code === learningLanguage}
              className={styles.languageChoice}
              onClick={() => chooseLanguage(code)}
            >
              <span className={styles.languageBadge}>{getLanguage(code).badge}</span>
              <span className={styles.languageNames}>
                <strong lang={getLanguage(code).htmlLang}>{getLanguage(code).endonym}</strong>
                <small>{getLanguageName(code, interfaceLanguage)}</small>
              </span>
              {code === learningLanguage && <Check size={18} strokeWidth={2.2} aria-hidden="true" />}
            </button>
          ))}
        </div>
        <p className={styles.languageNote}>{copy.languageNote}</p>
      </BottomSheet>

      <BottomSheet open={rulesOpen} onClose={() => setRulesOpen(false)} title={copy.rulesTitle} maxHeight="70vh">
        <ul className={styles.rules}>
          <li>{fill(copy.rules.letters, { letter: REWARDS[level].letter, word: REWARDS[level].word })}</li>
          <li>{copy.rules.misses}</li>
          <li>{copy.rules.cap}</li>
          {!isChinese && <li>{copy.rules.accents}</li>}
          <li>{copy.rules.learning}</li>
        </ul>
      </BottomSheet>
    </div>
  );
}
