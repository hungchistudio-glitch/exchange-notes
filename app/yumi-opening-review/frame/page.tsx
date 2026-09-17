import YumiPrismLaunch from "@/components/launch/YumiPrismLaunch";
import { computeYumiPrismFrame } from "@/components/launch/yumiPrismTimeline";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

export const metadata = {
  title: "Yumi Prism opening — one frame",
  robots: { index: false, follow: false },
};

/* =========================================================
   One authored frame of the opening, held still

   The two routes beside this one play the film. Nothing could photograph it.
   A 2.8-second animation cannot be captured through a tool that takes
   several seconds per round trip — by the time the next call arrives the
   film has finished — and headless Chrome's --virtual-time-budget spends
   most of its budget on the page load, so it lands somewhere arbitrary and
   early. Reviewing the choreography meant describing it instead of showing
   it, and a frame nobody can look at is a frame nobody checks.

   So this route takes the time as a query parameter and holds it:

     /yumi-opening-review/frame?t=1460
     /yumi-opening-review/frame?t=2060&mode=cosmic

   scripts/capture-opening-frames.mjs drives it through the DevTools protocol
   to render a whole film to disk.

   ── The readiness signal is the frame, not the request ──────────────────

   The obvious way to say "this frame is ready" is the scrubber's value, and
   it is wrong: writing that value is what *asks* for the frame, so a capture
   that fires on it photographs whatever was on screen before the answer. It
   is also wrong invisibly. The first version of this shipped a whole reel of
   Cosmic Mode that was a flat grey wash, and it looked plausible enough —
   the curtain that opens the film really is a grey wash over obsidian for
   its first 160ms — that it took a frame from the far end of the film,
   where the lockup should have been, to see that nothing had seeked at all.

   The frame the reader asked for is computed here, on the server, by the
   same function the film itself runs on. The page then seeks until what is
   painted matches it, and only then says so. The oracle and the animation
   cannot drift, because they are the same arithmetic.
   ========================================================= */
export default async function OpeningFramePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; mode?: string }>;
}) {
  reviewRouteOnly();

  const { t = "0", mode } = await searchParams;
  const time = Number(t) || 0;
  const frame = computeYumiPrismFrame(time);

  /*
   * Four of the twenty-two variables, not all of them. These are the ones
   * that move on different curves and in different halves of the film — the
   * ground, the curtain, the lens and the wordmark — so no single stale
   * paint can match all four by accident, and comparing four short strings
   * is cheap enough to run on every tick.
   */
  const want = {
    scene: frame["--scene-opacity"],
    dawn: frame["--dawn-opacity"],
    actor: frame["--actor-opacity"],
    word: frame["--wordmark-opacity"],
  };

  return (
    <main>
      {/* The film has to be the only thing in the picture. The renderer's
          controls are what the seek goes through, so they stay in the DOM
          and leave the frame. */}
      <style>{`
        nextjs-portal, #__next-build-watcher { display: none !important; }
        html, body { margin: 0; }
        section[aria-label="開場動畫控制"] { opacity: 0 !important; pointer-events: none; }
      `}</style>

      <YumiPrismLaunch launchId="yumi-prism-v1-frame" reviewMode />

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              var t = ${JSON.stringify(time)};
              var want = ${JSON.stringify(want)};
              if (${JSON.stringify(mode === "cosmic")}) {
                document.documentElement.dataset.interfaceMode = "yumi-cosmic";
              }
              var setValue = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, "value").set;
              var tries = 0;
              var timer = setInterval(function () {
                if (tries++ > 600) { clearInterval(timer); return; }
                var root = document.querySelector("[data-launch-id]");
                var scrubber = document.querySelector('input[type="range"]');
                if (!root || !scrubber) return;
                var style = root.style;
                if (style.getPropertyValue("--scene-opacity") === want.scene
                  && style.getPropertyValue("--dawn-opacity") === want.dawn
                  && style.getPropertyValue("--actor-opacity") === want.actor
                  && style.getPropertyValue("--wordmark-opacity") === want.word) {
                  clearInterval(timer);
                  document.documentElement.setAttribute("data-frame-ready", "1");
                  return;
                }
                // Ask again: the review clock is still running until it seeks.
                setValue.call(scrubber, String(t));
                scrubber.dispatchEvent(new Event("change", { bubbles: true }));
              }, 16);
            })();
          `,
        }}
      />
    </main>
  );
}
