import { render, renderHook, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { FriendProfile } from "@/lib/friends";

/*
 * Both "share with a friend" sheets are anchored to the bottom of the
 * screen, which means their height is also their position: anything that
 * changes their size while they are animating in moves the panel, and the
 * entrance transform is a percentage of the panel's own height, so it
 * re-resolves mid-flight. The reader sees the sheet fly up past where it
 * belongs and drop back.
 *
 * Both of them did exactly that, for the same reason: they painted a "you
 * have no friends yet" state before they had asked anyone, then a loader,
 * then the list — three different heights while arriving.
 */

const controls = vi.hoisted(() => ({
  listFriends: vi.fn(),
  fetchNoteShares: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
  }),
}));

vi.mock("@/lib/friends", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/friends")>();
  return { ...actual, listFriends: controls.listFriends };
});

vi.mock("@/lib/notes/repository", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/notes/repository")>();
  return { ...actual, fetchNoteShares: controls.fetchNoteShares };
});

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const { getTranslations } = await import("@/lib/i18n");
const english = getTranslations("english");

if (!english) throw new Error("English translations did not load.");

vi.mock("@/hooks/i18n/useTranslation", () => ({
  default: () => ({
    language: "english",
    isTraditionalChinese: false,
    t: english,
  }),
}));

const { default: FriendPickerModal } = await import(
  "@/components/vocabulary/FriendPickerModal"
);
const { default: NotesShareSheet } = await import(
  "@/components/notes/NotesShareSheet"
);
const { default: useVocabularyFriendPicker } = await import(
  "@/hooks/useVocabularyFriendPicker"
);

const friends = [
  { id: "1", exchangeId: "mika", displayName: "Mika" },
  { id: "2", exchangeId: "jun", displayName: "Jun" },
] as unknown as FriendProfile[];

function pickerProps(overrides: Record<string, unknown> = {}) {
  return {
    friends: [] as FriendProfile[],
    loading: false,
    errorMessage: "",
    sendingFriendId: null,
    onClose: () => {},
    onPick: () => {},
    onRetry: () => {},
    ...overrides,
  };
}

/** The scrolling list inside the picker, whichever state it is in. */
function pickerList() {
  return screen
    .getByRole("dialog")
    .querySelector<HTMLElement>("[style*='min-height']");
}

describe("arriving at a share sheet", () => {
  it("does not say the reader has no friends before it has asked", () => {
    const { result } = renderHook(() => useVocabularyFriendPicker());

    /*
     * The picker mounts as soon as a card is pending and asks for the friend
     * list in an effect, one paint later. Reporting "not loading, no
     * friends" for that paint is the empty state, and every share opened on
     * it.
     */
    expect(result.current.friendsLoading).toBe(true);
    expect(result.current.friends).toEqual([]);
  });

  it("shows the note sheet loading rather than empty while it fetches", async () => {
    let releaseFriends: (value: FriendProfile[]) => void = () => {};

    controls.listFriends.mockReturnValue(
      new Promise<FriendProfile[]>((resolve) => {
        releaseFriends = resolve;
      }),
    );
    controls.fetchNoteShares.mockResolvedValue([]);

    render(
      <NotesShareSheet
        open
        onClose={() => {}}
        noteId="note-1"
        ownerId="user-1"
      />,
    );

    expect(
      screen.queryByText(english.home.notes.noFriends),
    ).not.toBeInTheDocument();

    releaseFriends(friends);

    await waitFor(() => {
      expect(screen.getByText("Mika")).toBeInTheDocument();
    });
  });

  it("keeps one height across every state it passes through", () => {
    /*
     * Loading, empty and populated are the three things the sheet shows in
     * the first moments after it opens. jsdom lays nothing out, so the
     * reserved height is checked rather than measured — but it is the
     * reservation that stops the panel resizing under the animation.
     */
    const heights = new Set<string>();

    for (const props of [
      pickerProps({ loading: true }),
      pickerProps({ friends: [] }),
      pickerProps({ friends }),
    ]) {
      const { unmount } = render(<FriendPickerModal {...pickerProps(props)} />);

      const list = pickerList();
      expect(list).not.toBeNull();
      heights.add(list!.style.minHeight);

      unmount();
    }

    expect(heights.size).toBe(1);
    expect([...heights][0]).not.toBe("");
  });
});
