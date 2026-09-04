import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import english from "@/lib/i18n/en";

/* =========================================================
   Being told the truth about a handle you are still typing

   The availability check was debounced, and the debounce cleared the pending
   timer — but a lookup already in flight could not be called back. Two
   overlapping lookups could resolve in either order, and the screen showed
   whichever landed last, against whatever the field said by then.

   That is not cosmetic. `canContinue` gates on the status, so a stale
   "available" let a reader walk out of onboarding holding a handle somebody
   else already owns, and a stale "taken" blocked one that was free.

   The fix is the shape EditProfileSheet already used for the same lookup:
   keep the answer with the handle it was an answer to, so a stale one no
   longer matches and reads as "still checking" — which is what it is.
   ========================================================= */

const lookups = vi.hoisted(() => ({
  // Resolvers parked by handle, so a test decides the order they come back in.
  pending: new Map<string, (taken: boolean) => void>(),
  calls: [] as string[],
}));

vi.mock("@/lib/friends", () => ({
  findProfileByExchangeId: (_supabase: unknown, exchangeId: string) => {
    lookups.calls.push(exchangeId);

    return new Promise((resolve) => {
      lookups.pending.set(exchangeId, (taken: boolean) =>
        resolve(taken ? { id: "someone-else" } : null),
      );
    });
  },
}));

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

const NameStep = (await import("@/components/onboarding/steps/NameStep")).default;

const copy = english.onboarding.name;
const continueLabel = english.onboarding.continue;

function Harness() {
  const [exchangeId, setExchangeId] = useState("user_9f2a1c");

  return (
    <NameStep
      userId="me"
      displayName="Reader"
      exchangeId={exchangeId}
      avatarUrl={null}
      initialExchangeId="user_9f2a1c"
      saving={false}
      error=""
      onChangeDisplayName={() => {}}
      onChangeExchangeId={setExchangeId}
      onChangeAvatarUrl={() => {}}
      onContinue={() => {}}
    />
  );
}

function handleField() {
  return screen.getByPlaceholderText(copy.usernamePlaceholder) as HTMLInputElement;
}

function type(value: string) {
  act(() => {
    const field = handleField();
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!;
    setter.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function continueButton() {
  return screen.getByRole("button", { name: continueLabel }) as HTMLButtonElement;
}

beforeEach(() => {
  vi.useFakeTimers();
  lookups.pending.clear();
  lookups.calls = [];
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checking whether a handle is free", () => {
  it("ignores an answer that belongs to a handle already edited away", async () => {
    render(<Harness />);

    // Type a handle that is free, wait past the debounce so the lookup starts.
    type("free_one");
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(lookups.calls).toEqual(["free_one"]);

    // Keep typing before it answers. This one is taken.
    type("taken_one");
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(lookups.calls).toEqual(["free_one", "taken_one"]);

    // The taken one answers first, then the stale free one lands after it —
    // the ordering that used to leave "available" on screen for a handle
    // that is taken.
    await act(async () => {
      lookups.pending.get("taken_one")!(true);
      await Promise.resolve();
    });
    await act(async () => {
      lookups.pending.get("free_one")!(false);
      await Promise.resolve();
    });

    expect(screen.getByText(copy.idTaken)).toBeInTheDocument();
    expect(screen.queryByText(copy.idAvailable)).not.toBeInTheDocument();
    expect(continueButton().disabled).toBe(true);
  });

  it("says a free handle is free once its own answer arrives", async () => {
    render(<Harness />);

    type("free_one");
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    await act(async () => {
      lookups.pending.get("free_one")!(false);
      await Promise.resolve();
    });

    expect(screen.getByText(copy.idAvailable)).toBeInTheDocument();
    expect(continueButton().disabled).toBe(false);
  });

  it("goes back to checking when the handle changes again", async () => {
    render(<Harness />);

    type("free_one");
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    await act(async () => {
      lookups.pending.get("free_one")!(false);
      await Promise.resolve();
    });
    expect(screen.getByText(copy.idAvailable)).toBeInTheDocument();

    // A new handle has no answer yet, so nothing may claim it is available.
    type("taken_one");

    expect(screen.getByText(copy.checkingAvailability)).toBeInTheDocument();
    expect(continueButton().disabled).toBe(true);
  });
});
