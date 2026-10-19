import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The 404 for a hello: turned off, or never there

   The page answers 404 for both; a not-found file is given no props, so
   it asks get_yumi_hello which it is — "revoked" is all that call says of
   one that is off — and says loading until it knows, never one and then
   the other.
   ========================================================= */

const lookup = vi.hoisted(() => ({ id: "AbCdEfGhIjKl", answer: null as unknown, rpc: vi.fn() }));

vi.mock("next/navigation", () => ({ useParams: () => ({ id: lookup.id }) }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    rpc: (name: string, args: unknown) => {
      lookup.rpc(name, args);
      return Promise.resolve({ data: lookup.answer, error: null });
    },
  }),
}));

const { default: HelloNotFound } = await import("@/components/hello/HelloNotFound");

afterEach(() => {
  document.body.innerHTML = "";
  lookup.rpc.mockClear();
});

describe("a hello's 404", () => {
  it("says loading, then that it was turned off", async () => {
    lookup.answer = { status: "revoked" };
    render(<HelloNotFound />);
    expect(screen.getByRole("heading").textContent).toBe("Loading the invitation…");
    expect(await screen.findByText("This invitation has been turned off")).toBeTruthy();
    expect(lookup.rpc).toHaveBeenCalledWith("get_yumi_hello", { p_id: "AbCdEfGhIjKl" });
    expect(document.title).toBe("This invitation has been turned off");
  });

  it("says it could not be found when there is nothing", async () => {
    lookup.answer = null;
    render(<HelloNotFound />);
    expect(await screen.findByText("We couldn’t find this invitation")).toBeTruthy();
  });

  it("does not ask about an id of the wrong shape", () => {
    lookup.id = "nope";
    render(<HelloNotFound />);
    expect(screen.getByText("We couldn’t find this invitation")).toBeTruthy();
    expect(lookup.rpc).not.toHaveBeenCalled();
    lookup.id = "AbCdEfGhIjKl";
  });
});
