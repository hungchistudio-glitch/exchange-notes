import { cookies } from "next/headers";

import {
  DEFAULT_INTERFACE_MODE,
  INTERFACE_MODE_COOKIE,
  isInterfaceMode,
  type InterfaceMode,
} from "@/lib/appPreferences";

/**
 * The interface mode as the server already knows it, straight off the request.
 *
 * This is the reason the mode is a cookie at all: it lets a Server Component
 * decide between the standard home and the Command Deck while it renders,
 * rather than shipping one tree and swapping it after hydration.
 */
export async function getServerInterfaceMode(): Promise<InterfaceMode> {
  const cookieStore = await cookies();
  const value = cookieStore.get(INTERFACE_MODE_COOKIE)?.value;

  return isInterfaceMode(value) ? value : DEFAULT_INTERFACE_MODE;
}
