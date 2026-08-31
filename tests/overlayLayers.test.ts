import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/* =========================================================
   The camera has to be above whatever opened it

   Reported from a phone: tapping the camera key inside the lexicon search
   sheet started the stream — the recording light came on — and drew the
   viewfinder underneath the sheet that launched it. A working camera nobody
   could see, which reads as a camera that will not open.

   The cause was two numbers in two files with nothing relating them: the
   camera at z-100, the sheet at z-130. Nothing in the type system or the
   test suite could notice, because a stacking order is not expressed
   anywhere — it is an emergent property of every `z-[N]` in the codebase.

   So it is asserted here, from the source, which is the only place the
   relationship actually exists. Not elegant; the alternative is finding out
   from a screenshot again.
   ========================================================= */

const ROOT = process.cwd();

function layerOf(file: string): number {
  const source = readFileSync(join(ROOT, file), "utf8");

  /*
   * The first z-[N] in the file, which in every one of these is the root
   * overlay element. A component that grows a second, higher layer inside
   * itself would need this reading to get more specific — deliberately not
   * anticipated, so it fails loudly rather than silently comparing the
   * wrong pair.
   */
  const match = source.match(/z-\[(\d+)\]/);

  if (!match) throw new Error(`${file} declares no z-[N] layer`);

  return Number(match[1]);
}

const CAMERA = "components/camera/TargetCamera.tsx";
const VIEWER = "components/camera/TargetImageViewer.tsx";
const SEARCH_SHEET = "components/lexicon/LexiconSearchSheet.tsx";
const BOTTOM_SHEET = "components/foundation/overlays/BottomSheet.tsx";
const TUTORIAL = "components/tutorial/TutorialOverlay.tsx";
const FRIEND_PICKER = "components/vocabulary/FriendPickerModal.tsx";

describe("where the camera sits in the stack", () => {
  it("covers the lexicon search sheet that opens it", () => {
    // The exact failure that was reported. Four search surfaces mount the
    // camera key and this is the one that sits highest.
    expect(layerOf(CAMERA)).toBeGreaterThan(layerOf(SEARCH_SHEET));
  });

  it("covers a plain bottom sheet", () => {
    expect(layerOf(CAMERA)).toBeGreaterThan(layerOf(BOTTOM_SHEET));
  });

  it("covers the tutorial overlay", () => {
    expect(layerOf(CAMERA)).toBeGreaterThan(layerOf(TUTORIAL));
  });

  it("stays under the top modal layer it never shares a moment with", () => {
    /*
     * The friend picker opens from a result card, after recognition has
     * finished and the camera has closed. Keeping the camera below it means
     * that if the two ever did overlap, the thing asking for a decision
     * wins — which is the right way round.
     */
    expect(layerOf(CAMERA)).toBeLessThan(layerOf(FRIEND_PICKER));
  });

  it("puts the imported-photo viewer on the camera's own layer", () => {
    // They are two halves of one flow and are never on screen together;
    // drifting apart would mean one of them could be buried on its own.
    expect(layerOf(VIEWER)).toBe(layerOf(CAMERA));
  });
});
