import { cookies } from "next/headers";

import {
  APP_FONT_SIZE_COOKIE,
  DAILY_GOAL_COOKIE,
  DEFAULT_APP_FONT_SIZE,
  DEFAULT_DAILY_GOAL_WORDS,
  DEFAULT_INTERFACE_LANGUAGE,
  DEFAULT_INTERFACE_MODE,
  INTERFACE_LANGUAGE_COOKIE,
  INTERFACE_MODE_COOKIE,
  isAppFontSize,
  isDailyGoalWords,
  isInterfaceLanguage,
  isInterfaceMode,
  type AppFontSize,
  type DailyGoalWords,
  type InterfaceLanguage,
  type InterfaceMode,
} from "@/lib/appPreferences";

/**
 * The preferences the server has to know before it renders anything.
 *
 * This is the whole reason these four live in cookies while font-family
 * niceties and speech settings stay in localStorage. The test is not how
 * important a preference is, it is whether the *first* HTML is wrong without
 * it — because a server that renders one answer and a browser that renders
 * another is a hydration mismatch, and React resolves those by throwing away
 * the server's tree and rebuilding the entire document on the client.
 *
 * Each of these fails that test:
 *
 *   mode      picks between two different component trees, the standard home
 *             and the Command Deck.
 *   language  chooses every string in the app.
 *   font size is the root font size, so every rem in the interface is
 *             measured against it.
 *   goal      is rendered as a number, on the settings row and behind Yumi's
 *             cookie tray.
 *
 * Everything reads its own cookie rather than sharing one blob: they were
 * added at different times, they are written from different places, and a
 * single JSON cookie would make a change to any of them a change to all.
 */

async function readCookie(name: string) {
  const cookieStore = await cookies();

  return cookieStore.get(name)?.value;
}

/**
 * The interface mode as the server already knows it, straight off the request.
 *
 * This is the reason the mode is a cookie at all: it lets a Server Component
 * decide between the standard home and the Command Deck while it renders,
 * rather than shipping one tree and swapping it after hydration.
 */
export async function getServerInterfaceMode(): Promise<InterfaceMode> {
  const value = await readCookie(INTERFACE_MODE_COOKIE);

  return isInterfaceMode(value) ? value : DEFAULT_INTERFACE_MODE;
}

/**
 * The interface language, for the same reason and with more at stake — every
 * translated string in the app is chosen from this value.
 *
 * Falls back to the default rather than guessing from Accept-Language. A
 * reader who has not chosen yet gets English and can change it in one tap;
 * inferring a language from the browser would make the *stored* choice and
 * the *guessed* one indistinguishable to everything downstream.
 */
export async function getServerInterfaceLanguage(): Promise<InterfaceLanguage> {
  const value = await readCookie(INTERFACE_LANGUAGE_COOKIE);

  return isInterfaceLanguage(value) ? value : DEFAULT_INTERFACE_LANGUAGE;
}

/**
 * The root font size, so the document arrives already at the size the reader
 * chose rather than being relaid the moment it hydrates.
 */
export async function getServerAppFontSize(): Promise<AppFontSize> {
  const value = await readCookie(APP_FONT_SIZE_COOKIE);

  return isAppFontSize(value) ? value : DEFAULT_APP_FONT_SIZE;
}

/** The daily goal, which is rendered as a number and so must match. */
export async function getServerDailyGoalWords(): Promise<DailyGoalWords> {
  const value = await readCookie(DAILY_GOAL_COOKIE);
  const parsed = value === undefined ? null : Number(value);

  return isDailyGoalWords(parsed) ? parsed : DEFAULT_DAILY_GOAL_WORDS;
}
