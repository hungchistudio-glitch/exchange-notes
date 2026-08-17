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

/*
 * Signal traffic on the field.
 *
 * Three points of light, each riding its own radius. The two periods per
 * signal are deliberately unrelated to each other: a point that takes 14s to
 * go round but is only visible for a fifth of every 17s comes back at a
 * different place on the ring every time, and the pair does not return to its
 * starting arrangement for nearly four minutes. That is the whole trick behind
 * the brief's "no repetition inside a short cycle" — nothing here is random,
 * and nothing here loops anywhere the eye can follow.
 *
 * Negative delays so the field already has traffic on it when the deck opens,
 * rather than three dots waiting to set off together.
 *
 * The angle is where each one starts, and it is the reason reduced motion can
 * simply stop the rotation: three signals frozen at 34°, 158° and 262° are
 * scattered around the field, where three frozen at 0° would be stacked in a
 * line directly above Yumi and read as a fault.
 */
const SIGNALS: Array<{
  orbit: string;
  cycle: string;
  radius: number;
  angle: string;
  delay: string;
}> = [
  { orbit: "14s", cycle: "17s", radius: 0.31, angle: "34deg", delay: "-3.4s" },
  { orbit: "23s", cycle: "13s", radius: 0.25, angle: "158deg", delay: "-9.1s" },
  { orbit: "19s", cycle: "21s", radius: 0.4, angle: "262deg", delay: "-15.6s" },
];

/*
 * Meteors, near to far.
 *
 * Every value in a row is doing the same job — selling one distance. The near
 * one is long, fast and bright and crosses 520px in two seconds; the far one is
 * short, slow and dim and takes four and a half to cover 320. Read down any
 * column and the ramp is monotonic, which is what stops the four from looking
 * like one meteor drawn four times.
 *
 * The angles differ by a few degrees rather than pointing anywhere, so they
 * read as a shower with its radiant somewhere off the top-left of the screen.
 *
 * Negative delays, staggered against four durations that do not divide, so the
 * sky already has traffic on arrival and the pattern does not come back around
 * for the better part of an hour.
 */
const METEORS: Array<{
  x: string;
  y: string;
  angle: string;
  length: string;
  travel: string;
  peak: string;
  duration: string;
  delay: string;
}> = [
  {
    x: "-18%",
    y: "-8%",
    angle: "30deg",
    length: "86px",
    travel: "520px",
    peak: "0.9",
    duration: "8s",
    delay: "-2.2s",
  },
  {
    x: "30%",
    y: "-14%",
    angle: "26deg",
    length: "68px",
    travel: "440px",
    peak: "0.78",
    duration: "11s",
    delay: "-7.4s",
  },
  {
    x: "-25%",
    y: "34%",
    angle: "22deg",
    length: "54px",
    travel: "380px",
    peak: "0.66",
    duration: "14s",
    delay: "-11.9s",
  },
  {
    x: "55%",
    y: "-10%",
    angle: "34deg",
    length: "42px",
    travel: "320px",
    peak: "0.52",
    duration: "17.5s",
    delay: "-16.1s",
  },
];

/*
 * Where Yumi looks when a system is locked.
 *
 * The six nodes sit at 60° intervals with the first one straight up, so the
 * direction to the one being pressed is just its angle — and the eye can be
 * pointed at it with the same two numbers the ring was built from. The travel
 * is in the mark's own 400-unit space, and it is wider than it is tall because
 * that is the shape of the room the pupil has to move in.
 */
