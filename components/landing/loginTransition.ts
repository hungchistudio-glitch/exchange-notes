/* =========================================================
   From the landing page into sign-in, through Yumi's eye
   (Chi, 2026-11-21: 按鈕變成 Yumi 的眼睛，約 0.8 秒，俐落)

   One movement, about 0.8 seconds in all:

   1. The key becomes her eye (0–200ms): the pressed pill draws in to a
      circle as her white eye opens where it was, pupil and glint.
   2. Through the pupil (180–560ms): the pupil's dark spreads out from the
      key to fill the screen while the eye glides to the middle of it, as
      if the reader were drawn in. Sign-in is asked for the moment the
      screen is covered, and was already being fetched since the press.
   3. Out of it (on arrival, ~420ms): LoginScreen calls playLoginArrival;
      the eye draws back into the card's own Yumi as the dark clears and
      the card comes forward out of the middle.

   While sign-in is still on its way the glint breathes, so a slow network
   is a held moment rather than a stall.

   The cover is on <body>, outside React, so it lasts across the client
   navigation; if sign-in never comes it lets go by itself. Transform,
   opacity and clip-path only, on small or flat layers: no element larger
   than the screen is ever scaled. Reduced motion: no cover, straight to
   sign-in.
   ========================================================= */

const COVER = "data-login-cover";
const EYE = "data-login-eye";
/** The key draws in and her eye opens. */
const FORM_MS = 200;
/** The pupil's dark covers the screen; sign-in is asked for at the end. */
const DRAW_IN_MS = 380;
const ARRIVE_MS = 420;
const GIVE_UP_MS = 5000;
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";

