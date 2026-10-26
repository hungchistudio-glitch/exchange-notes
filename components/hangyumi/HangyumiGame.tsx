"use client";

import { ArrowLeft, BookmarkCheck, BookmarkPlus, Check, Globe, Info } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import EnergyCookie from "@/components/shop/EnergyCookie";
import ShopThumb from "@/components/shop/ShopThumb";
import useTranslation from "@/hooks/i18n/useTranslation";
import useOnline from "@/hooks/useOnline";
import useReducedMotion from "@/hooks/useReducedMotion";
import {
  KEYBOARDS, LEVELS, MAX_MISSES, PIECES, REWARDS, isLevel, normalizeGuess,
  type HangyumiLevel, type HangyumiReading, type HangyumiRound,
} from "@/lib/hangyumi/rules";
import { HangyumiClosedError, type HangyumiService, type SaveWord } from "@/lib/hangyumi/service";
import { setSoundsOn, sounds, soundsOn, unlockSounds } from "@/lib/hangyumi/sounds";
import { fill, plural } from "@/lib/i18n/format";
import {
  INTERFACE_LANGUAGE_CODE, LANGUAGE_CODES, getLanguage, getLanguageName, resolveSupportLanguage, type LanguageCode,
} from "@/lib/languages";
import { shopItem, type YumiOutfit } from "@/lib/shop/catalog";
import { announceEnergyLanded } from "@/lib/shop/energy";

import WordvaultStage from "@/components/wordvault/WordvaultStage";
import { VAULT_PIECES } from "@/lib/wordvault/presentation";

import HangyumiStage from "./HangyumiStage";
import HangyumiWordCard from "./HangyumiWordCard";
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
   language is left alone, and when that changes in Settings the game's
   choice gives way to it. The clue is always in the app's display
   language, the one chosen in Settings (Chi, 2026-10-26), whatever is
   being played.

   The round in progress is remembered per language and level, so a reload
   or a second tab carries on with the same word rather than dealing a new
   one (the server deals once per round id).

   The same screen plays Yumi Wordvault｜詞語秘藏 (Chi, 2026-10-26): the
   same bank, server, cookies and 333 a day, shared between the two games,
   the same language and level, with its own stage, its own words for what
   happens, and its own round in progress. Only `game` tells them apart.
   ========================================================= */

export type GameKind = "hangyumi" | "wordvault";

type Props = {
  service: HangyumiService;
  /** The app's learning language: what the game deals in until the reader picks another. */
  defaultLanguage: LanguageCode;
  /** The reader's wallet: the outfit put on when a word is won, and the cookies there are to spend. */
  loadWallet?: () => Promise<{ outfit: YumiOutfit; balance: number }>;
  /** The word's gloss for its card, or null when none can be had. */
  translate?: (text: string, from: LanguageCode, to: LanguageCode) => Promise<string | null>;
  /** The reader's native language: the card's second side when the display language is the one being learnt. */
  nativeLanguage?: LanguageCode | null;
  /** Keeps a finished round's word in the reader's vocabulary (Chi). */
  saveWord?: SaveWord;
  backHref?: string;
  reviewHref?: string;
  /** Which game the screen plays; Hangyumi unless told. */
  game?: GameKind;
};

type Phase = "loading" | "ready" | "missing" | "error";

const LEVEL_KEY = "hangyumi-level";
const LANGUAGE_KEY = "hangyumi-language";
/* The app's learning language when the game's own was chosen: once the
   app's changes, the game's choice gives way to it (Chi, 2026-10-26). */
const LANGUAGE_BASE_KEY = "hangyumi-language-base";
const isLanguageCode = (value: unknown): value is LanguageCode =>
  typeof value === "string" && (LANGUAGE_CODES as readonly string[]).includes(value);
/* Each game keeps its own word in progress: a Hangyumi round is never
   picked up in Wordvault, or the other way round. */
const roundKey = (game: GameKind, language: LanguageCode, level: HangyumiLevel) =>
  game === "hangyumi" ? `hangyumi-round:${language}:${level}` : `${game}-round:${language}:${level}`;

