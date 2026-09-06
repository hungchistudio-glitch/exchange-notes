"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import FriendPickerModal from "@/components/vocabulary/FriendPickerModal";
import type { FriendProfile } from "@/lib/friends";

/**
 * The share sheet arriving, without an account.
 *
 * "Which friend?" is reachable from six screens and every one of them is
 * behind the login, so the only way to watch this sheet open was to sign in
 * on the device you wanted to watch it on. That is how it shipped growing
 * halfway through its own entrance: the fault only appears when the friend
 * list is longer than the height the sheet reserves for it, and whoever was
 * looking had three friends.
 *
 * So the two things that decide whether the fault can appear at all are the
 * controls here: how many friends come back, and how late they arrive
 * relative to the 380ms the sheet spends arriving.
 *
 * It opens on the ordinary case — a friend list already in hand, arriving
 * before the sheet has begun to move — because that is what most opens
 * actually look like and it is the one to judge the motion by. It is
 * deliberately not the combination that was broken: at 0ms the panel is
 * already its full height on the first frame, so nothing can move under the
 * entrance and even the old component looks right. Reproducing the fault
 * means 6 friends at 250ms, one tap away.
 */

/** Mirrors the entrance in useSheetMotion. Only used to judge the samples. */
const ENTRANCE_MS = 380;

/** Long enough to cover the entrance, the growth, and some quiet after. */
const SAMPLE_WINDOW_MS = 1400;

/*
 * Below this many frames inside the entrance, the run says nothing.
 *
 * The verdict is only as good as the sampling behind it, and a sampler that
 * did not look cannot report "held" — that is a pass nobody earned. Caught
 * against the pre-fix component in a throttled browser: the growth happened
 * between the first frame and the second, and the run called it held. At
 * 60Hz the entrance is about 23 frames, so a handful is a low bar that only
 * a genuinely starved run fails.
 */
const MIN_ENTRANCE_SAMPLES = 5;

const FRIEND_COUNTS = [0, 2, 3, 6, 20] as const;
const ARRIVAL_DELAYS = [0, 250, 600] as const;

const VERDICT_TONE: Record<EntranceVerdict["kind"], string> = {
  unmeasured: "bg-amber-50 text-amber-800",
  held: "bg-emerald-50 text-emerald-800",
  moved: "bg-red-50 text-red-700",
};

function makeFriends(count: number): FriendProfile[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `review-${index}`,
    exchangeId: `friend${index}`,
    displayName: `Friend ${index}`,
  })) as unknown as FriendProfile[];
}

export type EntranceRun = {
  /** The distinct panel heights seen during the entrance, in order. */
  entranceHeights: number[];
  /** How many frames actually landed inside the entrance window. */
  entranceSamples: number;
  /** The last height seen, once everything has stopped. */
  restingHeight: number;
};

export type EntranceVerdict =
  | { kind: "unmeasured"; samples: number }
  | { kind: "held"; height: number; restingHeight: number }
  | { kind: "moved"; heights: number[]; restingHeight: number };

/**
 * What a run is allowed to conclude.
 *
 * Separated from the drawing of it because the interesting case is the one
 * that looks like success: a sampler that never got a frame sees a single
 * height, which is indistinguishable from a sheet that held one. Anything
 * short of a handful of frames says so instead of passing.
 */
export function judgeEntrance(run: EntranceRun): EntranceVerdict {
  if (run.entranceSamples < MIN_ENTRANCE_SAMPLES) {
    return { kind: "unmeasured", samples: run.entranceSamples };
  }

  if (run.entranceHeights.length <= 1) {
    return {
      kind: "held",
      height: run.entranceHeights[0] ?? run.restingHeight,
      restingHeight: run.restingHeight,
    };
  }

  return {
    kind: "moved",
    heights: run.entranceHeights,
    restingHeight: run.restingHeight,
  };
}

