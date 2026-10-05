import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import type { Cookie, PetState } from "@/lib/pet/types";
const saved = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/lib/pet/repository", async original => ({ ...await original<typeof import("@/lib/pet/repository")>(), saveFedProgress: saved }));
import useFeedPersistence from "@/hooks/pet/useFeedPersistence";

it("keeps the second cookie eaten when the first acknowledgement arrives late", async () => {
  const pending: Array<(value: PetState) => void> = [];
  saved.mockImplementation(() => new Promise(resolve => pending.push(resolve)));
  const initial = { user_id: "reader", fed_word_ids: [], total_cookies_fed: 0, last_fed_at: null, last_opened_at: null, created_at: "", updated_at: "" };
  const { result } = renderHook(() => {
    const [state, setState] = useState<PetState | null>(initial);
    return { state, feed: useFeedPersistence(state, setState) };
  });
  await act(async () => result.current.feed({ id: "first" } as Cookie));
  const first = result.current.state!;
  act(() => result.current.feed({ id: "second" } as Cookie));
  await act(async () => pending[0](first));
  expect(result.current.state!.fed_word_ids).toEqual(["first", "second"]);
  expect(saved.mock.calls[1][1].fed_word_ids).toEqual(["first", "second"]);
  await act(async () => pending[1](result.current.state!));
});
