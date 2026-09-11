const TRUSTED_PUSH_HOSTS = new Set([
  "fcm.googleapis.com",
  "android.googleapis.com",
  "updates.push.services.mozilla.com",
  "push.services.mozilla.com",
  "web.push.apple.com",
]);

function isTrustedPushHost(hostname: string): boolean {
  const host = hostname.toLowerCase();

  return (
    TRUSTED_PUSH_HOSTS.has(host) ||
    host === "notify.windows.com" ||
    host.endsWith(".notify.windows.com")
  );
}

export function normalizeHttpsPushEndpoint(
  value: unknown,
): string | null {
  if (typeof value !== "string") return null;

  const endpoint = value.trim();

  if (endpoint.length < 10 || endpoint.length > 2048) {
    return null;
  }

  try {
    const url = new URL(endpoint);

    if (
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== "" ||
      (url.port !== "" && url.port !== "443")
    ) {
      return null;
    }

    // Preserve the browser-provided string exactly. In particular, DELETE
    // must match a legacy database row that may not contain URL's normalized
    // trailing slash.
    return endpoint;
  } catch {
    return null;
  }
}

/**
 * Browser subscriptions are outbound request destinations, not arbitrary
 * callback URLs. Restricting them to browser-vendor push services prevents a
 * signed-in account (or a directly invoked Supabase RPC) from turning a
 * notification send into a blind server-side request to an attacker host.
 */
export function normalizeTrustedPushEndpoint(
  value: unknown,
): string | null {
  const endpoint = normalizeHttpsPushEndpoint(value);

  if (!endpoint) return null;

  const url = new URL(endpoint);
  return isTrustedPushHost(url.hostname) ? endpoint : null;
}
