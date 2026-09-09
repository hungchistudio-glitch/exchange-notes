import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AvatarCropper from "@/components/settings/AvatarCropper";

/* =========================================================
   The cropper's wiring

   The arithmetic is covered by tests/circleCrop.test.ts, which needs no DOM.
   What is checked here is everything between that arithmetic and a reader:
   the controls exist, they are reachable without a pointer, and the sheet
   does not fall over on a copy key that was never added.
   ========================================================= */

const preferences = vi.hoisted(() => ({ interfaceLanguage: "english" }));

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => preferences.interfaceLanguage,
}));

function open(overrides: Partial<React.ComponentProps<typeof AvatarCropper>> = {}) {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();

  render(
    <AvatarCropper
      src="blob:photo"
      busy={false}
      onCancel={onCancel}
      onConfirm={onConfirm}
      {...overrides}
    />,
  );

  return { onCancel, onConfirm };
}

describe("escaping the sheet it opens from", () => {
  /*
   * The bug this exists for. The cropper opens from inside Edit profile,
   * which is a BottomSheet, and a BottomSheet's panel is animated with
   * `transform` — which makes it the containing block for any `position:
   * fixed` descendant. Nested, the cropper's overlay was pinned to the sheet
   * rather than to the viewport, inside that sheet's own scroll container,
   * with its backdrop laid over its own controls. Nothing in it responded:
   * not the photo, not the zoom slider, not the close button.
   */
  it("renders outside a transformed ancestor, not inside it", () => {
    const { container } = render(
      <div style={{ transform: "translateZ(0)" }} data-testid="sheet-panel">
        <AvatarCropper
          src="blob:photo"
          busy={false}
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      </div>,
    );

    const panel = container.querySelector("[data-testid='sheet-panel']")!;
    const dialog = screen.getByRole("dialog");

    expect(panel).toBeInTheDocument();
    // The whole point: the overlay is not a descendant of the transformed
    // element, so `fixed` means fixed.
    expect(panel.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it("puts its controls where a press can reach them", async () => {
    const onCancel = vi.fn();

    render(
      <div style={{ transform: "translateZ(0)" }}>
        <AvatarCropper
          src="blob:photo"
          busy={false}
          onCancel={onCancel}
          onConfirm={() => {}}
        />
      </div>,
    );

    await userEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe("the avatar cropper", () => {
  it("names what it is asking for", () => {
    open();

    expect(screen.getByText("Position your photo")).toBeInTheDocument();
    expect(
      screen.getByText(/Whatever fills the circle is what people will see/),
    ).toBeInTheDocument();
  });

  it("offers a zoom control that is not a gesture", () => {
    // Pinch is unavailable with a mouse, on a trackpad without gestures, and
    // to anyone driving the page from a keyboard. The slider is the route
    // that always exists.
    open();

    const zoom = screen.getByLabelText("Zoom");
    expect(zoom).toHaveAttribute("type", "range");
  });

  it("gives the draggable circle an accessible name", () => {
    open();

    expect(
      screen.getByLabelText("Profile photo preview — drag to reposition"),
    ).toBeInTheDocument();
  });

  it("can be abandoned without uploading anything", async () => {
    const { onCancel, onConfirm } = open();

    await userEvent.click(screen.getByText("Cancel"));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("will not confirm before the photo has been measured", async () => {
    // jsdom decodes nothing, so the image never loads — which is exactly the
    // state a reader is in for the first moment of a slow photo, and
    // confirming then would export an empty canvas.
    const { onConfirm } = open();

    const use = screen.getByText("Use photo");
    expect(use).toBeDisabled();

    await userEvent.click(use);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("locks both actions while the upload is running", () => {
    open({ busy: true });

    expect(screen.getByText("Cancel")).toBeDisabled();
    expect(screen.getByLabelText("Zoom")).toBeDisabled();
    expect(screen.getByText("Uploading…")).toBeDisabled();
  });
});
