/* =========================================================
   From the landing page into sign-in, through Yumi's eye
   (Chi, 2026-11-21: 把登入按鈕做得更酷，按下去後轉換到登入頁面的動畫)

   Pressing a "Start" key closes the page like an eye: deep space grows out
   of the key itself, a circle opening to cover the screen, and Yumi's eye
   comes up in the middle of it. The sign-in page then opens out of that
   eye as it arrives (LoginScreen calls playLoginArrival).

   The cover is one fixed element on <body>, outside React, so it lasts
   across the client navigation to /login; if that page never comes (an
   error, a cancelled navigation) it lets go by itself. Transform, opacity
   and clip-path only. Under reduced motion there is no cover at all: the
   key simply goes to /login.
   ========================================================= */

const COVER = "data-login-cover";
const CLOSE_MS = 520;
const OPEN_MS = 560;
const GIVE_UP_MS = 4000;

function reducedMotion() {
  return typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const EYE = `
<svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
  <circle cx="60" cy="60" r="34" fill="none" stroke="#f4f7fb" stroke-width="11"/>
  <circle cx="60" cy="60" r="15" fill="#0b0f18"/>
  <circle cx="54" cy="53" r="4.2" fill="#f4f7fb"/>
</svg>`;

/**
 * Closes the landing page into Yumi's eye from `from` (the pressed key),
 * then calls `go`. With reduced motion, or no Web Animations, `go` runs at
 * once.
 */
export function playLoginExit(from: HTMLElement, navigate: () => void) {
  let gone = false;
  const go = () => {
    if (gone) return;
    gone = true;
    navigate();
  };
  if (reducedMotion() || typeof document.body.animate !== "function") {
    go();
    return;
  }
  document.querySelectorAll(`[${COVER}]`).forEach(node => node.remove());

  const box = from.getBoundingClientRect();
  const x = Math.round(box.left + box.width / 2);
  const y = Math.round(box.top + box.height / 2);
  // Far enough to cover the furthest corner from the key.
  const reach = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)));

  const cover = document.createElement("div");
  cover.setAttribute(COVER, "");
  cover.setAttribute("aria-hidden", "true");
  Object.assign(cover.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2000",
    display: "grid",
    placeItems: "center",
    pointerEvents: "none",
    background: "radial-gradient(circle at 50% 48%, #16233a 0%, #070b12 62%)",
    clipPath: `circle(0px at ${x}px ${y}px)`,
  });
  const eye = document.createElement("div");
  eye.innerHTML = EYE;
  Object.assign(eye.style, { opacity: "0", filter: "drop-shadow(0 0 22px rgba(184, 232, 229, 0.55))" });
  cover.appendChild(eye);
  document.body.appendChild(cover);

  cover.animate(
    [{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${reach}px at ${x}px ${y}px)` }],
    { duration: CLOSE_MS, easing: "cubic-bezier(0.77, 0, 0.175, 1)", fill: "forwards" },
  );
  const look = eye.animate(
    [
      { opacity: 0, transform: "scale(0.55)" },
      { opacity: 1, transform: "scale(1)" },
    ],
    { duration: 300, delay: CLOSE_MS - 220, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" },
  );
  look.onfinish = go;
  // If the eye's animation never finishes (a hidden tab), still go.
  window.setTimeout(go, CLOSE_MS + 400);
  window.setTimeout(() => cover.isConnected && cover.remove(), CLOSE_MS + GIVE_UP_MS);
}

/**
 * Opens the sign-in page out of the eye the landing page closed into. Does
 * nothing on a sign-in page reached any other way.
 */
export function playLoginArrival() {
  const cover = document.querySelector<HTMLElement>(`[${COVER}]`);
  if (!cover) return;
  if (reducedMotion() || typeof cover.animate !== "function") {
    cover.remove();
    return;
  }
  const eye = cover.firstElementChild as HTMLElement | null;
  eye?.animate(
    [
      { opacity: 1, transform: "scale(1)" },
      { opacity: 0, transform: "scale(1.9)" },
    ],
    { duration: OPEN_MS, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" },
  );
  const open = cover.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: OPEN_MS,
    delay: 90,
    easing: "cubic-bezier(0.23, 1, 0.32, 1)",
    fill: "forwards",
  });
  open.onfinish = () => cover.remove();
  window.setTimeout(() => cover.isConnected && cover.remove(), OPEN_MS + 600);
}