function lookAt(index: number) {
  const radians = ((360 / ROOMS.length) * index * Math.PI) / 180;

  return {
    "--look-x": `${(Math.sin(radians) * 8).toFixed(2)}px`,
    "--look-y": `${(-Math.cos(radians) * 5).toFixed(2)}px`,
  } as CSSProperties;
}

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
        <p className="mt-1 text-ink-soft">{copy.deck.subtitle}</p>

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
        {/*
          The sky, back to front: planets, then stars, then meteors. It sits
          before the stage in the markup and is positioned, so everything in it
          paints behind Yumi and behind the six systems — a meteor crossing the
          deck passes behind the ring rather than over it.
        */}
        <div className={styles.sky} aria-hidden="true">
          <span className={styles.planetNear} />
          <span className={`${styles.planetFar} ${styles.planetFarUpper}`} />
          <span className={`${styles.planetFar} ${styles.planetFarLower}`} />

          {STARS.map(([left, top, delay]) => (
            <span
              key={`${left}-${top}`}
              className={styles.star}
              style={{ left, top, animationDelay: delay }}
            />
          ))}

          {METEORS.map((meteor) => (
            <span
              key={meteor.duration}
              className={styles.meteor}
              style={
                {
                  "--meteor-x": meteor.x,
                  "--meteor-y": meteor.y,
                  "--meteor-angle": meteor.angle,
                  "--meteor-length": meteor.length,
                  "--meteor-travel": meteor.travel,
                  "--meteor-peak": meteor.peak,
                  "--meteor-duration": meteor.duration,
                  "--meteor-delay": meteor.delay,
                } as CSSProperties
              }
            />
          ))}
        </div>

        <div className={styles.stage}>
          <span className={styles.field} aria-hidden="true" />
          <span className={styles.fieldInner} aria-hidden="true" />

          {SIGNALS.map((signal) => (
            <span
              key={signal.orbit}
              className={styles.signal}
              aria-hidden="true"
              style={
                {
                  "--signal-orbit": signal.orbit,
                  "--signal-cycle": signal.cycle,
                  "--signal-radius": signal.radius,
                  "--signal-angle": signal.angle,
                  "--signal-delay": signal.delay,
                } as CSSProperties
              }
            >
              <span className={styles.signalDot} />
            </span>
          ))}

          <div
            className={styles.core}
            data-omni={omniState}
            // The acknowledgement in §9 of the brief. It has a real trigger
            // already: the same press that locks a system — so Yumi answers
            // the press with a ripple and by turning to look at whichever of
            // its six systems the finger is on.
            data-lock={lockedRoom ? "true" : "false"}
            style={
              lockedRoom
                ? lookAt(ROOMS.findIndex((room) => room.key === lockedRoom))
                : undefined
            }
          >
            <span className={styles.coreAura} aria-hidden="true" />
            <span className={styles.coreGlow} aria-hidden="true" />
            <span className={styles.coreHalo} aria-hidden="true" />
            <span className={styles.coreHaloInner} aria-hidden="true" />
            <span className={styles.coreArc} aria-hidden="true" />
            <span className={styles.coreRipple} aria-hidden="true" />

            {/*
              Three wrappers, one transform each, because an element can only
              run one transform animation at a time and this needs four on
              different clocks: the optical correction (static), the drift, the
              tilt, and the breath on the mark itself. Nesting is what lets
              them layer instead of overwrite. See the module CSS.
            */}
            <div className={styles.coreBody}>
              <div className={styles.coreDrift}>
                <div className={styles.coreTilt}>
                  <ExchangeNotesMark
                    cosmic
                    /*
                     * Energy follows what Yumi is actually doing, and the
                     * resting value is deliberately low. A seam that is always
                     * bright says nothing when the moment it was meant to mark
                     * arrives.
                     */
                    energy={
                      omniState === "scanning"
                        ? 1
                        : omniState === "listening"
                          ? 0.65
                          : omniState === "typing"
                            ? 0.4
                            : 0.12
                    }
                    className={styles.coreMark}
                    pupilClassName={styles.pupil}
                    irisClassName={styles.iris}
                    upperLidClassName={styles.upperLid}
                    lowerLidClassName={styles.lowerLid}
                    sweepClassName={styles.coreSweep}
                    gleamClassName={styles.coreGleam}
                  />
                </div>
              </div>
            </div>
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
