"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import Screen from "@/components/foundation/layout/Screen";

type LabScreenProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  backHref: string;
  backLabel: string;
  /** Sits to the right of the title — a count, a control, a language chip. */
  action?: ReactNode;
  children: ReactNode;
};

/**
 * The shell every Pronunciation Lab screen sits in.
 *
 * Written once so the six modules cannot drift apart in their spacing, their
 * safe-area handling or where their back arrow goes — the failure mode of a
 * feature built as six pages instead of one place with six routes.
 *
 * Desktop is not a wide phone: the content column is capped by Screen, but
 * the header breathes and the grids inside step up to two and three columns
 * at their own breakpoints rather than stretching one column across a
 * monitor.
 */
export default function LabScreen({
  title,
  eyebrow,
  subtitle,
  backHref,
  backLabel,
  action,
  children,
}: LabScreenProps) {
  return (
    <Screen>
      <header
        className="px-4 sm:px-6"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)" }}
      >
        <Link
          href={backHref}
          aria-label={backLabel}
          className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-black/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          <ArrowLeft size={20} strokeWidth={1.9} aria-hidden="true" />
        </Link>

        <div className="mt-2 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                {eyebrow}
              </p>
            ) : null}

            <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-[-0.025em] sm:text-[30px]">
              {title}
            </h1>

            {subtitle ? (
              <p className="mt-1.5 text-[15px] leading-6 text-ink-soft">
                {subtitle}
              </p>
            ) : null}
          </div>

          {action ? <div className="shrink-0 pt-1">{action}</div> : null}
        </div>
      </header>

      <div className="mt-6 px-4 sm:px-6">{children}</div>
    </Screen>
  );
}
