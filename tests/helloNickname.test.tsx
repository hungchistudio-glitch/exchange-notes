import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   A nickname before a hello goes out under an Exchange ID

   Shown above Create to a reader whose hello would name them only as
   "@user_…". A nickname a hello would not show (a phone number, a link)
   is refused here with the reason, before anything is saved; a good one
   is saved to their own profile, and the preview takes it.
   ========================================================= */

const db = vi.hoisted(() => ({ update: vi.fn(), eq: vi.fn(), error: null as { message: string } | null }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      update: (values: unknown) => {
        db.update(values);
        return {
          eq: async (column: string, value: string) => {
            db.eq(column, value);
            return { error: db.error };
          },
        };
      },
    }),
  }),
}));

const { default: HelloNicknamePrompt } = await import("@/components/hello/HelloNicknamePrompt");

beforeEach(() => {
  db.update.mockClear();
  db.eq.mockClear();
  db.error = null;
});

afterEach(() => {
  document.body.innerHTML = "";
});

function prompt() {
  const onSaved = vi.fn();
  render(<HelloNicknamePrompt userId="user-1" exchangeId="user_f0614461b9684ad9895" onSaved={onSaved} />);
  const field = screen.getByRole("textbox", { name: "Nickname" });
  const save = () => fireEvent.click(screen.getByRole("button", { name: "Save nickname" }));
  return { onSaved, field, save };
}

describe("the nickname prompt", () => {
  it("says what the hello would show instead", () => {
    prompt();
    expect(screen.getByText(/@user_f0614461b9684ad9895/)).toBeTruthy();
  });

  it("refuses a nickname a hello would not show, and saves nothing", () => {
    const { field, save, onSaved } = prompt();
    fireEvent.change(field, { target: { value: "Support 0912345678" } });
    save();
    expect(screen.getByRole("status").textContent).toMatch(/can’t include/);
    expect(db.update).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("saves a good one to the reader's own profile", async () => {
    const { field, save, onSaved } = prompt();
    fireEvent.change(field, { target: { value: "  Hung-Chi " } });
    save();
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("Hung-Chi"));
    expect(db.update).toHaveBeenCalledWith({ display_name: "Hung-Chi" });
    expect(db.eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("says when saving failed", async () => {
    db.error = { message: "nope" };
    const { field, save, onSaved } = prompt();
    fireEvent.change(field, { target: { value: "Chi" } });
    save();
    expect(await screen.findByText("The nickname wasn’t saved. Try again.")).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
