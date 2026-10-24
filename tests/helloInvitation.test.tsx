import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The hello page, as a visitor uses it

   The sharer's pair first, then the visitor's own: switch either side,
   swap, and go back to the original. Each side is spoken in its own
   language, only when asked, and anything playing stops the moment what
   is on screen changes. A side not made yet says so — it never shows
   another language's word in its place. And the friend button is the
   only thing that ever asks for a friendship.
   ========================================================= */

const speech = vi.hoisted(() => ({ speak: vi.fn(), stopSpeech: vi.fn() }));

vi.mock("@/lib/speech", async (original) => ({
  ...(await original<typeof import("@/lib/speech")>()),
  speak: speech.speak,
  stopSpeech: speech.stopSpeech,
  speechSupported: () => true,
}));

/* Yumi herself is WebGL; the page around her is what is under test. */
vi.mock("@/components/hello/HelloYumi", () => ({ default: () => null }));

/* The account code's link, readable: what it encodes is the point. */
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="account-qr" data-value={value} />,
}));

const { default: HelloInvitation } = await import("@/components/hello/HelloInvitation");
const { default: HelloActions } = await import("@/components/hello/HelloActions");
const { FIXTURE_LIBRARY, FIXTURE_STAR_COSMIC } = await import("@/lib/hello/fixtures");

beforeEach(() => {
  speech.speak.mockClear();
  speech.stopSpeech.mockClear();
});

afterEach(() => {
  document.body.innerHTML = "";
});

const selects = () => screen.getAllByRole("combobox") as HTMLSelectElement[];
/* The two sides, in order: each is an article in its own language. */
const sides = () => [...document.querySelectorAll<HTMLElement>("article[lang]")];

describe("the visitor's languages", () => {
  it("open on the sharer's pair, with both words", () => {
    render(<HelloInvitation hello={FIXTURE_LIBRARY} />);
    expect(selects().map((select) => select.value)).toEqual(["en", "zh-TW"]);
    expect(screen.getByText("library")).toBeTruthy();
    expect(screen.getByText("圖書館")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /original pair/i })).toBeNull();
  });

  it("swap, change and go back to the original", () => {
    render(<HelloInvitation hello={FIXTURE_LIBRARY} />);
    fireEvent.click(screen.getByRole("button", { name: "Swap the two languages" }));
    expect(selects().map((select) => select.value)).toEqual(["zh-TW", "en"]);

    fireEvent.change(selects()[1], { target: { value: "fr" } });
    expect(selects().map((select) => select.value)).toEqual(["zh-TW", "fr"]);
    expect(screen.getByText("bibliothèque")).toBeTruthy();
    expect(screen.queryByText("library")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /original pair/i }));
    expect(selects().map((select) => select.value)).toEqual(["en", "zh-TW"]);
    expect(screen.queryByRole("button", { name: /original pair/i })).toBeNull();
  });

  it("never offer one side the other side's language", () => {
    render(<HelloInvitation hello={FIXTURE_LIBRARY} />);
    const [a, b] = selects();
    const disabledIn = (select: HTMLSelectElement) =>
      [...select.options].filter((option) => option.disabled).map((option) => option.value);
    expect(disabledIn(a)).toEqual(["zh-TW"]);
    expect(disabledIn(b)).toEqual(["en"]);
  });
});