function reducedMotion() {
  return typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function fixed(style: Partial<CSSStyleDeclaration>) {
  const element = document.createElement("div");
  element.setAttribute("aria-hidden", "true");
  Object.assign(element.style, { position: "fixed", pointerEvents: "none", ...style });
  return element;
}

/**
 * Closes the landing page into Yumi's eye from `from` (the pressed key),
 * then calls `navigate`, once. With reduced motion, or no Web Animations,
 * it navigates at once.
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
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const cx = innerWidth / 2;
  const cy = innerHeight / 2;
  // Her eye where the key was, a little larger than its height.
  const size = Math.round(Math.min(96, Math.max(56, box.height * 1.4)));
  const pupil = Math.round(size * 0.44);
  // Far enough to cover the furthest corner from the key.
  const reach = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)));

  const cover = fixed({ inset: "0", zIndex: "2000" });
  cover.setAttribute(COVER, "");

  // 1. The key, as a plain pill of its own colour, drawing in to a circle.
  const look = getComputedStyle(from);
  const pill = fixed({
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    borderRadius: `${box.height / 2}px`,
    backgroundColor: look.backgroundColor,
    backgroundImage: look.backgroundImage,
  });

  // 2. The pupil's dark, spreading from the key.
  const dark = fixed({
    inset: "0",
    background: "radial-gradient(circle at 50% 46%, #17243b 0%, #070b12 64%)",
    clipPath: `circle(${pupil / 2}px at ${x}px ${y}px)`,
    opacity: "0",
  });

  // Her eye: white, a dark pupil, one glint. The wrapper glides it to the
  // middle; the eye inside opens. A fine dark ring keeps it legible on the
  // light page before the dark reaches it.
  const glide = fixed({
    left: `${x - size / 2}px`,
    top: `${y - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
  });
  glide.setAttribute(EYE, "");
  const eye = fixed({
    position: "absolute",
    inset: "0",
    borderRadius: "50%",
    background: "#f4f7fb",
    boxShadow: "0 0 0 1.5px rgba(7, 11, 18, 0.85), 0 0 28px rgba(184, 232, 229, 0.55)",
    opacity: "0",
    transform: "scale(0.6)",
  });
  glide.appendChild(eye);
  const iris = fixed({
    position: "absolute",
    left: `${(size - pupil) / 2}px`,
    top: `${(size - pupil) / 2}px`,
    width: `${pupil}px`,
    height: `${pupil}px`,
    borderRadius: "50%",
    background: "radial-gradient(circle at 50% 50%, #17243b 0%, #070b12 70%)",
  });
  const glint = fixed({
    position: "absolute",
    left: `${size / 2 - pupil * 0.28}px`,
    top: `${size / 2 - pupil * 0.3}px`,
    width: `${Math.max(5, pupil * 0.22)}px`,
    height: `${Math.max(5, pupil * 0.22)}px`,
    borderRadius: "50%",
    background: "#ffffff",
  });
  iris.appendChild(glint);
  eye.appendChild(iris);
  cover.append(pill, dark, glide);
  document.body.appendChild(cover);
  // The key itself steps aside for its stand-in, or the stand-in drawing in
  // over an identical key would not be seen to move.
  const visibility = from.style.visibility;
  from.style.visibility = "hidden";

  // 1. The key draws in to her eye's width and gives way to it.
  pill.animate(
    [
      { left: `${box.left}px`, width: `${box.width}px`, opacity: 1 },
      { left: `${x - box.height / 2}px`, width: `${box.height}px`, opacity: 1, offset: 0.8 },
      { left: `${x - box.height / 2}px`, width: `${box.height}px`, opacity: 0 },
    ],
    { duration: FORM_MS + 20, easing: EASE_OUT, fill: "forwards" },
  );
  // Her eye opens where the key was, whole before the key has gone, so
  // there is never a moment with neither on the screen.
  eye.animate(
    [
      { opacity: 0, transform: "scale(0.6)" },
      { opacity: 1, transform: "scale(1)" },
    ],
    { duration: 130, delay: 60, easing: EASE_OUT, fill: "forwards" },
  );
  // ...and glides to the middle as the dark comes in behind it.
  glide.animate(
    [
      { transform: "translate(0, 0) scale(1)" },
      { transform: `translate(${cx - x}px, ${cy - y}px) scale(1.15)` },
    ],
    { duration: DRAW_IN_MS - 20, delay: FORM_MS, easing: EASE_IN_OUT, fill: "forwards" },
  );

  // 2. Through the pupil: its dark spreads from the key as the eye opens.
  const drawIn = dark.animate(
    [
      { opacity: 1, clipPath: `circle(${pupil / 2}px at ${x}px ${y}px)` },
      { opacity: 1, clipPath: `circle(${reach}px at ${x}px ${y}px)` },
    ],
    { duration: DRAW_IN_MS + 20, delay: FORM_MS - 80, easing: EASE_IN_OUT, fill: "forwards" },
  );
  drawIn.onfinish = () => {
    go();
    // Held while sign-in is on its way: the glint breathes.
    glint.animate([{ opacity: 1 }, { opacity: 0.35 }, { opacity: 1 }], {
      duration: 900,
      iterations: Infinity,
      easing: "ease-in-out",
    });
  };
  // If the animation never finishes (a hidden tab), still go.
  window.setTimeout(go, FORM_MS + DRAW_IN_MS + 300);
  window.setTimeout(() => {
    if (cover.isConnected) cover.remove();
    // Still on the landing page (sign-in never came): the key comes back.
    if (from.isConnected) from.style.visibility = visibility;
  }, FORM_MS + DRAW_IN_MS + GIVE_UP_MS);
}

/**
 * Opens the sign-in page out of the eye the landing page closed into: the
 * eye draws back toward `card`, the dark clears, and the card comes forward
 * out of the middle. Does nothing on a sign-in page reached any other way.
 */
export function playLoginArrival(card?: HTMLElement | null) {
  const cover = document.querySelector<HTMLElement>(`[${COVER}]`);
  if (!cover) return;
  if (reducedMotion() || typeof cover.animate !== "function") {
    cover.remove();
    return;
  }
  const eye = cover.querySelector<HTMLElement>(`[${EYE}]`);
  if (eye) {
    // From wherever it is now: keep the glide's last frame, drop the glide.
    for (const animation of eye.getAnimations?.() ?? []) {
      try {
        animation.commitStyles();
      } catch {
        // Not rendered: it simply starts from its own style.
      }
      animation.cancel();
    }
    eye.animate(
      [
        { opacity: 1, transform: getComputedStyle(eye).transform },
        { opacity: 0, transform: `${getComputedStyle(eye).transform} scale(0.35)` },
      ],
      { duration: ARRIVE_MS - 120, easing: EASE_OUT, fill: "forwards" },
    );
  }
  card?.animate(
    [
      { opacity: 0, transform: "scale(0.9)" },
      { opacity: 1, transform: "scale(1)" },
    ],
    { duration: ARRIVE_MS, delay: 60, easing: EASE_OUT, fill: "backwards" },
  );
  const open = cover.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: ARRIVE_MS,
    delay: 40,
    easing: EASE_OUT,
    fill: "forwards",
  });
  open.onfinish = () => cover.remove();
  window.setTimeout(() => cover.isConnected && cover.remove(), ARRIVE_MS + 600);
}
