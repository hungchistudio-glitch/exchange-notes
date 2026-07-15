// Simple client-side request queue to keep pronunciation lookups
// under the Gemini free-tier rate limit (20 requests/minute).
// All VocabularyCard instances share this queue instead of firing
// their fetch() calls independently and in parallel.

type QueuedTask<T> = () => Promise<T>;

const MAX_CONCURRENT = 1;
const MIN_INTERVAL_MS = 3200; // ~18 requests/minute, safely under the 20/min cap

let activeCount = 0;
// Predicted start time of the next task, used to space tasks out
// even when many are enqueued synchronously in the same tick.
let nextAvailableAt = 0;
const queue: Array<() => void> = [];

function processQueue() {
  if (activeCount >= MAX_CONCURRENT) return;
  const next = queue.shift();
  if (!next) return;

  // Reserve the concurrency slot AND the time slot synchronously,
  // before any setTimeout fires. This is what actually prevents
  // a burst of synchronous enqueue() calls from all slipping
  // through the activeCount check at once.
  activeCount += 1;

  const now = Date.now();
  const startAt = Math.max(now, nextAvailableAt);
  const wait = startAt - now;
  nextAvailableAt = startAt + MIN_INTERVAL_MS;

  setTimeout(next, wait);
}

export function enqueuePronunciationTask<T>(
  task: QueuedTask<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    queue.push(() => {
      task()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          activeCount -= 1;
          processQueue();
        });
    });

    processQueue();
  });
}
