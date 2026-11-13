/*
 * The web app's half of the share extension's key (Chi, 2026-11-12: 專用小鑰匙;
 * the server half is lib/pocket/keys.ts, the phone's is
 * native/apple/.../Shared/PocketKeyStore.swift).
 *
 * Only inside the iPhone app: the native side tells the page, before it
 * runs, whether a key is already held (window.__yumiPocketKey), and accepts
 * a new one through the yumiPocketKey message, from this origin's main
 * frame only. In a browser both are absent and these do nothing.
 */

type PocketKeyState = { present: boolean; id: string | null };

type PocketWindow = Window & {
  __yumiPocketKey?: PocketKeyState;
  webkit?: { messageHandlers?: { yumiPocketKey?: { postMessage: (body: unknown) => void } } };
};

function nativeBridge() {
  if (typeof window === "undefined") return null;
  const target = window as PocketWindow;
  const handler = target.webkit?.messageHandlers?.yumiPocketKey;
  return handler ? { handler, state: target.__yumiPocketKey ?? null } : null;
}

/** Whether this page is running inside the iPhone app, which has the bridge. */
export function insideIphoneApp() {
  return nativeBridge() !== null;
}

/** One request per page load, whatever happens to it. */
let asked = false;

/** Gives the share extension a key if this phone has none yet. */
export async function ensurePocketKey() {
  const bridge = nativeBridge();
  if (!bridge || !bridge.state || bridge.state.present || asked) return;
  asked = true;
  const response = await fetch("/api/pocket/key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: "iPhone" }),
  });
  if (!response.ok) return;
  const issued = (await response.json()) as { id?: string; key?: string };
  if (!issued.key || !issued.id) return;
  bridge.handler.postMessage({ version: 1, key: issued.key, id: issued.id });
  (window as PocketWindow).__yumiPocketKey = { present: true, id: issued.id };
}

/**
 * Signing out: the key is revoked on the server while the session can still
 * say whose it is, and the phone forgets it. Best effort; a key that could
 * not be revoked here can still be revoked from Settings on another device.
 */
export async function forgetPocketKey() {
  const bridge = nativeBridge();
  if (!bridge) return;
  const id = bridge.state?.id;
  if (id) {
    await fetch(`/api/pocket/key?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => undefined);
  }
  bridge.handler.postMessage({ version: 1, clear: true });
}

/** For tests: a fresh page load. */
export function resetPocketKeyForTests() {
  asked = false;
}
