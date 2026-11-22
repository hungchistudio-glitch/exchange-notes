/* =========================================================
   A small burst of light, for a thing just kept
   (Chi, 2026-11-22: 收藏時迸出小粒子)

   A ring opens and a dozen specks fly out from a point, slow down and
   fade, in about half a second. Transform and opacity only, on a fixed
   layer of its own, so it never moves the page. Used where a word is
   saved; nothing under reduced motion.
   ========================================================= */

const SPECKS = 12;
const BURST_MS = 620;

export function burstFrom(element: Element, { color = "#e2b65a" }: { color?: string } = {}) {
  if (typeof window === "undefined" || typeof document.body.animate !== "function") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const icon = element.querySelector("svg") ?? element;
  const box = icon.getBoundingClientRect();
  if (!box.width) return;
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;

  const field = document.createElement("div");
  field.setAttribute("aria-hidden", "true");
  Object.assign(field.style, { position: "fixed", left: `${x}px`, top: `${y}px`, width: "0", height: "0", pointerEvents: "none", zIndex: "9001" });

  const ring = document.createElement("span");
  Object.assign(ring.style, {
    position: "absolute",
    left: "-22px",
    top: "-22px",
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    border: `1.5px solid ${color}`,
  });
  field.appendChild(ring);
  ring.animate(
    [
      { transform: "scale(0.2)", opacity: 0.9 },
      { transform: "scale(1.15)", opacity: 0 },
    ],
    { duration: 480, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
  );

  for (let i = 0; i < SPECKS; i++) {
    const angle = (Math.PI * 2 * i) / SPECKS + (Math.random() - 0.5) * 0.4;
    const reach = 22 + Math.random() * 18;
    const size = 3 + Math.random() * 3;
    const speck = document.createElement("span");
    Object.assign(speck.style, {
      position: "absolute",
      left: `${-size / 2}px`,
      top: `${-size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "50%",
      background: i % 3 === 0 ? "#ffffff" : color,
      boxShadow: `0 0 6px ${color}`,
    });
    field.appendChild(speck);
    speck.animate(
      [
        { transform: "translate(0px, 0px) scale(0.4)", opacity: 0 },
        { opacity: 1, offset: 0.12 },
        { transform: `translate(${Math.cos(angle) * reach}px, ${Math.sin(angle) * reach}px) scale(1)`, opacity: 0.9, offset: 0.55 },
        { transform: `translate(${Math.cos(angle) * reach * 1.2}px, ${Math.sin(angle) * reach * 1.2 + 6}px) scale(0.3)`, opacity: 0 },
      ],
      { duration: BURST_MS, delay: Math.random() * 40, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
    );
  }
  document.body.appendChild(field);
  window.setTimeout(() => field.remove(), BURST_MS + 120);
}
