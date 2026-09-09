import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/* =========================================================
   The camera key opens this app's camera

   This file used to assert the opposite — that the key clicked a native
   file input and drew no menu of its own. That was right when the system
   sheet was the whole feature: on iOS it offers Photo Library, Take Photo
   and Choose File, and letting the platform own that beat drawing our own
   popover.

   It stopped being right when the app grew a camera. "Take Photo" handed
   over to Apple's, with its own shutter, its own mode pills and its own
   zoom stops — a different camera from the one every other capture surface
   uses, reached from four search fields. The key opens TargetCamera now.

   The photo library is not lost; it moved one level in, to the picker
   TargetCamera carries. That is asserted here too, because "we replaced the
   system sheet" is only an improvement if nothing it offered went away.
   ========================================================= */

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => "english",
}));

const { default: LexiconImageMenu } = await import(
  "@/components/lexicon/LexiconImageMenu"
);

function open() {
  fireEvent.click(screen.getByRole("button", { name: "Scan" }));
}

describe("the search camera key", () => {
  it("opens no camera until it is pressed", () => {
    render(<LexiconImageMenu onFile={vi.fn()} onCapture={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: "Capture photo" }),
    ).not.toBeInTheDocument();
  });

  it("opens this app's camera rather than the system one", () => {
    render(<LexiconImageMenu onFile={vi.fn()} onCapture={vi.fn()} />);

    open();

    // The shutter and the close control are TargetCamera's, and are what
    // tells this apart from the platform sheet that used to appear.
    expect(
      screen.getByRole("button", { name: "Capture photo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Close camera" }),
    ).toBeInTheDocument();
  });

  it("still offers the photo library, one level in", () => {
    render(<LexiconImageMenu onFile={vi.fn()} onCapture={vi.fn()} />);

    open();

    expect(
      screen.getByRole("button", { name: "Photo library" }),
    ).toBeInTheDocument();

    const picker = document.querySelector('input[type="file"][accept="image/*"]');

    expect(picker).not.toBeNull();
  });

  it("closes when the camera is dismissed", () => {
    render(<LexiconImageMenu onFile={vi.fn()} onCapture={vi.fn()} />);

    open();
    fireEvent.click(screen.getByRole("button", { name: "Close camera" }));

    expect(
      screen.queryByRole("button", { name: "Capture photo" }),
    ).not.toBeInTheDocument();
  });

  it("hands a chosen image to recognition, and closes once it is read", async () => {
    /*
     * Closes after, not before. The camera stays up while the photograph is
     * being read so "Analysing target…" has somewhere to appear — closing
     * on the tap made the screen vanish with no feedback for the seconds
     * recognition takes.
     */
    const onFile = vi.fn();
    render(<LexiconImageMenu onFile={onFile} onCapture={vi.fn()} />);

    open();

    const picker = document.querySelector<HTMLInputElement>(
      'input[type="file"][accept="image/*"]',
    );
    const image = new File(["image"], "lamp.jpg", { type: "image/jpeg" });

    fireEvent.change(picker!, { target: { files: [image] } });

    expect(onFile).toHaveBeenCalledWith(image);

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Capture photo" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("offers the photo library when the camera is refused", async () => {
    /*
     * The key it replaced needed no camera permission at all, so a reader
     * who has denied it now meets a black rectangle where a picker used to
     * be. "Try again" cannot help — on iOS the decision is sticky per site
     * — but choosing a photo can, and it is the path this key used to take.
     */
    render(<LexiconImageMenu onFile={vi.fn()} onCapture={vi.fn()} />);

    open();

    await screen.findByRole("button", { name: "Try again" });

    // Two of them now: the corner key, and the one inside the notice.
    expect(
      screen.getAllByRole("button", { name: "Photo library" }).length,
    ).toBeGreaterThan(1);
  });

  it("says the camera is unavailable rather than failing silently", async () => {
    /*
     * There is no getUserMedia in this runner, which is the same situation
     * as a browser that refuses the camera. The reader gets a sentence and
     * a retry, not a black rectangle.
     *
     * Awaited because the stream hook defers its first attempt by a
     * microtask — opening the camera and reporting that it cannot open are
     * deliberately two different frames, so the reader never sees an error
     * flash before the permission prompt has been asked for.
     */
    render(<LexiconImageMenu onFile={vi.fn()} onCapture={vi.fn()} />);

    open();

    expect(
      await screen.findByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });
});
