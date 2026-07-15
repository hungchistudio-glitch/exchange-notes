// Simple client-side request queue to keep pronunciation lookups
// under the Gemini free-tier rate limit (20 requests/minute).
// All VocabularyCard instances share this queue instead of firing
// their fetch() calls independently and in parallel.

type QueuedTask<T> = () => Promise<T>;

const MAX_CONCURRENT = 1;
const MIN_INTERVAL_MS = 3200; // ~18 requests/minute, safely under the 20/min cap

let activeCount = 0;
let lastStartedAt = 0;
const queue: Array<() => void> = [];

function processQueue() {
  if (activeCount >= MAX_CONCURRENT) return;
  const next = queue.shift();
  if (!next) return;

  const now = Date.now();
  const wait = Math.max(0, lastStartedAt + MIN_INTERVAL_MS - now);

  setTimeout(() => {
    lastStartedAt = Date.now();
    activeCount += 1;
    next();
  }, wait);
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
