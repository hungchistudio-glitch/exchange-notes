"use client";

import type { ReactNode } from "react";

import FeatureMark from "@/components/features/FeatureMark";
import PageTitle from "@/components/foundation/layout/PageTitle";
import Screen from "@/components/foundation/layout/Screen";

type LabScreenProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  backHref: string;
  backLabel: string;
  /** Sits to the right of the title — a count, a control, a language chip. */
  action?: ReactNode;
  /** The Lab's landing wears Speak's mark, where Yumi's key lands. */
  featureMark?: boolean;
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
  featureMark = false,
  children,
}: LabScreenProps) {
  return (
    <Screen>
      <PageTitle
        title={title}
        eyebrow={eyebrow}
        subtitle={subtitle}
        back={{ href: backHref, label: backLabel }}
        action={action}
        mark={featureMark ? <FeatureMark feature="speak" /> : null}
      />

      <div className="mt-6 px-4 sm:px-6">{children}</div>
    </Screen>
  );
}
