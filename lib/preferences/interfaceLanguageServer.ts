import { cookies } from "next/headers";

import {
  DEFAULT_INTERFACE_LANGUAGE,
  INTERFACE_LANGUAGE_COOKIE,
  isInterfaceLanguage,
  type InterfaceLanguage,
} from "@/lib/appPreferences";

/**
 * The interface language as the server already knows it, straight off the
 * request — the counterpart to getServerInterfaceMode, and there for the same
 * reason.
 *
 * Every translated string in the app is chosen from this value. Rendered
 * without it, the server produces an English document for a reader whose app
 * is in Chinese, and the browser rebuilds the entire tree the moment it
 * hydrates. Read here, the first HTML is already in the right language and
 * there is nothing to rebuild.
 *
 * Falls back to the default rather than guessing from Accept-Language. A
 * reader who has not chosen yet gets English and can change it in one tap;
 * inferring a language from the browser would make the *stored* choice and
 * the *guessed* one indistinguishable to everything downstream.
 */
export async function getServerInterfaceLanguage(): Promise<InterfaceLanguage> {
  const cookieStore = await cookies();
  const value = cookieStore.get(INTERFACE_LANGUAGE_COOKIE)?.value;

  return isInterfaceLanguage(value) ? value : DEFAULT_INTERFACE_LANGUAGE;
}
