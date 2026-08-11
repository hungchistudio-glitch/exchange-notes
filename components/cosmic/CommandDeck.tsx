"use client";

import {
  useEffect,
  useState,
  type ComponentType,
  type CSSProperties,
  type PointerEvent,
} from "react";
import Link from "next/link";

import BookIcon from "@/components/foundation/icons/BookIcon";
import CameraIcon from "@/components/foundation/icons/CameraIcon";
import NavDiscoverIcon from "@/components/foundation/icons/NavDiscoverIcon";
import NavMessagesIcon from "@/components/foundation/icons/NavMessagesIcon";
import NavSettingsIcon from "@/components/foundation/icons/NavSettingsIcon";
import NavVocabularyIcon from "@/components/foundation/icons/NavVocabularyIcon";
import Screen from "@/components/foundation/layout/Screen";
import OmniLexiconConsole, {
  type OmniLexiconState,
} from "@/components/cosmic/OmniLexiconConsole";
import ExchangeNotesMark from "@/components/ui/ExchangeNotesMark";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import useUnreadMessageCount from "@/hooks/messages/useUnreadMessageCount";
import useVocabularyStats from "@/hooks/useVocabularyStats";
import type { TranslationDictionary } from "@/lib/i18n/types";
import type { VocabularyItem } from "@/lib/types/app";
import { fetchVocabulary, getCurrentUser } from "@/lib/vocabulary/repository";

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
 */
const ROOMS: Room[] = [
  { key: "lexicon", href: "/vocabulary", Icon: NavVocabularyIcon },
  { key: "mission", href: "/review", Icon: BookIcon },
  { key: "scanner", href: "/capture", Icon: CameraIcon },
  { key: "comms", href: "/messages", Icon: NavMessagesIcon },
  { key: "earth", href: "/discover", Icon: NavDiscoverIcon },
  { key: "memory", href: "/profile", Icon: NavSettingsIcon },
];

// Twelve hand-placed points rather than a generated field. See the .stars note
// in CommandDeck.module.css for why the count is fixed.
const STARS: Array<[left: string, top: string, delay: string]> = [
  ["12%", "18%", "0s"],
  ["78%", "12%", "1.4s"],
  ["31%", "8%", "2.9s"],
  ["88%", "34%", "0.7s"],
  ["6%", "47%", "3.6s"],
  ["94%", "62%", "2.1s"],
  ["21%", "76%", "1.1s"],
  ["69%", "88%", "3.1s"],
  ["45%", "94%", "0.4s"],
  ["84%", "79%", "2.5s"],
  ["9%", "88%", "1.8s"],
  ["57%", "5%", "4.2s"],
];

/**
 * The Yumi Command Deck — the home of Yumi Cosmic Mode.
 *
 * Yumi sits at the centre with the app's six main systems on a ring around
 * it. Every number shown on a node is one the app genuinely knows: words
 * actually saved, reviews actually due, messages actually unread. Nothing
 * here invents a reading to look technical.
 */
