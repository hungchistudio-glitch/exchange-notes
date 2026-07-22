export function getMessageDateKey(value: string): string {
  const date = new Date(value);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function formatMessageDate(
  value: string,
  locale: string,
  todayLabel: string,
  yesterdayLabel: string,
): string {
  const messageDate = new Date(value);
  const today = new Date();

  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const startOfMessageDate = new Date(
    messageDate.getFullYear(),
    messageDate.getMonth(),
    messageDate.getDate(),
  );

  const differenceInDays = Math.round(
    (startOfToday.getTime() - startOfMessageDate.getTime()) / 86_400_000,
  );

  if (differenceInDays === 0) return todayLabel;
  if (differenceInDays === 1) return yesterdayLabel;

  return messageDate.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year:
      messageDate.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}
