/*
 * Time formatting shared by both messaging pages.
 *
 * Lifted out of the old single-page implementation when the list and the
 * conversation became separate routes: they render the same instants at
 * different granularities, and the two copies had already started to drift.
 *
 * Everything here goes through Intl with the browser's own locale, so a
 * Traditional Chinese interface gets Traditional Chinese weekday and month
 * names without a second dictionary to keep in sync.
 */

/** Row timestamps: a time today, a weekday this week, a date before that. */
export function formatConversationTime(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const startOfMessageDay = new Date(date).setHours(0, 0, 0, 0);
  const daysAgo = Math.floor(
    (startOfToday - startOfMessageDay) / (1000 * 60 * 60 * 24),
  );

  if (daysAgo < 7) {
    return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Bubble timestamps, which are always within a day the divider named. */
export function formatMessageTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

/** The centred divider between days in the timeline. */
export function formatDateLabel(
  value: string,
  todayLabel: string,
  yesterdayLabel: string,
): string {
  const date = new Date(value);
  const today = new Date();

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  if (isSameDay(date, today)) return todayLabel;
  if (isSameDay(date, yesterday)) return yesterdayLabel;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  }).format(date);
}
