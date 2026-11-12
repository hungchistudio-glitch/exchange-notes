/* =========================================================
   Into a feature: Yumi leads (Chi, 2026-11-12: Yumi 領航)

   Tapping one of Yumi's features used to cut three times in 0.6s: the halo
   was cut off mid-close, the next frame was a blank screen, then an
   outline, then the page. Nothing said which feature had been entered.

   Now the key that was tapped flies there. It lifts off the halo as the
   page behind it veils over, the page changes underneath, and the key
   flies to the new page's title and lands on the same mark there
   (components/features/FeatureMark, found by `data-feature-mark`). Create
   opens a sheet rather than a page, and its key lands on the sheet's
   search field instead. Scan opens straight onto the camera, which has no
   title to land on: there the key flies to the middle of the viewfinder
   and opens into it.

   | moment                              | when                           |
   |-------------------------------------|--------------------------------|
   | the key lifts, the page veils over  | 0–180ms                        |
   | the page changes underneath         | 180ms (go())                   |
   | the new page comes up, veil lifts   | as it arrives (RouteStage says |
   |                                     | so), or after 900ms            |
   | the key flies to the title, lands   | 440ms from the arrival         |

   While a flight is under way `<html data-feature-flight>` is set, and
   RouteStage brings the new page in by fading only: a layer rising 10px
   would move the title while the key is flying to it.

   The key in the air is a copy of the one tapped, its look read from the
   page at that moment, so nothing about it depends on the halo's
   stylesheet still being loaded once the page has gone. Every motion is
   transform and opacity. Pointer events pass through all of it, so the
   new page answers a touch at once. Reduced motion: no flight, the
   navigation happens at once.
   ========================================================= */

/**
 * Said on window by RouteStage as a new page starts to arrive (after its
 * outline, if it had one). Here rather than in pageArrival.ts so this file
 * imports nothing: it rides in the vocabulary page's own bundle.
 */
export const ROUTE_ARRIVED_EVENT = "exchange-notes:route-arrived";

export function announceRouteArrival() {
  window.dispatchEvent(new Event(ROUTE_ARRIVED_EVENT));
}

export const FLIGHT_LIFT_MS = 180;
export const FLIGHT_MS = 440;
export const FLIGHT_VEIL_FADE_MS = 260;
/** The veil lifts by then even if the page has not arrived. */
export const FLIGHT_VEIL_MAX_MS = 900;
/** A page whose title has not appeared by then is flown into, not to. */
export const FLIGHT_TARGET_WAIT_MS = 3000;
/** How long a landing target may still be moving into place (a sheet rising). */
const FLIGHT_SETTLE_MAX_MS = 500;
/** Whatever happens, everything is gone by then. */
const FLIGHT_LIFETIME_MS = 5000;

const FLIGHT_EASING = "cubic-bezier(0.55, 0, 0.2, 1)";
const COSMIC_GROUND = "#08090b";
const STANDARD_GROUND = "#f5f3ed";

let flying = false;

export type FlightInto = "page" | "sheet";

function reducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** The key in the air: a copy of the one tapped, wearing its look. */
function copyOf(source: Element, rect: DOMRect): HTMLElement {
  const style = getComputedStyle(source);
  const flyer = source.cloneNode(true) as HTMLElement;
  flyer.removeAttribute("id");
  flyer.removeAttribute("data-feature-mark");
  flyer.removeAttribute("data-flight-source");
  flyer.setAttribute("data-feature-flyer", "");
  flyer.setAttribute("aria-hidden", "true");
  flyer.setAttribute("tabindex", "-1");
  Object.assign(flyer.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: "0",
    zIndex: "9001",
    pointerEvents: "none",
    display: "grid",
    placeItems: "center",
    transformOrigin: "0 0",
    boxSizing: "border-box",
    // Longhands only: Safari reads shorthands back as empty strings.
    borderTopLeftRadius: style.borderTopLeftRadius,
    borderTopRightRadius: style.borderTopRightRadius,
    borderBottomLeftRadius: style.borderBottomLeftRadius,
    borderBottomRightRadius: style.borderBottomRightRadius,
    borderWidth: style.borderTopWidth,
    borderStyle: style.borderTopStyle,
    borderColor: style.borderTopColor,
    backgroundImage: style.backgroundImage,
    backgroundColor: style.backgroundColor,
    color: style.color,
    boxShadow: style.boxShadow,
    translate: "none",
    scale: "none",
    rotate: "none",
    animation: "none",
    transition: "none",
  });
  return flyer;
}