describe("pronunciation", () => {
  it("never plays by itself", () => {
    render(<HelloInvitation hello={FIXTURE_LIBRARY} />);
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it("speaks each side in its own language, and follows a swap", () => {
    render(<HelloInvitation hello={FIXTURE_LIBRARY} />);
    fireEvent.click(screen.getByRole("button", { name: /Play the English pronunciation/ }));
    expect(speech.speak).toHaveBeenLastCalledWith("library", "en-US", expect.any(Object));
    fireEvent.click(screen.getByRole("button", { name: /Play the Traditional Chinese pronunciation/ }));
    expect(speech.speak).toHaveBeenLastCalledWith("圖書館", "zh-TW", expect.any(Object));

    fireEvent.click(screen.getByRole("button", { name: "Swap the two languages" }));
    fireEvent.click(within(sides()[0]).getByRole("button", { name: /Play/ }));
    expect(speech.speak).toHaveBeenLastCalledWith("圖書館", "zh-TW", expect.any(Object));
  });

  it("stops whatever is playing whenever the pair changes", () => {
    render(<HelloInvitation hello={FIXTURE_LIBRARY} />);
    fireEvent.click(screen.getByRole("button", { name: /Play the English pronunciation/ }));
    const before = speech.stopSpeech.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Swap the two languages" }));
    expect(speech.stopSpeech.mock.calls.length).toBe(before + 1);
    fireEvent.change(selects()[0], { target: { value: "it" } });
    expect(speech.stopSpeech.mock.calls.length).toBe(before + 2);
    fireEvent.click(screen.getByRole("button", { name: /original pair/i }));
    expect(speech.stopSpeech.mock.calls.length).toBe(before + 3);
  });

  it("ignores a late callback from a sound that has been replaced", () => {
    render(<HelloInvitation hello={FIXTURE_LIBRARY} />);
    fireEvent.click(screen.getByRole("button", { name: /Play the English pronunciation/ }));
    const first = speech.speak.mock.calls[0][2] as { onError: () => void };
    fireEvent.click(screen.getByRole("button", { name: "Swap the two languages" }));
    first.onError();
    expect(screen.queryByText("No sound came out. Try again.")).toBeNull();
  });
});

describe("a side not made yet", () => {
  it("says so, and never shows another language's word in its place", () => {
    render(<HelloInvitation hello={FIXTURE_STAR_COSMIC} onRetryMissing={() => {}} />);
    fireEvent.change(selects()[1], { target: { value: "it" } });
    const italian = sides()[1];
    expect(italian.getAttribute("lang")).toBe("it");
    expect(within(italian).getByText(/The Italian side isn’t ready yet/)).toBeTruthy();
    expect(within(italian).queryByText("étoile")).toBeNull();
    expect(within(italian).queryByText("estrella")).toBeNull();
    expect(within(italian).getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("says when asking for it did not work, and keeps the button", () => {
    render(<HelloInvitation hello={FIXTURE_STAR_COSMIC} onRetryMissing={() => {}} missingStatus={{ it: "failed" }} />);
    fireEvent.change(selects()[1], { target: { value: "it" } });
    const italian = sides()[1];
    expect(within(italian).getByText(/try again in a minute/)).toBeTruthy();
    expect(within(italian).getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("stops offering once its tries are spent", () => {
    render(<HelloInvitation hello={FIXTURE_STAR_COSMIC} onRetryMissing={() => {}} missingStatus={{ it: "exhausted" }} />);
    fireEvent.change(selects()[1], { target: { value: "it" } });
    const italian = sides()[1];
    expect(within(italian).getByText("The Italian side can’t be added right now.")).toBeTruthy();
    expect(within(italian).queryByRole("button")).toBeNull();
  });
});

describe("the sharer's account code", () => {
  it("is their friend code, by their Exchange ID, and sends nothing by itself", () => {
    render(<HelloInvitation hello={FIXTURE_LIBRARY} />);
    const code = screen.getByTestId("account-qr");
    expect(code.getAttribute("data-value")).toMatch(/\/invite\/fixture_reader$/);
    expect(screen.getByText("Scan to add Fixture as a friend")).toBeTruthy();
  });

  it("shows the sender's ID beside a nickname, and lets a long one wrap", () => {
    render(<HelloInvitation hello={FIXTURE_LIBRARY} />);
    /* Under the greeting and beside the account code. */
    expect(screen.getAllByText("@fixture_reader")).toHaveLength(2);
  });

  it("does not repeat the ID when it already is the name", () => {
    render(<HelloInvitation hello={FIXTURE_STAR_COSMIC} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("@fixture_cosmic");
    expect(screen.queryAllByText("@fixture_cosmic")).toHaveLength(0);
  });

  it("is left out when there is no Exchange ID to point at", () => {
    render(<HelloInvitation hello={{ ...FIXTURE_LIBRARY, sender: { name: null, exchangeId: "…" } }} />);
    expect(screen.queryByTestId("account-qr")).toBeNull();
  });
});

describe("what a visitor can do", () => {
  it("as a guest: make their own Yumi or meet the sender, both through sign-in", () => {
    render(<HelloActions viewer={{ kind: "guest", startHref: "/login", meetHref: "/a-word-to-invite-you/x/join" }} name="Chi" />);
    expect(screen.getByRole("link", { name: "Make your own Yumi" }).getAttribute("href")).toBe("/login");
    expect(screen.getByRole("link", { name: "Meet Chi" }).getAttribute("href")).toBe("/a-word-to-invite-you/x/join");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("as a member: one button sends a request, only when pressed", () => {
    const onRequest = vi.fn();
    const viewer = { kind: "member" as const, onRequest, chatHref: "/c", friendsHref: "/f" };
    const view = render(<HelloActions viewer={{ ...viewer, friend: "none" }} name="Chi" />);
    expect(onRequest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Send a friend request" }));
    expect(onRequest).toHaveBeenCalledTimes(1);

    view.rerender(<HelloActions viewer={{ ...viewer, friend: "sent" }} name="Chi" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Request sent — waiting for Chi")).toBeTruthy();

    view.rerender(<HelloActions viewer={{ ...viewer, friend: "incoming" }} name="Chi" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("link", { name: "Reply to it" }).getAttribute("href")).toBe("/f");

    view.rerender(<HelloActions viewer={{ ...viewer, friend: "friends" }} name="Chi" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("link", { name: "Open your chat" }).getAttribute("href")).toBe("/c");
  });

  it("as its sharer: no request to themselves, only their invitations", () => {
    render(<HelloActions viewer={{ kind: "own", manageHref: "/invitations" }} name="Chi" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("link", { name: "My Yumi invitations" }).getAttribute("href")).toBe("/invitations");
  });
});
