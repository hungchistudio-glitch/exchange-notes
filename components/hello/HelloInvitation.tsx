"use client";

import { useReducer, type ReactNode } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import { fill } from "@/lib/i18n/format";
import { initialViewerPair, viewerPairReducer } from "@/lib/hello/pairs";
import type { HelloSnapshot } from "@/lib/hello/types";
import type { LanguageCode } from "@/lib/languages";

import HelloCard from "./HelloCard";
import HelloYumi from "./HelloYumi";
import styles from "./Hello.module.css";

/* =========================================================
   The invitation

   Read top to bottom the way a visitor meets it: whose Yumi this is, that
   she has brought a word, her, the word in two languages, and what to do
   next. Everything above the actions is the hello itself, the same for
   every visitor; the actions are the one part that depends on who is
   looking, and are handed in by the screen (HelloActions).

   The visitor's two languages live here, for this visit only, and start
   as the sharer's: switching them never touches the hello, the sharer's
   settings or the visitor's own (lib/hello/pairs.ts).
   ========================================================= */

type HelloInvitationProps = {
  hello: HelloSnapshot;
  actions?: ReactNode;
  /** Made on a development or preview build, not the live site. */
  test?: boolean;
  /** Shown above everything on the review screen, so a sample is never
   *  mistaken for a reader's invitation. */
  banner?: ReactNode;
  onRetryMissing?: (language: LanguageCode) => void;
  retrying?: ReadonlySet<LanguageCode>;
  /** What a side not made yet says, where that is expected (the editor's preview). */
  missingNote?: string;
  /** Inside another screen — the editor's preview — rather than a page. */
  embedded?: boolean;
};

/** The sender as a visitor knows them: nickname, else public Exchange ID. */
export function senderName(hello: HelloSnapshot): string {
  return hello.sender.name?.trim() || `@${hello.sender.exchangeId}`;
}

export default function HelloInvitation({
  hello,
  actions,
  test = false,
  banner,
  onRetryMissing,
  retrying,
  missingNote,
  embedded = false,
}: HelloInvitationProps) {
  const { t } = useTranslation();
  const copy = t.hello;
  const [pair, dispatch] = useReducer(viewerPairReducer, hello.pair, initialViewerPair);
  const name = senderName(hello);
  /* A page is its own main landmark; a preview sits inside someone else's. */
  const Root = embedded ? "div" : "main";

  return (
    <Root className={styles.look} data-look={hello.yumi.mode} data-embedded={embedded ? "" : undefined}>
      <div className={styles.pass}>
        {banner}
        <article className={styles.sheet} aria-labelledby={`hello-${hello.id}`}>
          <header className={styles.header}>
            <span className={styles.mark}>Station 33</span>
            <span className={styles.serial} aria-hidden="true">
              № {hello.id.slice(0, 6).toUpperCase()}
            </span>
          </header>

          <div className={styles.greeting}>
            <h1 id={`hello-${hello.id}`} className={styles.greetingLine}>
              {fill(copy.greeting, { name })}
            </h1>
            <p className={styles.giftLine}>{copy.gift}</p>
          </div>

          <HelloYumi
            outfit={hello.yumi.outfit}
            complete={hello.yumi.complete}
            look={hello.yumi.mode}
            posterUrl={hello.yumi.posterUrl}
            label={fill(copy.yumiAlt, { name })}
            dragHint={copy.dragHint}
          />

          <div className={styles.arrive}>
            <HelloCard
              sense={hello.sense}
              pair={pair}
              onPair={dispatch}
              onRetryMissing={onRetryMissing}
              retrying={retrying}
              missingNote={missingNote}
            />
          </div>

          {test ? <p className={styles.testBadge}>{copy.testLink}</p> : null}

          {actions ? <div className={styles.actions}>{actions}</div> : null}

          <p className={styles.footnote}>{copy.privacyNote}</p>
        </article>
      </div>
    </Root>
  );
}

/** An invitation that cannot be shown: turned off, or not there. */
export function HelloGone({ status, action }: { status: "revoked" | "missing"; action: ReactNode }) {
  const { t } = useTranslation();
  const copy = t.hello;
  return (
    <main className={styles.look} data-look="standard">
      <div className={styles.pass}>
        <section className={`${styles.sheet} ${styles.gone}`}>
          <span className={styles.mark}>Station 33</span>
          <h1>{status === "revoked" ? copy.revokedTitle : copy.missingTitle}</h1>
          <p>{status === "revoked" ? copy.revokedBody : copy.missingBody}</p>
          {action}
        </section>
      </div>
    </main>
  );
}