/** Animations on the target or around it that are still moving it. */
function movingAnimations(target: Element): Animation[] {
  const moving: Animation[] = [];
  for (let node: Element | null = target; node && node !== document.body; node = node.parentElement) {
    for (const animation of node.getAnimations?.() ?? []) {
      if (animation.playState === "finished") continue;
      const transition = (animation as CSSTransition).transitionProperty;
      if (transition) {
        if (/transform|translate|scale|rotate|top|left/.test(transition)) moving.push(animation);
        continue;
      }
      const effect = animation.effect as KeyframeEffect | null;
      const frames = effect?.getKeyframes?.() ?? [];
      if (frames.some((frame) => "transform" in frame || "translate" in frame || "scale" in frame)) {
        moving.push(animation);
      }
    }
  }
  return moving;
}

function settled(target: Element): Promise<void> {
  const moving = movingAnimations(target);
  if (moving.length === 0) return Promise.resolve();
  return Promise.race([
    Promise.all(moving.map((animation) => animation.finished.catch(() => undefined))).then(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, FLIGHT_SETTLE_MAX_MS)),
  ]);
}

function findTarget(feature: string): HTMLElement | null {
  for (const element of document.querySelectorAll<HTMLElement>(`[data-feature-mark="${feature}"]`)) {
    if (element.getClientRects().length > 0) return element;
  }
  return null;
}

/**
 * Opens a feature from the key that was tapped. `go` is the navigation (or
 * the sheet opening); `into` says whether a page is coming, so the old one
 * is veiled while it changes, or a sheet, which brings its own backdrop.
 */
