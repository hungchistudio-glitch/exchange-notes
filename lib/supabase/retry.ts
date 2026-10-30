/*
 * A read that failed is asked once more, a moment later. PostgREST now and
 * then refuses a token the proxy minted a moment before (PGRST303, seen five
 * times in a day on 2026-10-26, always one of the two reads below and never
 * both): its clock a little behind the auth server's, the new token is not
 * valid yet. A quarter of a second later it is.
 *
 * The second asking carries a signal of its own. During a render Next
 * memoizes a GET with the same URL and options and hands back the first
 * answer (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/
 * fetch.md, "Memoization"), so without one the retry never left the server:
 * on 2026-10-28 the refused read was followed by no second request at all,
 * and only the page's own read saved the settings. A signal opts it out.
 */
export async function askTwice<T extends { error: unknown }>(
  read: (signal?: AbortSignal) => PromiseLike<T>,
): Promise<T> {
  const first = await read();
  if (!first.error) return first;
  await new Promise((resolve) => setTimeout(resolve, 250));
  return read(new AbortController().signal);
}

/* A query asked with a signal when there is one, so a retry is not memoized. */
export function withSignal<Q extends { abortSignal(signal: AbortSignal): Q }>(query: Q, signal?: AbortSignal): Q {
  return signal ? query.abortSignal(signal) : query;
}
