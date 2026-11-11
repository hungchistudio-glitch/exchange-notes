"use client";

import { ArrowLeft, ArrowRight, Gift } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import HangyumiGlyph from "@/components/hangyumi/HangyumiGlyph";
import EnergyCookie from "@/components/shop/EnergyCookie";
import useTranslation from "@/hooks/i18n/useTranslation";
import hy from "@/components/hangyumi/Hangyumi.module.css";
import type { CollectionProgress, GamesProgress } from "@/lib/games/progress";
import { WORDVAULT_CHEST_AT } from "@/lib/games/progress";
import { fill } from "@/lib/i18n/format";

import StarweaverGlyph from "./StarweaverGlyph";
import WordvaultGlyph from "./WordvaultGlyph";
import styles from "./GamesHub.module.css";

/* =========================================================
   Yumi's games: one key on Home, then a choice (Chi, 2026-10-26: "保留一
   個遊戲 icon，打開後選 Hangyumi／新遊戲")

   Hangyumi's own signboard over three cards, and the cookies they share:
   today's 333 is one allowance whichever game earns it, because all three
   are paid by the same server functions.

   Since 2026-11-12 (Chi: "同版型、各用遊戲配色", "各遊戲主題入場") the
   three cards are one layout in three games' colours: Hangyumi's ink and
   honey gold, Wordvault's navy and brass, Starweaver's deep space and ice.
   Each has its name and subtitle, one line on how it is played, one on
   what it gives, and how far the reader is towards its next piece.

   They come in once, each in its own way, in about a second:
   - Hangyumi's card is let down on its two ropes and sways to rest.
   - Wordvault's swings open like the chest's lid, and a glint of gold
     crosses it.
   - Starweaver's opens out of a star gate's ring.
   Transforms and opacity only, so the compositor runs them alone. A tap,
   a scroll or a key settles them at once; under reduced motion they are
   simply there.

   They wait for the page to settle first. Arriving from another screen,
   the frames just after the change are the slow ones (the screen left
   behind takes its 3D scene down, this one paints for the first time):
   filmed from Hangyumi's screen, they stalled by 80-160ms even unslowed,
   and a card dropping through them stuttered. So the cards stay hidden
   until three frames in a row come on time, or MOST_WAIT_MS at most
   (about 50ms on a quick phone). Should the page never come alive,
   the stylesheet shows them anyway after a few seconds.
   ========================================================= */

/** From the first frame to the last card at rest (Starweaver's, 300ms late). */
export const ENTRANCE_MS = 1100;
/** The longest the cards wait for the page to settle before coming in. */
export const MOST_WAIT_MS = 220;
/* A frame on time: at 60 frames a second, with a little to spare. */
const ON_TIME_MS = 30;

type Props = {
  /** Today's cookies from either game. */
  loadToday: () => Promise<number>;
  /** The cookies there are to spend. */
  loadBalance?: () => Promise<number>;
  /** How far the reader is towards each game's next piece; null shows no row. */
  loadProgress?: () => Promise<GamesProgress | null>;
  hrefs: { hangyumi: string; wordvault: string; starweaver: string };
  backHref: string;
};