export function flyIntoFeature({
  source,
  feature,
  go,
  into = "page",
}: {
  source: Element;
  feature: string;
  go: () => void;
  into?: FlightInto;
}) {
  if (typeof window === "undefined") return go();
  if (flying || reducedMotion() || typeof document.body.animate !== "function") {
    go();
    return;
  }
  flying = true;

  const root = document.documentElement;
  const cosmic = root.dataset.interfaceMode === "yumi-cosmic";
  const from = source.getBoundingClientRect();
  const flyer = copyOf(source, from);
  root.dataset.featureFlight = feature;

  const veil = into === "page" ? document.createElement("div") : null;
  if (veil) {
    veil.setAttribute("data-feature-veil", "");
    veil.setAttribute("aria-hidden", "true");
    Object.assign(veil.style, {
      position: "fixed",
      inset: "0",
      zIndex: "9000",
      pointerEvents: "none",
      background: cosmic ? COSMIC_GROUND : STANDARD_GROUND,
    });
    document.body.appendChild(veil);
    veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FLIGHT_LIFT_MS, easing: "ease-out", fill: "forwards" });
  }
  document.body.appendChild(flyer);
  flyer.animate([{ transform: "translate(0, 0) scale(1)" }, { transform: "translate(0, -6px) scale(1.1)" }], {
    duration: FLIGHT_LIFT_MS,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    fill: "forwards",
  });
  /* While the page is on its way the key breathes, so a wait reads as
     loading rather than as a frozen screen. On `scale`, which composes with
     the flight's `transform` instead of replacing it. */
  const breathing = flyer.animate([{ scale: "1" }, { scale: "1.07" }, { scale: "1" }], {
    duration: 1100,
    delay: FLIGHT_LIFT_MS + 140,
    iterations: Infinity,
    easing: "ease-in-out",
  });

  let landed: HTMLElement | null = null;
  let done = false;
  const timers: number[] = [];
  let observer: MutationObserver | null = null;

  const finish = () => {
    if (done) return;
    done = true;
    flying = false;
    observer?.disconnect();
    window.removeEventListener(ROUTE_ARRIVED_EVENT, onArrived);
    timers.forEach((timer) => window.clearTimeout(timer));
    delete root.dataset.featureFlight;
    if (landed) landed.style.visibility = "";
    flyer.remove();
    veil?.remove();
  };
  timers.push(window.setTimeout(finish, FLIGHT_LIFETIME_MS));

  let veilLifted = !veil;
  function liftVeil() {
    if (veilLifted || !veil) return;
    veilLifted = true;
    veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FLIGHT_VEIL_FADE_MS, easing: "ease-out", fill: "forwards" });
  }

  /* No mark to land on (Scan's camera, or a page that never came): the key
     flies to the middle of the screen and opens into it. */
  function flyInto() {
    if (done) return;
    breathing?.cancel();
    liftVeil();
    delete root.dataset.featureFlight;
    const dx = window.innerWidth / 2 - (from.left + from.width / 2);
    const dy = window.innerHeight / 2 - (from.top + from.height / 2);
    const flight = flyer.animate(
      [
        { transform: "translate(0, -6px) scale(1.1)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(2.6)`, opacity: 0 },
      ],
      { duration: FLIGHT_MS, easing: FLIGHT_EASING, fill: "forwards" },
    );
    flight.onfinish = finish;
  }

  async function flyTo(target: HTMLElement) {
    if (done) return;
    await settled(target);
    if (done) return;
    breathing?.cancel();
    liftVeil();
    const to = target.getBoundingClientRect();
    const scale = to.width / Math.max(1, from.width);
    const dx = to.left - from.left;
    const dy = to.top - from.top;
    // A little arc: the key rises over its straight line on the way.
    const arc = Math.min(48, Math.hypot(dx, dy) * 0.18);
    const flight = flyer.animate(
      [
        { transform: "translate(0, -6px) scale(1.1)" },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - arc}px) scale(${(1.1 + scale) / 2 + 0.06})`, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
      ],
      { duration: FLIGHT_MS, easing: FLIGHT_EASING, fill: "forwards" },
    );
    flight.onfinish = () => {
      if (done) return;
      // Landed: the page's own mark takes over, with a small settle.
      target.style.visibility = "";
      landed = null;
      target.animate([{ transform: "scale(1.14)" }, { transform: "scale(1)" }], {
        duration: 260,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      });
      const out = flyer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: "forwards" });
      out.onfinish = finish;
    };
  }

  /* The mark to land on is hidden the moment it appears (a mutation
     callback runs before the frame is drawn), so it is never seen twice. */
  function watchForTarget(onFound: (target: HTMLElement) => void) {
    const look = () => {
      const target = findTarget(feature);
      if (!target) return false;
      observer?.disconnect();
      target.style.visibility = "hidden";
      landed = target;
      onFound(target);
      return true;
    };
    observer = new MutationObserver(() => {
      look();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    timers.push(window.setTimeout(() => {
      observer?.disconnect();
      if (!landed) flyInto();
    }, FLIGHT_TARGET_WAIT_MS));
  }

  let arrived = false;
  let found: HTMLElement | null = null;
  let launched = false;
  function ready() {
    if (launched || !arrived || !found) return;
    launched = true;
    void flyTo(found);
  }
  function onArrived() {
    window.removeEventListener(ROUTE_ARRIVED_EVENT, onArrived);
    arrived = true;
    liftVeil();
    if (found) return ready();
    // Arrived with nothing to land on: Scan's camera.
    timers.push(window.setTimeout(() => {
      if (found || done) return;
      observer?.disconnect();
      flyInto();
    }, 120));
  }

  timers.push(window.setTimeout(() => {
    if (done) return;
    if (into === "sheet") {
      watchForTarget((target) => void flyTo(target));
      go();
      return;
    }
    watchForTarget((target) => {
      found = target;
      ready();
    });
    window.addEventListener(ROUTE_ARRIVED_EVENT, onArrived);
    // A page RouteStage did not announce (it stands aside for the opening
    // or a mode switch) is flown to once the veil has waited long enough.
    timers.push(window.setTimeout(() => {
      arrived = true;
      liftVeil();
      ready();
    }, FLIGHT_VEIL_MAX_MS));
    go();
  }, FLIGHT_LIFT_MS));
}

/** For tests: forget a flight left half-played. */
export function resetFeatureFlightForTests() {
  flying = false;
  delete document.documentElement.dataset.featureFlight;
}
