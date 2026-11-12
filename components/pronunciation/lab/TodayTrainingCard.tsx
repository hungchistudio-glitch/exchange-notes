"use client";

import Link from "next/link";

import type { TranslationDictionary } from "@/lib/i18n/types";
import { fill } from "@/lib/i18n/format";
import type { DailyTrainingPlan } from "@/lib/pronunciation/lab/dailyTraining";

import trainingStyles from "./TodayTraining.module.css";

type LabCopy = TranslationDictionary["pronunciation"]["lab"];

/**
 * Today's training on the Lab's landing: the plan's steps and the one way
 * into them. Its own component so it can be looked at signed out
 * (/vocabulary-yumi-review) as well as in the Lab.
 */
export default function TodayTrainingCard({
  plan,
  copy,
}: {
  plan: DailyTrainingPlan;
  copy: LabCopy;
}) {
  return (
    <section className={`ob-edge overflow-hidden rounded-[26px] border border-black/[0.06] bg-black text-white ${trainingStyles.training}`}>
      <div className="p-5">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-ink-invert-faint">
          {copy.today.eyebrow}
        </p>

        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-bold tracking-[-0.02em]">
            {copy.today.title}
          </h2>
          {plan.items.length > 0 ? (
            <span className="shrink-0 text-sm font-semibold text-ink-invert-soft">
              {fill(copy.today.minutes, {
                minutes: Math.max(1, Math.round(plan.totalSeconds / 60)),
              })}
            </span>
          ) : null}
        </div>

        {plan.items.length === 0 ? (
          <p className="font-cjk mt-2 text-sm leading-6 text-ink-invert-soft">
            {copy.today.empty}
          </p>
        ) : (
          <>
            <ul className="mt-3 space-y-1.5">
              {plan.items.map((item, index) => {
                /* A module that comes twice is numbered, so two rows are
                   never both just "Sounds" (2026-10-24). */
                const sameModule = plan.items.filter((other) => other.module === item.module);
                const ordinal = sameModule.length > 1
                  ? ` ${plan.items.slice(0, index + 1).filter((other) => other.module === item.module).length}`
                  : "";
                return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="font-cjk truncate text-ink-invert-soft">
                    {copy.modules[item.module].title}{ordinal}
                  </span>
                  <span className="font-cjk shrink-0 truncate text-right font-medium">
                    {item.label}
                  </span>
                </li>
                );
              })}
            </ul>

            <Link
              href="/pronunciation/train"
              className={`mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-black transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${trainingStyles.start}`}
            >
              {copy.today.start}
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
