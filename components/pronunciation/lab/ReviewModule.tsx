"use client";

import Link from "next/link";
import { useMemo } from "react";

import LabScreen from "@/components/pronunciation/lab/LabScreen";
import YumiCoach from "@/components/pronunciation/lab/YumiCoach";
import { MasteryDot } from "@/components/pronunciation/lab/SoundTile";
import { LabEmpty } from "@/components/pronunciation/lab/StateViews";
import { usePronunciationLab } from "@/contexts/PronunciationLabContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import { fill } from "@/lib/i18n/format";
import {
  getDueUnits,
  getWeaknessMap,
  groupWeaknessByBand,
} from "@/lib/pronunciation/lab/progress";
import type { WeaknessBand, WeaknessEntry } from "@/lib/pronunciation/lab/progress";

/**
 * What is due, and the whole weakness map behind it.
 *
 * Not a random pick and not "everything you have ever seen": a unit comes
 * back when its interval has elapsed, and the interval is set by how well
 * it is known. The map underneath is aggregated from every attempt, which
 * is why a single bad morning does not move a sound into "needs work".
 */
export default function ReviewModule() {
  const { t } = useTranslation();
  const copy = t.pronunciation.lab;

  const { pack, progress } = usePronunciationLab();

  const due = useMemo(() => getDueUnits(pack, progress), [pack, progress]);

  const bands = useMemo(
    () => groupWeaknessByBand(getWeaknessMap(pack, progress)),
    [pack, progress],
  );

  const bandOrder: WeaknessBand[] = ["needsWork", "improving", "strong"];
  const bandLabel: Record<WeaknessBand, string> = {
    needsWork: copy.weakness.needsWork,
    improving: copy.weakness.improving,
    strong: copy.weakness.strong,
  };

  const hasMap = bandOrder.some((band) => bands[band].length > 0);

  return (
    <LabScreen
      title={copy.review.title}
      eyebrow={pack.displayName}
      subtitle={copy.review.subtitle}
      backHref="/pronunciation"
      backLabel={copy.backToLab}
    >
      <div className="space-y-5 pb-8">
        <YumiCoach
          pack={pack}
          state={due.length > 0 ? "waiting" : "idle"}
          size={92}
        />

        <section className="rounded-[26px] border border-black/[0.06] bg-white p-5">
          {due.length === 0 ? (
            <>
              <p className="text-[17px] font-semibold">{copy.review.nothingDue}</p>
              <p className="font-cjk mt-1.5 text-sm leading-6 text-ink-soft">
                {copy.review.nothingDueHint}
              </p>
              <Link
                href="/pronunciation/sounds"
                className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-full border border-line px-6 text-sm font-semibold text-ink-strong transition-colors hover:bg-black/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                {copy.sounds.title}
              </Link>
            </>
          ) : (
            <>
              <p className="text-[17px] font-semibold">
                {fill(copy.review.due, { count: due.length })}
              </p>

              <ul className="mt-3 flex flex-wrap gap-2">
                {due.slice(0, 12).map((unit) => (
                  <li key={unit.id}>
                    <Link
                      href={`/pronunciation/sounds/${encodeURIComponent(unit.id)}`}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-surface px-4 text-[15px] font-semibold transition-colors hover:bg-black/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                      <MasteryDot
                        mastery={progress[unit.id]?.mastery ?? "new"}
                        label={copy.mastery[progress[unit.id]?.mastery ?? "new"]}
                      />
                      {unit.symbol}
                    </Link>
                  </li>
                ))}
              </ul>

              <Link
                href="/pronunciation/train?source=review"
                className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-black text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                {copy.review.start}
              </Link>
            </>
          )}
        </section>

        <section
          aria-label={copy.weakness.title}
          className="rounded-[26px] border border-black/[0.06] bg-white p-5"
        >
          <h2 className="text-lg font-bold tracking-[-0.02em]">
            {copy.weakness.title}
          </h2>
          <p className="font-cjk mt-1 text-xs leading-5 text-ink-faint">
            {copy.weakness.description}
          </p>

          {!hasMap ? (
            <div className="mt-4">
              <LabEmpty title={copy.weakness.empty} />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {bandOrder.map((band) =>
                bands[band].length === 0 ? null : (
                  <div key={band}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                      {bandLabel[band]}
                    </p>

                    <ul className="mt-2 flex flex-wrap gap-2">
                      {bands[band].map((entry) => (
                        <WeaknessChip key={entry.unit.id} entry={entry} />
                      ))}
                    </ul>
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </LabScreen>
  );
}

const BAND_TONE: Record<WeaknessBand, string> = {
  needsWork: "border-red-200 bg-red-50 text-red-800",
  improving: "border-amber-200 bg-amber-50 text-amber-800",
  strong: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

function WeaknessChip({ entry }: { entry: WeaknessEntry }) {
  const { t } = useTranslation();

  return (
    <li>
      <Link
        href={`/pronunciation/sounds/${encodeURIComponent(entry.unit.id)}`}
        className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-[15px] font-semibold transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${BAND_TONE[entry.band]}`}
      >
        {entry.unit.symbol}
        <span className="text-[11px] font-medium opacity-70">
          {fill(t.pronunciation.lab.weakness.attempts, { count: entry.attempts })}
        </span>
      </Link>
    </li>
  );
}
