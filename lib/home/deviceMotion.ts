/* =========================================================
   The phone's tilt and shake, for the letter capsules (Chi, 2026-11-21)

   "依手機平衡重心飄動": the capsules drift toward whichever side is held
   lower, like things floating in water, and a shake knocks them about as
   hard as it was. Two readings, both in the screen's own axes (x right,
   y down), whichever way the screen is turned:

   - `tilt`: gravity in the plane of the screen, relative to how the phone
     has been held for the last few seconds. Nobody holds a phone flat, so
     an absolute reading would sink every capsule to the bottom; relative,
     tipping it is what moves them, and holding it still lets them settle.
   - `shakeReader()`: the jolt since it was last asked, in m/s, kept for
     each reader (the capsules, and Yumi, who feels it too).

   iPhones only send either after the reader allows "Motion & Orientation
   Access", and only ask from inside a tap (`enableDeviceMotion`, which the
   field calls on the first touch of a capsule; Chi chose that over a key or
   a card). Elsewhere it starts without asking. Nothing here is ever sent
   anywhere: it is read in the page and forgotten.

   The reader can turn all of it off for this device (Settings, "Capsules
   follow the phone"; Chi, 2026-11-22). Off, nothing listens at all.
   ========================================================= */

type PermissionAsker = { requestPermission?: () => Promise<"granted" | "denied"> };

export const deviceTilt = { x: 0, y: 0, live: false };

/* Each reader of the jolt keeps its own, so the capsules and Yumi both
   feel the same shake. */
const shakeReaders = new Set<{ x: number; y: number }>();
let neutral: { x: number; y: number } | null = null;
let lastOrientationAt = 0;
let listening = 0;
let asked = false;

/** How long it takes for a new way of holding the phone to become level. */
const SETTLE_SECONDS = 3.2;
const RAD = Math.PI / 180;

function screenAngle() {
  const angle = typeof screen !== "undefined" && screen.orientation ? screen.orientation.angle : 0;
  return ((angle % 360) + 360) % 360;
}

/** From the device's portrait axes to the screen's, as it is turned now. */
function toScreen(x: number, y: number) {
  const a = screenAngle() * RAD;
  const c = Math.cos(a), s = Math.sin(a);
  return { x: x * c + y * s, y: -x * s + y * c };
}

function onOrientation(event: DeviceOrientationEvent) {
  if (event.beta === null || event.gamma === null) return;
  const beta = event.beta * RAD;
  const gamma = event.gamma * RAD;
  /* Gravity in the plane of the screen, portrait axes (y down). */
  const raw = toScreen(Math.sin(gamma) * Math.cos(beta), Math.sin(beta));
  const now = performance.now();
  const dt = lastOrientationAt ? Math.min(0.25, (now - lastOrientationAt) / 1000) : 0;
  lastOrientationAt = now;
  if (!neutral) neutral = { ...raw };
  const k = 1 - Math.exp(-dt / SETTLE_SECONDS);
  neutral.x += (raw.x - neutral.x) * k;
  neutral.y += (raw.y - neutral.y) * k;
  deviceTilt.x = Math.max(-1, Math.min(1, raw.x - neutral.x));
  deviceTilt.y = Math.max(-1, Math.min(1, raw.y - neutral.y));
  deviceTilt.live = true;
}

function onMotion(event: DeviceMotionEvent) {
  const a = event.acceleration;
  if (!a || a.x === null || a.y === null) return;
  /* The interval is in milliseconds by the spec; some browsers send seconds. */
  const raw = event.interval || 16;
  const seconds = raw > 1 ? raw / 1000 : raw;
  /* Device y is up; the screen's is down. */
  const jolt = toScreen(a.x, -a.y);
  for (const shake of shakeReaders) {
    shake.x += jolt.x * seconds;
    shake.y += jolt.y * seconds;
  }
}

function start() {
  listening += 1;
  if (listening > 1) return;
  window.addEventListener("deviceorientation", onOrientation);
  window.addEventListener("devicemotion", onMotion);
}

function stop() {
  listening = Math.max(0, listening - 1);
  if (listening > 0) return;
  window.removeEventListener("deviceorientation", onOrientation);
  window.removeEventListener("devicemotion", onMotion);
  deviceTilt.x = deviceTilt.y = 0;
  deviceTilt.live = false;
  neutral = null;
  lastOrientationAt = 0;
}

