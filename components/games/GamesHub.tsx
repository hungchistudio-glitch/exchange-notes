"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import HangyumiGlyph from "@/components/hangyumi/HangyumiGlyph";
import EnergyCookie from "@/components/shop/EnergyCookie";
import useTranslation from "@/hooks/i18n/useTranslation";
import hy from "@/components/hangyumi/Hangyumi.module.css";
import { fill } from "@/lib/i18n/format";

import WordvaultGlyph from "./WordvaultGlyph";
import styles from "./GamesHub.module.css";

/* =========================================================
   Yumi's games: one key on Home, then a choice (Chi, 2026-10-26: "保留一
   個遊戲 icon，打開後選 Hangyumi／新遊戲")

   Hangyumi's own signboard over two cards, the studio's ivory and the
   vault's navy, and the cookies the two share: today's 333 is one
   allowance whichever game earns it, because both are paid by the same
   server functions.
   ========================================================= */

type Props = {
  /** Today's cookies from either game. */
  loadToday: () => Promise<number>;
  /** The cookies there are to spend. */
  loadBalance?: () => Promise<number>;
  hrefs: { hangyumi: string; wordvault: string };
  backHref: string;
};

export default function GamesHub({ loadToday, loadBalance, hrefs, backHref }: Props) {
  const { t, locale } = useTranslation();
  const copy = t.games;
  const [earned, setEarned] = useState<number | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadToday().then(value => { if (!cancelled) setEarned(value); }, () => {});
    void loadBalance?.().then(value => { if (!cancelled) setBalance(value); }, () => {});
    return () => { cancelled = true; };
  }, [loadToday, loadBalance]);

  const games = [
    { id: "hangyumi", href: hrefs.hangyumi, name: t.hangyumi.title, subtitle: null, glyph: HangyumiGlyph, ...copy.hangyumi },
    { id: "wordvault", href: hrefs.wordvault, name: t.wordvault.title, subtitle: t.wordvault.subtitle, glyph: WordvaultGlyph, ...copy.wordvault },
  ] as const;

  return (
    <div className={`${hy.page} ${styles.hub}`}>
      <header className={hy.bar}>
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
      <ul className={styles.cards}>
        {games.map(({ id, href, name, subtitle, glyph: Glyph, tagline, detail }, index) => (
          <li key={id} style={{ "--card-delay": `${80 + index * 90}ms` } as React.CSSProperties}>
            <Link href={href} className={styles.card} data-game={id}>
              <span className={styles.art} aria-hidden="true">
                <Glyph className={styles.glyph} accentClassName={styles.accent} />
              </span>
              <span className={styles.text}>
                <span className={styles.name}>
                  {name}
                  {subtitle && <small>{subtitle}</small>}
                </span>
                <span className={styles.tagline}>{tagline}</span>
                <span className={styles.detail}>{detail}</span>
              </span>
              <ArrowRight className={styles.go} size={20} strokeWidth={1.8} aria-hidden="true" />
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
