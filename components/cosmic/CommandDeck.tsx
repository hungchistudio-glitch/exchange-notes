"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
} from "react";
import Link from "next/link";

import BookIcon from "@/components/foundation/icons/BookIcon";
import MenuScanIcon from "@/components/foundation/icons/MenuScanIcon";
import NavDiscoverIcon from "@/components/foundation/icons/NavDiscoverIcon";
import NavMessagesIcon from "@/components/foundation/icons/NavMessagesIcon";
import NavSettingsIcon from "@/components/foundation/icons/NavSettingsIcon";
import NavVocabularyIcon from "@/components/foundation/icons/NavVocabularyIcon";
import Screen from "@/components/foundation/layout/Screen";
import OmniLexiconConsole, {
  type OmniLexiconState,
} from "@/components/cosmic/OmniLexiconConsole";
import CosmicHomeYumi, { type YumiAttention } from "./CosmicHomeYumi";
import NotesHomeModule from "@/components/notes/NotesHomeModule";
import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import { getLanguage, getLanguageName } from "@/lib/languages";
import useTranslation from "@/hooks/i18n/useTranslation";
import useUnreadMessageCount from "@/hooks/messages/useUnreadMessageCount";
import useVocabularyStats from "@/hooks/useVocabularyStats";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { useVocabulary } from "@/contexts/VocabularyContext";
import { announceOpened, closeWhenOtherOpens } from "@/lib/cosmic/disclosure";
import {
  HOME_RETURN_MS,
  HOME_WAKE_MS,
  arrivalOnMount,
  spendFirstArrival,
  type HomeArrival,
} from "@/lib/cosmic/homeArrival";
import { isLaunching, subscribeToLaunching } from "@/lib/launchState";

import styles from "./CommandDeck.module.css";

type RoomKey = keyof TranslationDictionary["cosmic"]["rooms"];

type Room = {
  key: RoomKey;
  href: string;
  Icon: ComponentType<{ className?: string }>;
};

/*
 * Every room opens a page this app already has. The deck is a different way
 * into the same features, not a second set of them, so nothing here routes
 * anywhere that did not exist in Standard Mode.
 *
 * In reading order: down the left of the orbit, then down the right.
 */
const ROOMS: Room[] = [
  { key: "lexicon", href: "/vocabulary", Icon: NavVocabularyIcon },
  { key: "mission", href: "/review", Icon: BookIcon },
  /* Straight into the Menu Translator, with no bay in between. */
  { key: "scanner", href: "/scanner/menu", Icon: MenuScanIcon },
  { key: "comms", href: "/messages", Icon: NavMessagesIcon },
  { key: "earth", href: "/discover", Icon: NavDiscoverIcon },
  { key: "memory", href: "/profile", Icon: NavSettingsIcon },
];

/** The orbit key's one-time word, once per device (Chi chose "提示一次"). */
const HINT_KEY = "exchange-notes:cosmic-orbit-hint";
const HINT_AFTER_MS = 1100;
const HINT_FOR_MS = 4500;
/** How long taking hold of Yumi keeps the sheen bright. */
const PULSE_MS = 1600;
/** The longest the wake waits for the opening to hand over: past the
    opening's own length and SplashGate's grace, a failsafe only. */
const LAUNCH_WAIT_MS = 8000;

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/*
 * Whether the opening is on the screen now. Not isLaunching(), which reads
 * "launching" until SplashGate has decided, and SplashGate decides after
 * this deck has hydrated: trusting it hid a page the server had already
 * painted, then played it again. The opening's own overlay is decided as
 * the HTML is parsed (a script hides it when it was seen recently), so
 * whether it is drawn is already the answer.
 */
function openingOnScreen() {
  const overlay = document.querySelector("[data-launch-id]");
  return !!overlay && overlay.getClientRects().length > 0;
}

/* The orbit key's mark: a fine ring with three nodes on it. Not Yumi's
   mark, which is the star core's at the foot of the screen. */
function OrbitGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true" focusable="false">
      <ellipse cx="12" cy="12" rx="9" ry="6.2" transform="rotate(-14 12 12)" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="4.2" cy="14.2" r="1.7" fill="currentColor" />
      <circle cx="16.6" cy="6.2" r="1.7" fill="currentColor" />
      <circle cx="18.4" cy="15.6" r="1.7" fill="currentColor" />
    </svg>
  );
}

/**
 * The Cosmic home: the obsidian bridge (Chi, 2026-11-12).
 *
 * One quiet instrument with Yumi at its centre. Top to bottom on a phone:
 * the bar the corner keys sit on, one line of real readings, Yumi's stage,
 * the search, and the reader's notes. The six features fold into an orbit
 * key on the stage and open around her on a fine, tilted orbit; the star
 * core at the foot of the screen stays as it is, and only one of the two
 * is ever open (lib/cosmic/disclosure.ts).
 *
 * Every number on it is one the app genuinely holds: words saved, reviews
 * due, messages unread. Nothing invents a reading, and nothing says "every
 * system online" over a page that is still loading.
 *
 * It owns its own arrival (lib/cosmic/homeArrival.ts): the full wake once
 * per app runtime, a short fade on the way back from another page, nothing
 * under the mode switch's own sequence or under reduced motion. RouteStage
 * leaves it alone (`data-own-arrival="whole"`). The arrival is an attribute
 * set on the root rather than React state, so it never re-renders the deck
 * and a hydrated page keeps what the server painted.
 */