export default function CommandDeck() {
  const { t } = useTranslation();
  const copy = t.cosmic;
  // Which language is being learned, not which one the interface is in — the
  // two stay separate here as everywhere else.
  const { isLearningChinese } = useLearningLanguageContext();

  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const { reviewStats } = useVocabularyStats(items);
  const { unreadCount } = useUnreadMessageCount();
  const [lockedRoom, setLockedRoom] = useState<RoomKey | null>(null);
  /*
   * What the console is doing, so Yumi can react to it. This is the whole of
   * the brief's "OmniLexicon and Yumi must interact": the eye looks up at the
   * console while it is being used and turns to the user while it listens.
   */
  const [omniState, setOmniState] = useState<OmniLexiconState>("idle");

  /*
   * The lock, and the direction the room will open from.
   *
   * On pointer down rather than on click, which is what makes it read as a
   * targeting system instead of a page transition: the ring closes under the
   * finger while it is still down, and the deck's departing snapshot is taken
   * with the lock already on it. No artificial delay is inserted before the
   * navigation — the whole beat happens inside the press the user is already
   * making.
   *
   * A pointer down that never becomes a tap leaves the lock showing until the
   * pointer is released, which is the correct read: the system stays targeted
   * for exactly as long as the finger is on it.
   */
  function lockRoom(key: RoomKey, event: PointerEvent<HTMLAnchorElement>) {
    setLockedRoom(key);

    const bounds = event.currentTarget.getBoundingClientRect();

    document.documentElement.style.setProperty(
      "--deck-origin-x",
      `${Math.round(bounds.left + bounds.width / 2 - window.innerWidth / 2)}px`,
    );

    document.documentElement.style.setProperty(
      "--deck-origin-y",
      `${Math.round(bounds.top + bounds.height / 2 - window.innerHeight / 2)}px`,
    );
  }

  useEffect(() => {
    let active = true;

    async function load() {
      const { user } = await getCurrentUser();

      if (!user) {
        if (active) setItemsLoading(false);
        return;
      }

      const vocabulary = await fetchVocabulary(user.id);

      if (!active) return;

      setItems((vocabulary ?? []) as VocabularyItem[]);
      setItemsLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  function statusFor(key: RoomKey) {
    if (key === "lexicon") {
      return itemsLoading
        ? copy.status.loading
        : copy.status.wordsSaved.replace("{count}", String(items.length));
    }

    if (key === "mission") {
      if (itemsLoading) return copy.status.loading;

      return reviewStats.due === 0
        ? copy.status.nothingDue
        : copy.status.dueNow.replace("{count}", String(reviewStats.due));
    }

    if (key === "comms" && unreadCount > 0) {
      return copy.status.unreadMessages.replace("{count}", String(unreadCount));
    }

    return null;
  }

  return (
    <Screen>
      <div
        className="px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)" }}
      >
        <p className="hud-label">{copy.deck.eyebrow}</p>
        <h1 className="mt-1 text-[26px] font-bold tracking-[-0.02em]">
          {copy.deck.title}
        </h1>
        <p className="mt-1 text-black/50">{copy.deck.subtitle}</p>

        {/*
          The bridge readout, in place of the reference's side panels — there
          is no room for those on a phone, and this is the part of them worth
          keeping. Three lines, each one a fact the app actually holds: how
          many words are in the lexicon, how many are due, and which language
          is being learned. Nothing here is bearing, bandwidth or range.
        */}
        <dl className="mt-4 grid grid-cols-3 gap-x-3 gap-y-1 border-y border-line py-2.5">
          {[
            {
              label: copy.deck.readoutLexicon,
              value: itemsLoading ? "—" : String(items.length),
            },
            {
              label: copy.deck.readoutDue,
              value: itemsLoading ? "—" : String(reviewStats.due),
            },
            {
              label: copy.deck.readoutLearning,
              value: isLearningChinese
                ? copy.deck.languageChinese
                : copy.deck.languageEnglish,
            },
          ].map((readout) => (
            <div key={readout.label}>
              <dt className="hud-label">{readout.label}</dt>
              <dd className="mt-0.5 text-sm font-bold tracking-[-0.01em]">
                {readout.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/*
        The deck answers three questions, top to bottom: "what is this thing I
        just saw?", "where do I want to go?", and — in the dock — "take me
        there, I already know". The console is the first of those and sits
        above the orbit because identifying something unknown is the action
        people arrive with, while the six systems are where they go once they
        already know what they want.
      */}
      <div className="mt-4 px-4">
        <OmniLexiconConsole onStateChange={setOmniState} />
      </div>

      <nav
        className={styles.deck}
        aria-label={copy.deck.roomsLabel}
        data-omni={omniState}
      >
        <div className={styles.stars} aria-hidden="true">
          {STARS.map(([left, top, delay]) => (
            <span
              key={`${left}-${top}`}
              className={styles.star}
              style={{ left, top, animationDelay: delay }}
            />
          ))}
        </div>

        <div className={styles.stage}>
          <span className={styles.field} aria-hidden="true" />
          <span className={styles.fieldInner} aria-hidden="true" />

          <div className={styles.core} data-omni={omniState}>
            <span className={styles.coreGlow} aria-hidden="true" />
            <ExchangeNotesMark
              className={styles.coreMark}
              pupilClassName={styles.pupil}
              upperLidClassName={styles.upperLid}
              lowerLidClassName={styles.lowerLid}
            />
            <span className="sr-only">{copy.deck.coreLabel}</span>
          </div>

          {ROOMS.map((room, index) => {
            const roomCopy = copy.rooms[room.key];
            const status = statusFor(room.key);

            return (
              <div
                key={room.key}
                className={styles.node}
                style={
                  {
                    "--angle": `${(360 / ROOMS.length) * index}deg`,
                    // Each instrument on its own radar cycle. Negative, so
                    // they are already mid-cycle on arrival rather than all
                    // waiting to start together.
                    "--node-radar-delay": `${-index * 0.93}s`,
                  } as CSSProperties
                }
              >
                <div className={styles.nodeInner}>
                  <Link
                    href={room.href}
                    /*
                     * The type is what the route stage reads to decide which
                     * of the six arrivals to play. See CosmicRouteStage.
                     *
                     * Scanner Bay is the exception: it lands on a full-screen
                     * camera, which opens its own lens — that is already the
                     * transition. And a view transition that fails to settle
                     * leaves its snapshot above the page, so the camera would
                     * be visible with none of its controls responding. Not
                     * worth the risk for a flourish nobody sees behind a
                     * viewfinder.
                     */
                    transitionTypes={
                      room.key === "scanner"
                        ? undefined
                        : [`room-${room.key}`]
                    }
                    onPointerDown={(event) => lockRoom(room.key, event)}
                    onPointerUp={() => setLockedRoom(null)}
                    onPointerCancel={() => setLockedRoom(null)}
                    className={[
                      styles.nodeLink,
                      lockedRoom === room.key ? styles.nodeLocked : "",
                      lockedRoom && lockedRoom !== room.key
                        ? styles.nodeDimmed
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    // The description lives here rather than in a second
                    // visible list of the same six rooms. The ring is the
                    // deck; repeating it underneath cost more space than
                    // the hero it was explaining.
                    aria-label={`${roomCopy.name} — ${roomCopy.familiar}. ${roomCopy.description}`}
                    title={roomCopy.description}
                  >
                    <span className={styles.nodeDisc}>
                      <room.Icon className="h-5 w-5" />
                    </span>

                    <span className={styles.nodeName}>{roomCopy.name}</span>
                    <span className={styles.nodeFamiliar}>
                      {status ?? roomCopy.familiar}
                    </span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </nav>

    </Screen>
  );
}