export default function ShareSheetReview() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [friendCount, setFriendCount] = useState(0);
  const [requestedCount, setRequestedCount] = useState<number>(6);
  const [arrivalDelay, setArrivalDelay] = useState<number>(0);
  const [run, setRun] = useState<EntranceRun | null>(null);

  const timersRef = useRef<number[]>([]);
  const frameRef = useRef<number | null>(null);

  const clearPending = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  useEffect(() => clearPending, [clearPending]);

  /*
   * The eye cannot reliably catch 190px of movement in one frame on a phone,
   * so the panel is measured as well as watched: every frame for the first
   * second and a bit, split at the moment the entrance ends.
   */
  const play = useCallback(() => {
    clearPending();
    setRun(null);
    setOpen(false);
    setLoading(true);
    setFriendCount(0);

    timersRef.current.push(
      window.setTimeout(() => {
        setOpen(true);

        const start = performance.now();
        const entrance: number[] = [];
        let entranceSamples = 0;
        let resting = 0;

        const sample = () => {
          const panel = document.querySelector<HTMLElement>('[role="dialog"]');
          const elapsed = performance.now() - start;

          if (panel) {
            const height = Math.round(panel.getBoundingClientRect().height);
            resting = height;

            if (elapsed <= ENTRANCE_MS) {
              entranceSamples += 1;
              if (!entrance.includes(height)) entrance.push(height);
            }
          }

          if (elapsed < SAMPLE_WINDOW_MS) {
            frameRef.current = requestAnimationFrame(sample);
            return;
          }

          frameRef.current = null;
          setRun({
            entranceHeights: entrance,
            entranceSamples,
            restingHeight: resting,
          });
        };

        frameRef.current = requestAnimationFrame(sample);

        timersRef.current.push(
          window.setTimeout(() => {
            setLoading(false);
            setFriendCount(requestedCount);
          }, arrivalDelay),
        );
      }, 80),
    );
  }, [arrivalDelay, clearPending, requestedCount]);

  const verdict = run ? judgeEntrance(run) : null;

  return (
    <main className="min-h-dvh bg-surface px-5 py-8">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <header>
          <h1 className="text-lg font-semibold tracking-tight text-black">
            Share sheet review
          </h1>

          <p className="mt-1 text-[0.8125rem] leading-5 text-ink-soft">
            Watch the top edge as the sheet comes up. It should rise once and
            stop. The fault this replaced was it growing part-way through,
            which reads as overshooting and dropping back.
          </p>
        </header>

        <section className="flex flex-col gap-3 rounded-2xl border border-black/[0.08] bg-white p-4">
          <Choice
            label="Friends returned"
            options={FRIEND_COUNTS}
            value={requestedCount}
            onChange={setRequestedCount}
            hint="Three or fewer fits the reserved height, so nothing can move."
          />

          <Choice
            label="They arrive after"
            options={ARRIVAL_DELAYS}
            value={arrivalDelay}
            onChange={setArrivalDelay}
            format={(value) => `${value}ms`}
            hint={`0ms is a list already in hand. Anything under ${ENTRANCE_MS}ms lands while the sheet is still arriving, which is what used to break it.`}
          />

          <button
            type="button"
            onClick={play}
            className="mt-1 flex h-11 items-center justify-center rounded-full bg-black px-5 text-[0.8125rem] font-semibold text-white transition active:scale-[0.99]"
          >
            Play the entrance
          </button>
        </section>

        {verdict && (
          <p
            className={`rounded-2xl px-4 py-3 text-[0.8125rem] leading-5 ${
              VERDICT_TONE[verdict.kind]
            }`}
          >
            {verdict.kind === "unmeasured" &&
              `Only ${verdict.samples} frame${
                verdict.samples === 1 ? "" : "s"
              } landed during the entrance, which is too few to judge. Bring the tab to the front and play it again.`}

            {verdict.kind === "held" &&
              `Held at ${verdict.height}px for the whole entrance, then settled at ${verdict.restingHeight}px.`}

            {verdict.kind === "moved" &&
              `Changed while arriving: ${verdict.heights.join(
                " → ",
              )}px, settling at ${verdict.restingHeight}px.`}
          </p>
        )}

        {open && (
          <FriendPickerModal
            friends={makeFriends(friendCount)}
            loading={loading}
            errorMessage=""
            sendingFriendId={null}
            onClose={() => setOpen(false)}
            /* Nothing is sent from here — there is no account behind it. */
            onPick={() => setOpen(false)}
            onRetry={() => {}}
          />
        )}
      </div>
    </main>
  );
}

function Choice<Value extends number>({
  label,
  options,
  value,
  onChange,
  format = String,
  hint,
}: {
  label: string;
  options: readonly Value[];
  value: Value;
  onChange: (value: Value) => void;
  format?: (value: Value) => string;
  hint: string;
}) {
  return (
    <div>
      <p className="text-[0.8125rem] font-semibold text-black">{label}</p>

      <div
        role="radiogroup"
        aria-label={label}
        className="mt-1.5 flex w-fit items-center gap-0.5 rounded-full bg-black/[0.05] p-[3px]"
      >
        {options.map((option) => {
          const selected = option === value;

          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className={`flex min-h-[34px] items-center justify-center rounded-full px-3.5 text-[0.8125rem] font-semibold transition-[background-color,color] duration-200 ease-out ${
                selected ? "bg-black text-white" : "text-ink-soft"
              }`}
            >
              {format(option)}
            </button>
          );
        })}
      </div>

      <p className="mt-1 text-xs leading-4 text-ink-faint">{hint}</p>
    </div>
  );
}
