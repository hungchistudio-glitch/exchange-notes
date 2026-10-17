"use client";

/* =========================================================
   One animation frame for the home screen, measured before it is moved

   Yumi's frame loop and the floating cookies each ran their own
   requestAnimationFrame, and each one both measured the page and wrote to
   it. Whichever ran second measured a page the first had just written to,
   so every frame paid for a style recalculation and a layout in the middle
   of script, and then for the same work again when the browser drew the
   frame. Measured on 2026-10-16 at 390×844 with a 4× slowed CPU: 179 forced
   recalculations in five seconds, and a 67ms p90 frame on a screen that was
   doing nothing.

   So the home's loops share one frame here, in two halves. Every `read`
   runs first, while the page is still exactly as the browser last laid it
   out, so a measurement there costs nothing that drawing the frame would
   not already have paid for. Then every `write` runs, and nothing reads the
   page again until the next frame.

   A task that only reads, or only writes, gives just that half.
   ========================================================= */

export type HomeFrameTask = {
  /** Measure the page. Must not write to it. */
  read?: (now: number) => void;
  /** Move things. Must not measure. */
  write?: (now: number) => void;
};

const tasks = new Set<HomeFrameTask>();
let frame: number | null = null;

/* A task that throws stops, as its own loop did when it had one, and the
   error still reaches the console; everyone else's frame goes on. */
function run(task: HomeFrameTask, step: ((now: number) => void) | undefined, now: number) {
  if (!step || !tasks.has(task)) return;
  try {
    step(now);
  } catch (error) {
    tasks.delete(task);
    queueMicrotask(() => {
      throw error;
    });
  }
}

function tick(now: number) {
  frame = null;
  const current = Array.from(tasks);
  for (const task of current) run(task, task.read, now);
  for (const task of current) run(task, task.write, now);
  if (tasks.size > 0 && frame === null) frame = requestAnimationFrame(tick);
}

/** Runs `task` every frame until the returned function is called. */
export function onHomeFrame(task: HomeFrameTask): () => void {
  tasks.add(task);
  if (frame === null) frame = requestAnimationFrame(tick);
  return () => {
    tasks.delete(task);
    if (tasks.size === 0 && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  };
}
