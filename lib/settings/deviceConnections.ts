/*
 * What this device has actually connected, remembered on this device.
 *
 * Settings shows "2 connected" on the Devices & Widgets row without opening
 * the screen behind it, and it does that without a network call: whichever
 * control last learned the truth writes it here, and the row reads the cache.
 * Deliberately device-scoped and deliberately never synced — an iPhone widget
 * set up on one phone says nothing about another.
 */

/*
 * Only the Scriptable token today. Whether the app is installed to the Home
 * Screen is asked live (matchMedia knows it for free), and the native Yumi
 * widget has no connection to make — so neither is cached here.
 */
export type DeviceConnectionKey = "iphoneWidget";

export type DeviceConnections = Partial<Record<DeviceConnectionKey, boolean>>;

const STORAGE_KEY = "exchange-notes-device-connections";

const EMPTY: DeviceConnections = Object.freeze({});

const listeners = new Set<() => void>();

/*
 * useSyncExternalStore compares snapshots by identity, so the parsed value is
 * cached and only replaced when something is actually written. Re-parsing on
 * every read would hand React a new object each time and re-render forever.
 */
let snapshot: DeviceConnections | null = null;

function read(): DeviceConnections {
  if (typeof window === "undefined") return EMPTY;
  if (snapshot) return snapshot;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;

    snapshot =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as DeviceConnections)
        : EMPTY;
  } catch {
    snapshot = EMPTY;
  }

  return snapshot;
}

export function getDeviceConnections(): DeviceConnections {
  return read();
}

export function getServerDeviceConnections(): DeviceConnections {
  return EMPTY;
}

export function setDeviceConnection(
  key: DeviceConnectionKey,
  connected: boolean,
) {
  if (typeof window === "undefined") return;

  const current = read();
  if (current[key] === connected) return;

  snapshot = { ...current, [key]: connected };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Private mode, or a full quota. The value still holds for this session.
  }

  listeners.forEach((listener) => listener());
}

export function subscribeToDeviceConnections(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
