import { configure } from "@testing-library/dom";

/* =========================================================
   A busy machine, on demand (npm run test:late-react)

   tests/helloNotFound.test.tsx failed about one full run in three and
   never on its own: it read document.title the moment findByText returned,
   and the effect that sets the title had not always run. Whether it had
   depends on the order of React's scheduler task (setImmediate) and
   Testing Library's setTimeout(0), which machine load decides.

   This makes that order the bad one every time. React's scheduler takes
   setImmediate once, when it is first imported, so this runs before
   tests/setup.ts (see vitest.late-scheduler.config.mts) and hands it one
   that waits a few milliseconds. The real setTimeout is kept, so tests that
   fake timers do not stop React altogether.

   Slowness alone is not what this looks for, so the async utilities wait
   up to five seconds instead of one: what fails here is an assertion made
   before the update it depends on, the kind that fails at random in CI.
   ========================================================= */

const realSetTimeout = globalThis.setTimeout;
const lateImmediate = (callback: (...args: unknown[]) => void, ...args: unknown[]) =>
  realSetTimeout(() => callback(...args), 5);
(globalThis as { setImmediate: unknown }).setImmediate = lateImmediate;

configure({ asyncUtilTimeout: 5000 });
