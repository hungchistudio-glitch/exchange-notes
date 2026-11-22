"use client";

import { useSyncExternalStore } from "react";

/*
 * Text that depends on the reader's clock or time zone: "10:42", "Yesterday",
 * "Nov 22". The server renders in UTC and cannot know the reader's zone, so
 * the two disagree for part of every day and React throws away the whole
 * tree it was hydrating (minified error #418). The review screens showed it
 * first (2026-11-22 audit), since they render sample messages on the server.
 *
 * During hydration this renders nothing, then the reader's own text; on a
 * page reached by navigation it renders the text at once (React reads the
 * server snapshot only while hydrating). The same pattern NoteCard uses.
 */

const subscribeNever = () => () => {};
const onServer = () => "";

/** `compute` runs in the browser only, so it may read the clock and the zone. */
export function useLocalText(compute: () => string): string {
  return useSyncExternalStore(subscribeNever, compute, onServer);
}

export default function LocalText({ text }: { text: () => string }) {
  return <>{useLocalText(text)}</>;
}
