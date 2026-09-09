import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AppViewport from "@/components/foundation/layout/AppViewport";
import BottomSheet from "@/components/foundation/overlays/BottomSheet";

describe("the protected app viewport", () => {
  it("keeps persistent navigation outside the page scroller", () => {
    render(
      <AppViewport navigation={<nav data-testid="dock">Navigation</nav>}>
        <main>Long page</main>
      </AppViewport>,
    );

    const viewport = screen.getByText("Long page").closest(
      "[data-app-viewport]",
    );
    const scroller = screen.getByText("Long page").closest(
      "[data-app-scroll-viewport]",
    );
    const dock = screen.getByTestId("dock");

    expect(viewport).toHaveClass("h-[100dvh]", "overflow-hidden");
    expect(scroller).toHaveClass(
      "h-full",
      "overflow-y-auto",
      "overflow-x-clip",
      "overscroll-y-none",
    );
    expect(dock.parentElement).toBe(viewport);
    expect(scroller).not.toContainElement(dock);
  });

  it("locks the page behind a sheet and restores it when the sheet closes", () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <>
        <div
          data-app-scroll-viewport
          data-testid="page-scroller"
          style={{ overflowY: "auto", overscrollBehavior: "contain" }}
        />
        <BottomSheet
          open
          onClose={onClose}
          title="Article"
          footer={<button type="button">Save</button>}
        >
          <p>Long article content</p>
        </BottomSheet>
      </>,
    );

    const pageScroller = screen.getByTestId("page-scroller");
    const dialog = screen.getByRole("dialog", { name: "Article" });
    const contentScroller = screen.getByText("Long article content").parentElement;
    const footer = screen.getByRole("button", { name: "Save" }).closest("footer");

    expect(pageScroller).toHaveStyle({ overflowY: "hidden" });
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.position).toBe("fixed");
    expect(dialog).toHaveClass("flex", "flex-col", "overflow-hidden");
    expect(dialog).toHaveStyle({
      maxHeight: "calc(100dvh - max(3rem, env(safe-area-inset-top)))",
    });
    expect(contentScroller).toHaveClass(
      "min-h-0",
      "flex-1",
      "overflow-y-auto",
      "overscroll-contain",
    );
    expect(footer).toHaveClass("shrink-0");

    unmount();

    expect(pageScroller.style.overflowY).toBe("auto");
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.position).toBe("");
  });
});