export default function CommandDeck() {
  // Which language is being learned, not which one the interface is in.
  const { learningLanguage } = useLearningLanguageContext();

  /* The app-wide library, not a second fetch of it. */
  const { items, loading: itemsLoading } = useVocabulary();
  const { reviewStats } = useVocabularyStats(items);
  const { unreadCount } = useUnreadMessageCount();
  const { modeTransition } = useInterfaceMode();
  const launching = useSyncExternalStore(subscribeToLaunching, isLaunching, () => true);

  /* What the console is doing, so Yumi can react to it. */
  const [omniState, setOmniState] = useState<OmniLexiconState>("idle");
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(false);
  /* The search field's real focus, not a query left in it: what she looks at. */
  const [searchFocused, setSearchFocused] = useState(false);

  const { t, language: interfaceLanguage, locale } = useTranslation();
  const copy = t.cosmic;
  const roomsId = useId();

  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const pulseTimer = useRef(0);
  const keyRef = useRef<HTMLButtonElement>(null);
  const roomsRef = useRef<HTMLElement>(null);
  /* Read once, as the deck first renders: the server paints "full", and so
     does the first client render of a fresh runtime. */
  const [initialArrival] = useState<HomeArrival>(() => arrivalOnMount());
  const modeTransitionRef = useRef(modeTransition);

  /* The arrival, decided once as the deck mounts, before the first paint. */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const first = initialArrival === "full";
    spendFirstArrival();
    if (reducedMotion() || modeTransitionRef.current) root.dataset.arrival = "none";
    else if (first && openingOnScreen()) root.dataset.arrival = "waiting";
  }, [initialArrival]);

  /* Waiting for the opening to hand over, then the wake; and never longer
     than LAUNCH_WAIT_MS, whatever the opening does (a page with no opening
     at all, an opening that never says it is done). */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || root.dataset.arrival !== "waiting") return;
    if (!launching) {
      root.dataset.arrival = "full";
      return;
    }
    const giveUp = window.setTimeout(() => {
      if (root.dataset.arrival === "waiting") root.dataset.arrival = "full";
    }, LAUNCH_WAIT_MS);
    return () => window.clearTimeout(giveUp);
  }, [launching]);

  /* Done: the arrival's rules come off, so nothing of it can linger. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let timer = 0;
    const settle = () => {
      const arrival = root.dataset.arrival;
      if (arrival !== "full" && arrival !== "return") return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        root.dataset.arrival = "none";
      }, arrival === "full" ? HOME_WAKE_MS : HOME_RETURN_MS);
    };
    settle();
    const watch = new MutationObserver(settle);
    watch.observe(root, { attributes: true, attributeFilter: ["data-arrival"] });
    return () => {
      watch.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  /* A touch, a key or a focus during the arrival finishes it at once: never
     a field that can be typed in but not yet seen. */
  function arriveNow() {
    const root = rootRef.current;
    if (root && root.dataset.arrival !== "none") root.dataset.arrival = "none";
  }

  /* Taking hold of Yumi brightens the sheen for a moment, as the search
     and the orbit do for as long as they are in use. */
  function pulse() {
    const backdrop = backdropRef.current;
    if (!backdrop) return;
    backdrop.dataset.pulse = "";
    window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => {
      delete backdrop.dataset.pulse;
    }, PULSE_MS);
  }
  useEffect(() => () => window.clearTimeout(pulseTimer.current), []);

  /* The other set of six opening closes this one. */
  useEffect(() => closeWhenOtherOpens("home-orbit", () => setOpen(false)), []);

  /* Closing: a tap anywhere else (not a drag of Yumi), or Escape. */
  useEffect(() => {
    if (!open) return;
    let downAt: { x: number; y: number } | null = null;
    const down = (event: PointerEvent) => { downAt = { x: event.clientX, y: event.clientY }; };
    const click = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && (roomsRef.current?.contains(target) || keyRef.current?.contains(target))) return;
      const moved = downAt ? Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) : 0;
      if (moved > 8) return;
      setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      keyRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("click", click, true);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("click", click, true);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  /* The one-time word beside the key, once the wake is over. */
  useEffect(() => {
    let seen = true;
    try {
      seen = window.localStorage.getItem(HINT_KEY) !== null;
    } catch {
      /* No storage: never shown, rather than shown on every visit. */
    }
    if (seen) return;
    const show = window.setTimeout(() => {
      try {
        window.localStorage.setItem(HINT_KEY, `${Date.now()}`);
      } catch {
        /* Shown once this visit regardless. */
      }
      setHint(true);
    }, HINT_AFTER_MS);
    const hide = window.setTimeout(() => setHint(false), HINT_AFTER_MS + HINT_FOR_MS);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, []);

  function toggle() {
    setHint(false);
    if (!open) announceOpened("home-orbit");
    setOpen(!open);
  }

  function consoleState(state: OmniLexiconState) {
    setOmniState(state);
    /* Searching, listening or reading a picture: the orbit steps aside. */
    if (state !== "idle") setOpen(false);
  }

  const count = (value: number) => (itemsLoading ? "—" : value.toLocaleString(locale));

  /* Stage two (Chi, 2026-11-12): what Yumi attends to, by precedence. */
  const attention: YumiAttention =
    omniState === "listening" ? "listening"
      : omniState === "scanning" ? "scanning"
        : searchFocused ? "search"
          : "idle";

  return (
    <Screen contentClassName={styles.content}>
      <div
        ref={rootRef}
        className={styles.bridge}
        data-arrival={initialArrival}
        data-own-arrival="whole"
        onPointerDownCapture={arriveNow}
        onKeyDownCapture={arriveNow}
        onFocusCapture={arriveNow}
      >
        {/* The obsidian's sheen (Chi, 2026-11-12: "黑曜石流光", over the
            whole home, very faint): one band of ice light gliding across
            it every fourteen seconds, and brighter, with one quick pass,
            while the search, the voice, a picture, the orbit or Yumi is in
            use. Drawn once; only its position moves. */}
        <span
          ref={backdropRef}
          className={styles.backdrop}
          aria-hidden="true"
          data-active={omniState !== "idle" || open ? "" : undefined}
        >
          <span className={styles.sheen} />
          <span className={styles.sheenQuick} />
        </span>
        <header
          className={styles.toolbar}
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 18px)" }}
        >
          <p className={styles.identity} data-arrive="text">
            <span aria-hidden="true" className={styles.identityDot} />
            <span className={styles.identityName}>{copy.deck.eyebrow}</span>
          </p>
          <h1 className="sr-only">{copy.deck.title}</h1>
        </header>

        {/* One line of what the app actually holds: no gauge, no dial. A
            dash while it loads, never a 0 that is not true yet. */}
        <dl className={styles.status} data-arrive="text">
          <div className={styles.reading}>
            <dt>{copy.deck.readoutLexicon}</dt>
            <dd>{count(items.length)}</dd>
          </div>
          <div className={styles.reading}>
            <dt>{copy.deck.readoutLearning}</dt>
            <dd>
              <span className={styles.badge} aria-hidden="true">
                {getLanguage(learningLanguage).badge}
              </span>
              <span className={styles.language}>
                {getLanguageName(learningLanguage, interfaceLanguage)}
              </span>
            </dd>
          </div>
          <div className={styles.reading}>
            <dt>{copy.deck.readoutDue}</dt>
            <dd>{count(reviewStats.due)}</dd>
          </div>
        </dl>

        <section
          ref={stageRef}
          className={styles.stage}
          aria-label={copy.deck.coreLabel}
          data-orbit={open ? "open" : "closed"}
          data-omni={omniState}
          onPointerDown={pulse}
        >
          <span className={styles.pool} aria-hidden="true" />
          <span className={styles.orbit} aria-hidden="true">
            <span className={styles.orbitLine} />
            <span className={styles.voiceRing} />
            <span className={styles.sweep} />
          </span>

          <div className={styles.yumi} data-arrive="yumi">
            <CosmicHomeYumi
              paused={omniState !== "idle"}
              fit="stage"
              shrink={open}
              attention={attention}
              holdRest={open || searchFocused}
              glowRef={stageRef}
            />
          </div>

          <nav
            ref={roomsRef}
            id={roomsId}
            className={styles.rooms}
            aria-label={copy.deck.roomsLabel}
            aria-hidden={!open}
            inert={!open}
          >
            <ul className={styles.roomList}>
              {ROOMS.map((room) => {
                const roomCopy = copy.rooms[room.key];
                /* One clear name each (Chi chose the familiar ones); the
                   Menu Translator's own name is the familiar one. */
                const label = room.key === "scanner" ? roomCopy.name : roomCopy.familiar;
                const unread = room.key === "comms" && unreadCount > 0 ? unreadCount : 0;
                return (
                  <li key={room.key} className={styles.room} data-room={room.key}>
                    <Link
                      href={room.href}
                      className={styles.roomLink}
                      onClick={() => setOpen(false)}
                      aria-label={
                        unread
                          ? `${label} — ${copy.status.unreadMessages.replace("{count}", String(unread))}`
                          : label
                      }
                    >
                      <span className={styles.roomDisc} aria-hidden="true">
                        <room.Icon className={styles.roomIcon} />
                        {unread ? <span className={styles.roomBadge}>{unread > 99 ? "99+" : unread}</span> : null}
                      </span>
                      <span className={styles.roomName} aria-hidden="true">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <button
            ref={keyRef}
            type="button"
            className={styles.orbitKey}
            aria-expanded={open}
            aria-controls={roomsId}
            aria-label={open ? copy.deck.orbitClose : copy.deck.orbitOpen}
            title={open ? copy.deck.orbitClose : copy.deck.orbitOpen}
            data-coach-target="cosmic-orbit-key"
            onClick={toggle}
          >
            <OrbitGlyph />
          </button>
          {hint ? (
            <p className={styles.hint} role="status">
              {copy.deck.orbitHint}
            </p>
          ) : null}
        </section>

        <div
          className={styles.search}
          data-arrive="text"
          onFocusCapture={(event) => {
            if ((event.target as HTMLElement).tagName === "INPUT") setSearchFocused(true);
          }}
          onBlurCapture={(event) => {
            if ((event.target as HTMLElement).tagName === "INPUT") setSearchFocused(false);
          }}
        >
          <OmniLexiconConsole onStateChange={consoleState} />
        </div>

        <div className={styles.notes} data-arrive="text">
          <NotesHomeModule />
        </div>
      </div>
    </Screen>
  );
}
