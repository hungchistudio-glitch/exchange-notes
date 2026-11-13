"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Where a back arrow goes: a page (a link) or a step back within one.
 */
export type PageTitleBack =
  | { href: string; label: string }
  | { onClick: () => void; label: string };

type PageTitleProps = {
  title: string;
  /** The small caps above the title. */
  eyebrow?: string;
  subtitle?: ReactNode;
  /** A feature's mark before the title, where Yumi's key lands (FeatureMark). */
  mark?: ReactNode;
  back?: PageTitleBack;
  /** Sits to the right of the title: a count, a control, a language chip. */
  action?: ReactNode;
  /**
   * No side padding of its own, for a page whose column already has it
   * (Discover's news runs at 22px).
   */
  flush?: boolean;
};

/*
 * The one heading every main page wears (Chi, 2026-11-13: 統一成大標題).
 *
 * There were five. Review, the Pronunciation Lab and Messages had a large
 * title in three different sizes; Notes, Discover and Settings had the
 * sticky 17.5px bar (AppHeader), and Discover had a second, larger "Daily
 * News" under its own. This is the Lab's, which had the most parts: the back
 * arrow at 44px, the small caps, the title with a feature's mark, a line
 * under it and a control to its right. AppHeader stays for the screens one
 * level down (a note, Settings' Devices), where a slim bar that stays put
 * is the right thing.
 */
export const PAGE_TITLE_CLASS =
  "text-[1.75rem] font-bold leading-tight tracking-[-0.025em] sm:text-[1.875rem]";

const BACK_CLASS =
  "-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-black/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

export default function PageTitle({
  title,
  eyebrow,
  subtitle,
  mark,
  back,
  action,
  flush = false,
}: PageTitleProps) {
  return (
    <header
      className={flush ? "" : "px-4 sm:px-6"}
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)" }}
    >
      {back ? (
        "href" in back ? (
          <Link href={back.href} aria-label={back.label} className={BACK_CLASS}>
            <ArrowLeft size={20} strokeWidth={1.9} aria-hidden="true" />
          </Link>
        ) : (
          <button type="button" onClick={back.onClick} aria-label={back.label} className={BACK_CLASS}>
            <ArrowLeft size={20} strokeWidth={1.9} aria-hidden="true" />
          </button>
        )
      ) : null}

      <div className={`${back ? "mt-2" : ""} flex items-start justify-between gap-4`}>
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">
              {eyebrow}
            </p>
          ) : null}

          <h1 className={`mt-1 flex items-center gap-2.5 ${PAGE_TITLE_CLASS}`}>
            {mark}
            <span className="min-w-0">{title}</span>
          </h1>

          {subtitle ? (
            <p className="mt-1.5 text-[0.9375rem] leading-6 text-ink-soft">{subtitle}</p>
          ) : null}
        </div>

        {action ? <div className="shrink-0 pt-1">{action}</div> : null}
      </div>
    </header>
  );
}