export default function GamesHub({ loadToday, loadBalance, loadProgress, hrefs, backHref }: Props) {
  const { t, locale } = useTranslation();
  const copy = t.games;
  const [earned, setEarned] = useState<number | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  /* undefined while it loads (the row keeps its place), null for none. */
  const [progress, setProgress] = useState<GamesProgress | null | undefined>(loadProgress ? undefined : null);
  const [entrance, setEntrance] = useState<"wait" | "play" | "done">("wait");

  useEffect(() => {
    let cancelled = false;
    void loadToday().then(value => { if (!cancelled) setEarned(value); }, () => {});
    void loadBalance?.().then(value => { if (!cancelled) setBalance(value); }, () => {});
    void loadProgress?.().then(
      value => { if (!cancelled) setProgress(value); },
      () => { if (!cancelled) setProgress(null); },
    );
    return () => { cancelled = true; };
  }, [loadToday, loadBalance, loadProgress]);

  /* In once three frames in a row come on time, or at MOST_WAIT_MS. */
  useEffect(() => {
    if (entrance !== "wait") return;
    const go = () => setEntrance(now => (now === "wait" ? "play" : now));
    const latest = window.setTimeout(go, MOST_WAIT_MS);
    let frame = 0;
    let last = 0;
    let onTime = 0;
    const tick = (now: number) => {
      onTime = last && now - last <= ON_TIME_MS ? onTime + 1 : 0;
      last = now;
      if (onTime >= 2) go();
      else frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(latest);
    };
  }, [entrance]);

  /* Over at the last card's rest, or at the first touch, scroll or key. */
  useEffect(() => {
    if (entrance === "done") return;
    const settle = () => setEntrance("done");
    const timer = entrance === "play" ? window.setTimeout(settle, ENTRANCE_MS) : 0;
    const events = ["pointerdown", "keydown", "wheel", "touchmove"] as const;
    events.forEach(name => window.addEventListener(name, settle, { once: true, capture: true, passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach(name => window.removeEventListener(name, settle, { capture: true }));
    };
  }, [entrance]);

  const games = [
    {
      id: "hangyumi", href: hrefs.hangyumi, name: t.hangyumi.title, subtitle: t.hangyumi.subtitle, glyph: HangyumiGlyph,
      ...copy.hangyumi,
    },
    {
      id: "wordvault", href: hrefs.wordvault, name: t.wordvault.title, subtitle: t.wordvault.subtitle, glyph: WordvaultGlyph,
      ...copy.wordvault,
    },
    {
      id: "starweaver", href: hrefs.starweaver, name: t.starweaver.title, subtitle: t.starweaver.subtitle, glyph: StarweaverGlyph,
      ...copy.starweaver,
    },
  ] as const;

  function progressRow(id: (typeof games)[number]["id"]) {
    if (progress === null) return null;
    if (id === "wordvault") {
      const streak = progress?.wordvault.streak ?? 0;
      const length = progress?.wordvault.streakLength ?? 7;
      return (
        <Progress
          ready={progress !== undefined}
          filled={streak}
          length={length}
          chests={WORDVAULT_CHEST_AT}
          text={fill(copy.wordvault.streak, { count: streak, total: length })}
          label={fill(t.wordvault.streakLabel, { count: streak })}
        />
      );
    }
    const words = id === "hangyumi" ? t.hangyumi.nightscale : t.starweaver;
    const state: CollectionProgress | undefined = progress?.[id];
    const length = state?.cycleLength ?? (id === "hangyumi" ? 3 : 7);
    const held = state?.collectedCount ?? 0;
    const size = state?.collectionSize ?? (id === "hangyumi" ? 24 : 17);
    const done = state?.collectionComplete ?? false;
    return (
      <Progress
        ready={progress !== undefined}
        filled={done ? length : (state?.cycleProgress ?? 0)}
        length={length}
        text={done ? words.collectionComplete : fill(words.collection, { count: held, total: size })}
        label={done
          ? words.collectionComplete
          : fill(words.progressLabel, { count: state?.cycleProgress ?? 0, total: length, held, size })}
      />
    );
  }

  return (
    <div className={`${hy.page} ${styles.hub}`}>
      <header className={`${hy.bar} ${styles.bar}`}>
        <Link href={backHref} className={hy.back} aria-label={copy.back} title={copy.back}>
          <ArrowLeft size={22} strokeWidth={1.9} aria-hidden="true" />
        </Link>
        <div className={hy.signArea}>
          <h1 className={hy.sign}>
            <span className={hy.signHooks} aria-hidden="true" />
            <span className={hy.signName}>{copy.title}</span>
            <span className={hy.signOrbit} aria-hidden="true">
              <span className={hy.signWallet}>
                <EnergyCookie className={hy.signCookie} />
                <b>{balance === null ? "–" : balance.toLocaleString(locale)}</b>
              </span>
              <span className={hy.signToday}>· {earned ?? 0}/333</span>
            </span>
          </h1>
        </div>
      </header>

      <p className={styles.choose}>{copy.choose}</p>
      <ul className={styles.cards} data-entrance={entrance}>
        {games.map(({ id, href, name, subtitle, glyph: Glyph, howTo, reward }) => (
          <li key={id} data-game={id}>
            {id === "hangyumi" && (
              <span className={styles.ropes} aria-hidden="true">
                <span /><span />
              </span>
            )}
            {id === "starweaver" && <span className={styles.gate} aria-hidden="true" />}
            <Link href={href} className={styles.card} data-game={id}>
              {id === "wordvault" && <span className={styles.glint} aria-hidden="true" />}
              <span className={styles.art} aria-hidden="true">
                <Glyph className={styles.glyph} accentClassName={styles.accent} />
              </span>
              <span className={styles.head}>
                <span className={styles.name}>{name}</span>
                <span className={styles.subtitle}>{subtitle}</span>
              </span>
              <ArrowRight className={styles.go} size={20} strokeWidth={1.8} aria-hidden="true" />
              <span className={styles.body}>
                <span className={styles.howTo}>{howTo}</span>
                <span className={styles.reward}>
                  <Gift className={styles.rewardIcon} size={15} strokeWidth={1.9} aria-hidden="true" />
                  <span>{reward}</span>
                </span>
                {progressRow(id)}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className={styles.shared}>
        <EnergyCookie className={styles.sharedCookie} />
        <span>
          {fill(copy.today, { earned: earned ?? 0, cap: 333 })}
          <small>{copy.shared}</small>
        </span>
      </p>
    </div>
  );
}

/* A row of steps to the next piece, then the count. Wordvault's chest
   words are drawn as small chests rather than dots. */
function Progress({ ready, filled, length, chests, text, label }: {
  ready: boolean;
  filled: number;
  length: number;
  chests?: readonly number[];
  text: string;
  label: string;
}) {
  return (
    <span className={styles.progress} data-ready={ready ? "" : undefined} role="img" aria-label={ready ? label : undefined}>
      <span className={styles.steps} aria-hidden="true">
        {Array.from({ length }, (_, index) => (
          <span
            key={index}
            className={styles.step}
            data-on={index < filled ? "" : undefined}
            data-chest={chests?.includes(index + 1) ? "" : undefined}
          />
        ))}
      </span>
      <span className={styles.count} aria-hidden="true">{ready ? text : " "}</span>
    </span>
  );
}