function readStorage(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function writeStorage(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* private mode: the round is simply not remembered */ }
}
function removeStorage(key: string) {
  try { window.localStorage.removeItem(key); } catch { /* nothing was kept */ }
}
function newRoundId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16));
}

const QWERTY = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

export default function HangyumiGame({
  service, defaultLanguage, loadWallet, translate, nativeLanguage, saveWord, backHref = "/home", reviewHref = "/hangyumi/review",
  game = "hangyumi",
}: Props) {
  const { t, language: interfaceLanguage, locale } = useTranslation();
  const [chosenLanguage, setChosenLanguage] = useState<LanguageCode | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [levelsOpen, setLevelsOpen] = useState(false);
  /* The page's way in: its bands rise into place once, on arrival, and
     never again for a new word (Chi: "進入遊戲頁…加一個簡單的動畫"). */
  const [entering, setEntering] = useState(true);
  /* Wordvault's way in (Chi, 2026-10-26): the bar and the empty studio
     first; the clue, the word and the keys only as Yumi lands on the path,
     one after another ("landing"), and then never again. Hangyumi's line
     lowers in on its own, so it is "done" from the start. */
  const [arrival, setArrival] = useState<"waiting" | "landing" | "done">(game === "wordvault" ? "waiting" : "done");
  const waitingRef = useRef(game === "wordvault");
  const arrive = useCallback(() => {
    if (!waitingRef.current) return;
    waitingRef.current = false;
    setArrival("landing");
  }, []);
  /* The wallet has answered, or failed to: what she wears is known. */
  const [walletRead, setWalletRead] = useState(!loadWallet);
  /* Each wrong guess flashes the screen's edge; counted so each one replays. */
  const [flash, setFlash] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  useEffect(() => { queueMicrotask(() => setSoundOn(soundsOn())); }, []);
  const celebrateRef = useRef<HTMLDivElement>(null);
  /* The save button's state, for the round it belongs to. */
  const [saving, setSaving] = useState<{ id: string; state: "saving" | "saved" | "duplicate" | "failed" } | null>(null);
  const levelsRef = useRef<HTMLDivElement>(null);
  const learningLanguage = chosenLanguage ?? defaultLanguage;
  const hintLanguage = INTERFACE_LANGUAGE_CODE[interfaceLanguage];
  /* Wordvault says what happens in its own words; everything else is shared. */
  const copy = useMemo(() => game === "wordvault"
    ? { ...t.hangyumi, ...t.wordvault, rules: { ...t.hangyumi.rules, ...t.wordvault.rules } }
    : t.hangyumi, [game, t]);
  const pieces = game === "wordvault" ? VAULT_PIECES : PIECES;
  /* "Yumi Wordvault" is too long for the sign on a phone; it says Wordvault. */
  const signTitle = game === "wordvault" ? t.wordvault.short : copy.title;
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
  /* What was just paid, over the studio. Counted, so the same words twice
     still show twice; each showing fades in, stays six seconds and goes
     (Chi, 2026-10-26), leaving the studio clean. */
  const [notice, setNoticeState] = useState({ text: "", run: 0 });
  const setNotice = useCallback((text: string) => {
    setNoticeState(current => ({ text, run: text ? current.run + 1 : current.run }));
  }, []);
  const [bump, setBump] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [outfit, setOutfit] = useState<YumiOutfit | null>(null);
  /* The cookies there are to spend: the number the pill counts to, and
     the number it is showing on the way there. */
  const [balance, setBalance] = useState<number | null>(null);
  const shownBalance = useCountUp(balance, reducedMotion);
  /* The finished round's word in the reader's language, for its card. */
  const [gloss, setGloss] = useState<{ id: string; text: string | null; language: LanguageCode; reading?: HangyumiReading } | null>(null);
  const [deal, setDeal] = useState(0);

  const counterRef = useRef<HTMLSpanElement>(null);
  const flightRef = useRef<HTMLDivElement>(null);
  const roundRef = useRef<HangyumiRound | null>(null);
  const pendingRef = useRef(false);

  /* The ref moves with the state, not an effect later: a key pressed the
     moment a word appears is read against that word, not dropped. */
  const showRound = useCallback((next: HangyumiRound | null) => {
    roundRef.current = next;
    setRound(next);
  }, []);

  // The level and language last played, once the page is in the browser.
  // Nothing is dealt before they are read: dealing B1 first and then the
  // saved level flashed the wrong chip and started a round for nothing.
  const [prefsRead, setPrefsRead] = useState(false);
  const appLanguageRef = useRef(defaultLanguage);
  useEffect(() => {
    const saved = readStorage(LEVEL_KEY);
    const savedLanguage = readStorage(LANGUAGE_KEY);
    // Chosen while the app was learning something else: the app has moved on.
    const stillCurrent = readStorage(LANGUAGE_BASE_KEY) === appLanguageRef.current;
    if (!stillCurrent) {
      removeStorage(LANGUAGE_KEY);
      removeStorage(LANGUAGE_BASE_KEY);
    }
    queueMicrotask(() => {
      if (isLevel(saved)) setLevel(saved);
      if (stillCurrent && isLanguageCode(savedLanguage)) setChosenLanguage(savedLanguage);
      setPrefsRead(true);
    });
  }, []);

  // The app's learning language changed while the game was open.
  useEffect(() => {
    if (appLanguageRef.current === defaultLanguage) return;
    appLanguageRef.current = defaultLanguage;
    removeStorage(LANGUAGE_KEY);
    removeStorage(LANGUAGE_BASE_KEY);
    queueMicrotask(() => setChosenLanguage(null));
  }, [defaultLanguage]);

  useEffect(() => {
    let cancelled = false;
    void service.today().then(today => {
      if (cancelled) return;
      setTodayEarned(today.earned);
      setReviewer(today.reviewer);
    }, () => {});
    void loadWallet?.().then(wallet => {
      if (cancelled) return;
      setOutfit(wallet.outfit);
      setBalance(wallet.balance);
      setWalletRead(true);
    }, () => { if (!cancelled) setWalletRead(true); });
    return () => { cancelled = true; };
  }, [service, loadWallet]);

  // Deal (or pick up) the round for this language and level.
  useEffect(() => {
    if (!prefsRead) return;
    let cancelled = false;
    const key = roundKey(game, learningLanguage, level);
    const id = readStorage(key) ?? newRoundId();
    writeStorage(key, id);
    queueMicrotask(() => { if (!cancelled) { setPhase("loading"); setNotice(""); } });
    service.start({ roundId: id, language: learningLanguage, level, hintLanguage, game }).then(started => {
      if (cancelled) return;
      if (started.status === "missing") {
        showRound(null);
        setPhase("missing");
        return;
      }
      showRound(started);
      setTodayEarned(started.today.earned);
      setPhase("ready");
    }, error => {
      if (cancelled) return;
      setFailure(error instanceof HangyumiClosedError ? "closed" : "failed");
      setPhase("error");
    });
    return () => { cancelled = true; };
  }, [service, learningLanguage, hintLanguage, level, deal, prefsRead, showRound, setNotice, game]);

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
    if (next === appLanguageRef.current) {
      removeStorage(LANGUAGE_KEY);
      removeStorage(LANGUAGE_BASE_KEY);
      setChosenLanguage(null);
    } else {
      writeStorage(LANGUAGE_KEY, next);
      writeStorage(LANGUAGE_BASE_KEY, appLanguageRef.current);
      setChosenLanguage(next);
    }
    setQueuedLevel(null);
    setLanguageOpen(false);
  }, []);

  const nextWord = useCallback(() => {
    const nextLevel = queuedLevel ?? level;
    writeStorage(roundKey(game, learningLanguage, nextLevel), newRoundId());
    setQueuedLevel(null);
    setLevel(nextLevel);
    setDeal(n => n + 1);
  }, [queuedLevel, level, learningLanguage, game]);

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

  /* The word is won: gold cookies and glints rain down the screen. */
  const celebrate = useCallback(() => {
    const layer = celebrateRef.current;
    const template = flightRef.current?.querySelector<HTMLElement>("[data-cookie-template]");
    if (!layer || reducedMotion || typeof layer.animate !== "function") return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    for (let i = 0; i < 34; i++) {
      const cookie = i % 3 === 0 && template;
      const piece = cookie ? (template.cloneNode(true) as HTMLElement) : document.createElement("span");
      piece.removeAttribute("data-cookie-template");
      piece.className = cookie ? styles.confettiCookie : styles.confettiGlint;
      layer.appendChild(piece);
      const x = Math.random() * width;
      const drift = (Math.random() - 0.5) * 120;
      const spin = (Math.random() - 0.5) * 720;
      const animation = piece.animate([
        { transform: `translate(${x}px, -40px) rotate(0deg)`, opacity: 0 },
        { transform: `translate(${x + drift * 0.3}px, ${height * 0.25}px) rotate(${spin * 0.3}deg)`, opacity: 1, offset: 0.15 },
        { transform: `translate(${x + drift}px, ${height + 40}px) rotate(${spin}deg)`, opacity: 0.9 },
      ], { duration: 1600 + Math.random() * 900, delay: Math.random() * 420, easing: "cubic-bezier(.3,.2,.6,1)", fill: "both" });
      animation.onfinish = () => piece.remove();
    }
  }, [reducedMotion]);

  const guess = useCallback(async (raw: string, from: DOMRect | null) => {
    const current = roundRef.current;
    const letter = normalizeGuess(raw);
    if (!current || current.status !== "playing" || !letter || pendingRef.current) return;
    /* Not before the keys are there to be seen. */
    if (waitingRef.current) return;
    if (current.guessed.includes(letter)) return;
    if (current.keyboard && !current.keyboard.includes(letter)) return;
    pendingRef.current = true;
    setPending(true);
    unlockSounds();
    sounds.tap();
    try {
      const result = await service.guess(current.id, letter);
      /* The reader moved to another language or level while the guess was
         out: the old round's answer must not replace the new one. What it
         paid still counts. */
      if (roundRef.current?.id !== current.id) {
        setTodayEarned(result.today.earned);
        if (result.balance !== null) setBalance(result.balance);
        return;
      }
      showRound(result);
      if (!result.repeat) {
        if (result.status === "won") {
          sounds.win();
          celebrate();
        } else if (result.status === "lost") {
          sounds.lose();
          setFlash(n => n + 1);
        } else if (result.hit) {
          sounds.hit();
        } else {
          sounds.miss();
          setFlash(n => n + 1);
        }
      }
      /* A Wordvault chest's extra cookies fly with the round's, and are
         said apart: they are outside the 333. */
      const chestCookies = result.chestReward?.cookies ?? 0;
      const paid = result.paid.letter + result.paid.word + chestCookies;
      const messages: string[] = [];
      if (paid > 0) {
        if (result.paid.word > 0) messages.push(fill(copy.wordPaid, { count: result.paid.word }));
        if (chestCookies > 0) messages.push(fill(t.wordvault.chestPaid, { count: chestCookies }));
        flyCookies(from, paid);
        announceEnergyLanded(paid);
      }
      if (result.paid.capped && result.today.remaining === 0 && paid === 0) messages.push(copy.capReached);
      else if (result.paid.capped && paid > 0) messages.push(fill(copy.capped, { count: paid }));
      if (result.paid.already) messages.push(copy.alreadyPaid);
      setNotice(messages.join(" "));
      // The counts move when the last cookie lands; without a flight, now.
      const land = () => {
        setTodayEarned(result.today.earned);
        if (result.balance !== null) setBalance(result.balance);
      };
      if (paid === 0 || reducedMotion) land();
      else window.setTimeout(land, 640);
    } catch (error) {
      setFailure(error instanceof HangyumiClosedError ? "closed" : "failed");
      setNotice(copy.failed);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [service, copy, t, flyCookies, reducedMotion, showRound, celebrate, setNotice]);

  const keepWord = useCallback(async () => {
    const current = roundRef.current;
    if (!saveWord || !current?.answer || current.status === "playing") return;
    setSaving({ id: current.id, state: "saving" });
    try {
      const result = await saveWord({
        answer: current.answer,
        language: current.language,
        partOfSpeech: current.partOfSpeech,
        hint: current.hint,
        hintLanguage: current.hintLanguage,
        ...(gloss?.id === current.id && gloss.text
          ? { translation: gloss.text, translationLanguage: gloss.language }
          : {}),
      });
      setSaving({ id: current.id, state: result });
      if (result === "saved") void loadWallet?.().then(wallet => setBalance(wallet.balance), () => {});
    } catch {
      setSaving({ id: current.id, state: "failed" });
    }
  }, [saveWord, loadWallet, gloss]);

  useEffect(() => {
    const timer = window.setTimeout(() => setEntering(false), 1000);
    return () => window.clearTimeout(timer);
  }, []);

  /* The cascade runs once and leaves nothing behind; and if the studio
     never says she landed, the page does not wait on it for ever. */
  useEffect(() => {
    if (arrival === "landing") {
      const timer = window.setTimeout(() => setArrival("done"), 900);
      return () => window.clearTimeout(timer);
    }
    if (arrival === "waiting" && phase !== "loading") {
      const timer = window.setTimeout(arrive, 6000);
      return () => window.clearTimeout(timer);
    }
  }, [arrival, phase, arrive]);

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
      // A sheet over the game (the rules, the languages) has the keyboard.
      if (document.querySelector("[aria-modal='true']")) return;
      const current = roundRef.current;
      if (!current) return;
      // Enter on a button (keep the word, listen) is that button's own;
      // anywhere else, once the round is over, it deals the next word.
      if (event.key === "Enter" && target instanceof Element && target.closest("button, a, [role='button']")) return;
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

  // Once a round is over, its word's gloss for the card: the word in the
  // app's display language (Chi, 2026-10-26: "對應的是設定的系統語言翻譯，
  // 而不是單字意思"), or in the native one when the display language is
  // the word's own. Written ahead in the word's card, with its reading; a
  // live translation only for a word that has none.
  const glossLanguage = round
    ? hintLanguage !== round.language ? hintLanguage : resolveSupportLanguage(round.language, null, nativeLanguage)
    : hintLanguage;
  useEffect(() => {
    if (!round || round.status === "playing" || !round.answer || gloss?.id === round.id) return;
    const { id, answer, language } = round;
    const to = glossLanguage;
    const written = round.card?.translations[to];
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setGloss(written ? { id, text: written.text, language: to, reading: written.reading } : { id, text: null, language: to });
    });
    if (written || !translate) return () => { cancelled = true; };
    void translate(answer, language, to).then(text => {
      if (!cancelled && text) setGloss({ id, text, language: to });
    }, () => {});
    return () => { cancelled = true; };
  }, [round, gloss?.id, glossLanguage, translate]);

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

  /* The placeholder word: as long as the last one, if it was in this language. */
  const ghostLetters = round && round.language === learningLanguage ? round.slots.length : isChinese ? 2 : 7;
  const misses = round?.misses ?? 0;
  /* The letter just guessed: its key and its places are the ones that move. */
  const lastGuess = round?.guessed.at(-1) ?? null;
  let flipCount = 0;
  const status = round?.status ?? "playing";
  const stageLabel = status === "won" ? copy.studioWon : status === "lost" ? copy.studioLost : fill(copy.studio, { count: misses });
  const nextPiece = status === "playing" && misses < MAX_MISSES ? copy.pieces[pieces[misses]] : null;
  const missesLeft = MAX_MISSES - misses;
  const earned = todayEarned ?? round?.today.earned ?? 0;

  return (
    <div className={styles.page} data-status={status} data-entering={entering ? "true" : "false"} data-arrival={arrival}>
      {/* The language and level keys wait for what was saved, so they never
          show B1 for a moment on the way to the level last played. */}
      <header className={styles.bar} data-prefs={prefsRead ? "read" : "pending"}>
        <Link href={backHref} className={styles.back} aria-label={copy.back} title={copy.back}>
          <ArrowLeft size={22} strokeWidth={1.9} aria-hidden="true" />
        </Link>
        {/* The game's signboard, the shop's own: a lacquered plate on two
            rods, the name in gilt, and under it, where the shop says where
            it orbits, the cookies there are to spend and today's share of
            the 333 (Chi, 2026-10-26). The flying cookies land on it. */}
        <div className={styles.signArea}>
          <h1 className={styles.sign}>
            <span className={styles.signHooks} aria-hidden="true" />
            {signTitle === copy.title
              ? <span className={styles.signName}>{copy.title}</span>
              : <><span className={styles.signName} aria-hidden="true">{signTitle}</span><span className={styles.srOnly}>{copy.title}</span></>}
            <span className={styles.signOrbit} aria-hidden="true">
              <span className={styles.signWallet} data-bump={bump % 2 ? "a" : "b"} ref={counterRef}>
                <EnergyCookie className={styles.signCookie} />
                <b>{shownBalance === null ? "–" : shownBalance.toLocaleString(locale)}</b>
              </span>
              <span className={styles.signToday}>· {earned}/333</span>
            </span>
          </h1>
          {balance !== null && <span className={styles.srOnly}>{fill(copy.balance, { count: balance })}</span>}
          <span className={styles.srOnly}>{fill(copy.todayLabel, { earned, cap: 333 })}</span>
        </div>
        <button
          type="button"
          className={styles.languageKey}
          onClick={() => setLanguageOpen(true)}
          aria-label={fill(copy.language, { language: languageName })}
          title={fill(copy.language, { language: languageName })}
        >
          <Globe size={16} strokeWidth={1.8} aria-hidden="true" />
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

      {/* The studio, with what is happening on it laid over its corners:
          today's cookies and the rules up top, the pieces hung below. */}
      <section className={styles.stageWrap}>
        {game === "wordvault"
          ? (
            <WordvaultStage
              round={round}
              outfit={outfit}
              dressed={walletRead}
              dealt={phase !== "loading"}
              onArrived={arrive}
              label={stageLabel}
              skipLabel={t.wordvault.skip}
            />
          )
          : <HangyumiStage misses={misses} status={status} outfit={outfit} label={stageLabel} />}
        <div className={styles.stageTop}>
          <span className={styles.stageTopLeft}>
            {/* Wordvault's streak: seven steps, the fourth and the seventh
                chests; the step this word is, lit; and the chest it holds. */}
            {game === "wordvault" && round && round.streak !== null && (
              <span className={styles.streak} role="img" aria-label={fill(t.wordvault.streakLabel, { count: round.streak })}>
                <span className={styles.streakPips} aria-hidden="true">
                  {Array.from({ length: 7 }, (_, i) => (
                    <i
                      key={i}
                      data-done={i < (round.streak ?? 0) ? "true" : "false"}
                      data-now={round.status === "playing" && i === round.streak ? "true" : "false"}
                      data-chest={i === 3 ? "medium" : i === 6 ? "premium" : undefined}
                    />
                  ))}
                </span>
                {round.status === "playing" && round.chest && round.chest !== "normal" && (
                  <b data-chest={round.chest} aria-hidden="true">
                    {round.chest === "medium" ? t.wordvault.chestMedium : t.wordvault.chestPremium}
                  </b>
                )}
              </span>
            )}
            {/* Replayed for each new total, then gone after six seconds. */}
            {round && round.earned > 0
              ? <span key={`${round.id}:${round.earned}`} className={styles.roundEarned}>{fill(copy.roundEarned, { count: round.earned })}</span>
              : <span />}
          </span>
          <button type="button" className={styles.info} onClick={() => setRulesOpen(true)} aria-label={copy.rulesTitle} title={copy.rulesTitle}>
            <Info size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </div>
        {phase === "ready" && round && (
          <div className={styles.stageBottom}>
            <span className={styles.pieces} aria-hidden="true">
              {pieces.map((piece, index) => (
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
        {/* Notices over the studio, never rows of their own: what comes next,
            and what was just paid. */}
        <div className={styles.notices}>
          {queuedLevel && <p className={styles.queued}>{fill(copy.nextLevel, { level: queuedLevel })}</p>}
          <p className={styles.live} aria-live="polite" data-shown={notice.text ? "true" : "false"} data-run={notice.run % 2 ? "a" : "b"}>{notice.text}</p>
        </div>
      </section>

      {/* Everything under the studio, in one frame that never changes, so
          the way in plays on it once: the clue and keys swapping from
          their placeholders to the word never fade in a second time. */}
      <div className={styles.below}>
        {!online && phase !== "ready" && <p className={styles.panel}>{copy.offline}</p>}

        {/* While a word is dealt, its card and keys hold their places, so
            nothing on the page moves between one word and the next. */}
        {phase === "loading" && (
          <>
            <section className={styles.clue} aria-busy="true" aria-label={copy.loading}>
              <div className={styles.clueHead}><span className={styles.ghostPill} /></div>
              <p className={styles.hint}>
                <span className={styles.ghostLine} />
                <span className={styles.srOnly}>{copy.loading}</span>
              </p>
              <div
                className={styles.word}
                data-chinese={isChinese ? "true" : "false"}
                style={{ "--letters": ghostLetters } as React.CSSProperties}
                aria-hidden="true"
              >
                {Array.from({ length: ghostLetters }, (_, index) => <span key={index} className={styles.slot} data-ghost="true" />)}
              </div>
            </section>
            <div className={styles.dock} aria-hidden="true">
              <div className={styles.keyboard} data-chinese={isChinese ? "true" : "false"}>
                {(isChinese ? [Array.from({ length: 16 }, (_, index) => String(index))] : rows).map((row, rowIndex) => (
                  <div key={rowIndex} className={styles.keyRow} data-accents={!isChinese && rowIndex === 3 ? "true" : "false"}>
                    {row.map(char => <span key={char} className={styles.key} data-ghost="true">{isChinese ? "" : char}</span>)}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

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
                <span className={styles.rewardChip}>
                  <EnergyCookie className={styles.rewardCookie} />
                  {fill(isChinese ? copy.rewardChar : copy.rewardLetter, { count: round.rewards.letter })}
                  <i aria-hidden="true">·</i>
                  {fill(copy.rewardWord, { count: round.rewards.word })}
                </span>
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
              {round.slots.map((slot, index) => {
                const missed = round.status === "lost" && !!slot.char && !round.guessed.includes(slot.char.toLocaleLowerCase());
                /* Turned over by this guess (or, lost, shown at the end): each
                   such place flips in a beat after the one before. */
                const fresh = !!slot.char && (missed || slot.char.toLocaleLowerCase() === lastGuess);
                const flip = fresh ? flipCount++ : 0;
                return slot.letter ? (
                <span
                  key={index}
                  className={styles.slot}
                  data-filled={slot.char ? "true" : "false"}
                  data-missed={missed ? "true" : "false"}
                  data-fresh={fresh ? "true" : "false"}
                  style={fresh ? { "--flip-delay": `${flip * 90}ms` } as React.CSSProperties : undefined}
                >
                  {slot.char ?? <span className={styles.srOnly}>{copy.hidden}</span>}
                </span>
              ) : (
                <span key={index} className={styles.gap}>{slot.char === " " ? " " : slot.char}</span>
              );
              })}
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
                      const latest = char === lastGuess;
                      return (
                        <button
                          key={char}
                          type="button"
                          className={styles.key}
                          data-hangyumi-key={char}
                          data-used={used}
                          data-latest={latest ? "true" : "false"}
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
                {game === "wordvault" && round.status === "won" && round.chestReward && round.chestReward.tier !== "normal" && (() => {
                  const reward = round.chestReward;
                  const piece = shopItem(reward.item);
                  return (
                    <div className={styles.chestReward} data-tier={reward.tier}>
                      <p className={styles.answerLabel}>
                        {t.wordvault.rewardTitle} · {reward.tier === "medium" ? t.wordvault.chestMedium : t.wordvault.chestPremium}
                      </p>
                      {reward.cookies > 0 && (
                        <p className={styles.rewardCookies}>
                          <EnergyCookie className={styles.rewardCookie} />
                          {fill(t.wordvault.rewardCookies, { count: reward.cookies })}
                        </p>
                      )}
                      {piece ? (
                        <div className={styles.rewardPiece}>
                          <ShopThumb item={piece} className={styles.rewardThumb} />
                          <span>
                            <b>{piece.names[interfaceLanguage]}</b>
                            <small>{reward.limited ? `${t.wordvault.rewardLimited} · ` : ""}{t.wordvault.rewardItem}</small>
                          </span>
                        </div>
                      ) : (
                        <p className={styles.muted}>{t.wordvault.rewardAllOwned}</p>
                      )}
                    </div>
                  );
                })()}
                <p className={styles.answerLabel}>{copy.answer}</p>
                {round.answer && (() => {
                  const mine = gloss?.id === round.id ? gloss : null;
                  /* Without a translation (offline, the day's translations
                     spent), the clue in the display language stands in. */
                  const second = mine?.text
                    ? { text: mine.text, language: mine.language, reading: mine.reading }
                    : mine ? { text: round.hint, language: round.hintLanguage } : null;
                  return (
                    <HangyumiWordCard
                      sides={[{ text: round.answer, language: round.language, reading: round.card?.reading }, ...(second ? [second] : [])]}
                      pending={!second}
                    />
                  );
                })()}
                {saveWord && (() => {
                  const state = saving?.id === round.id ? saving.state : null;
                  const kept = state === "saved" || state === "duplicate";
                  return (
                    <>
                      <button
                        type="button"
                        className={styles.saveWord}
                        data-kept={kept ? "true" : "false"}
                        disabled={kept || state === "saving"}
                        onClick={() => void keepWord()}
                      >
                        {kept
                          ? <BookmarkCheck size={18} strokeWidth={2} aria-hidden="true" />
                          : <BookmarkPlus size={18} strokeWidth={2} aria-hidden="true" />}
                        <span>
                          {state === "saving" ? copy.savingWord
                            : state === "saved" ? copy.savedWord
                              : state === "duplicate" ? copy.alreadySaved
                                : copy.saveWord}
                        </span>
                      </button>
                      {state === "failed" && <p className={styles.saveError} role="alert">{copy.saveFailed}</p>}
                    </>
                  );
                })()}
                <button type="button" className={styles.primary} onClick={nextWord}>{copy.next}</button>
              </section>
            )}
            </div>
          </>
        )}
      </div>

      <div ref={celebrateRef} className={styles.flight} aria-hidden="true" />
      {flash > 0 && <div key={flash} className={styles.missFlash} aria-hidden="true" />}
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
          {game === "wordvault" && <li>{t.wordvault.rules.chests}</li>}
        </ul>
        <button
          type="button"
          role="switch"
          aria-checked={soundOn}
          className={styles.soundSwitch}
          onClick={() => {
            const next = !soundOn;
            setSoundOn(next);
            setSoundsOn(next);
            if (next) {
              unlockSounds();
              sounds.hit();
            }
          }}
        >
          <span>{copy.sound}</span>
          <span className={styles.switchTrack} aria-hidden="true"><span className={styles.switchThumb} /></span>
        </button>
      </BottomSheet>
    </div>
  );
}

/**
 * A number that counts its way to where it is told to be, so cookies
 * landing are seen arriving. Jumps straight there the first time, and
 * under reduced motion.
 */
function useCountUp(target: number | null, reducedMotion: boolean) {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);
  useEffect(() => {
    if (target === null) return;
    const from = shownRef.current;
    if (from === null || reducedMotion || from === target) {
      shownRef.current = target;
      queueMicrotask(() => setShown(target));
      return;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / 650);
      const value = Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3)));
      shownRef.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, reducedMotion]);
  return shown;
}