function needsPermission() {
  if (typeof window === "undefined") return false;
  const motion = (window as unknown as { DeviceMotionEvent?: PermissionAsker }).DeviceMotionEvent;
  return typeof motion?.requestPermission === "function";
}

let granted = false;
let subscribers = 0;

/* ------------------------------------------------ the reader's choice */

const MOTION_KEY = "home-motion-v1";
export const HOME_MOTION_EVENT = "home-motion-change";

/** Whether the home answers the phone's motion on this device; on by default. */
export function homeMotionOn(): boolean {
  try {
    return window.localStorage.getItem(MOTION_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setHomeMotion(on: boolean) {
  try {
    window.localStorage.setItem(MOTION_KEY, on ? "on" : "off");
  } catch {
    // Private mode: the choice lasts for this page.
  }
  window.dispatchEvent(new Event(HOME_MOTION_EVENT));
}

/**
 * Listen while the home is on screen. Where the browser asks first, this
 * waits for `enableDeviceMotion` from a tap. Returns the way to stop.
 */
export function watchDeviceMotion(): () => void {
  if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return () => {};
  subscribers += 1;
  let started = false;
  const begin = () => {
    if (started || subscribers === 0 || !homeMotionOn()) return;
    started = true;
    start();
  };
  const halt = () => {
    if (!started) return;
    started = false;
    stop();
  };
  /* Switched in Settings while the home is open: follow it at once. */
  const onChoice = () => {
    if (!homeMotionOn()) halt();
    else if (!needsPermission() || granted) begin();
  };
  window.addEventListener(HOME_MOTION_EVENT, onChoice);
  if (!homeMotionOn()) {
    waiting.add(begin);
  } else if (!needsPermission() || granted) begin();
  else {
    /* Asked without a tap: where it was allowed before (or needs no tap,
       as in Chrome), it simply says yes and they move from the start;
       where it needs a tap, it refuses quietly and the first touch asks. */
    const motion = (window as unknown as { DeviceMotionEvent: PermissionAsker }).DeviceMotionEvent;
    void motion.requestPermission!()
      .then(answer => {
        if (answer !== "granted") return;
        granted = true;
        begin();
      })
      .catch(() => {});
    waiting.add(begin);
  }
  return () => {
    subscribers = Math.max(0, subscribers - 1);
    waiting.delete(begin);
    window.removeEventListener(HOME_MOTION_EVENT, onChoice);
    halt();
  };
}

/** Fields waiting for a tap's yes. */
const waiting = new Set<() => void>();

/** From a tap: ask once, where the browser wants asking. */
export function enableDeviceMotion() {
  if (typeof window === "undefined" || !needsPermission() || granted || asked || !homeMotionOn()) return;
  asked = true;
  const motion = (window as unknown as { DeviceMotionEvent: PermissionAsker }).DeviceMotionEvent;
  const orientation = (window as unknown as { DeviceOrientationEvent?: PermissionAsker }).DeviceOrientationEvent;
  /* Both asked inside the same tap; the reader sees one question. */
  const asks = [motion.requestPermission!(), orientation?.requestPermission?.()].filter(Boolean) as Promise<string>[];
  void Promise.all(asks)
    .then(answers => {
      if (answers.every(answer => answer === "granted")) {
        granted = true;
        for (const begin of waiting) begin();
      }
    })
    .catch(() => {
      /* Not inside a tap after all (a pointerdown is not one on iOS): the
         next touch may ask again. */
      asked = false;
    });
}

/**
 * A reader of the phone's jolts: `take()` gives the jolt since it was last
 * asked, m/s in screen axes, and clears it for this reader only.
 */
export function shakeReader() {
  const shake = { x: 0, y: 0 };
  shakeReaders.add(shake);
  return {
    take() {
      const taken = { x: shake.x, y: shake.y };
      shake.x = shake.y = 0;
      return taken;
    },
    dispose() {
      shakeReaders.delete(shake);
    },
  };
}

if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  // For checking the capsules from a script: what the field reads.
  (window as unknown as { __deviceMotion?: unknown }).__deviceMotion = { deviceTilt, readers: shakeReaders, listening: () => listening };
}
