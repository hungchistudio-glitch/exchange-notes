import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The sharer's own hellos, and the way back to one

   The list is the reader's (the server reads it through their own row
   policy); each can be opened, copied or turned off, and turning off asks
   once and says what it cannot take back. A hello that is off stays in
   the list, marked. The list is found in Settings; on the friends
   screen, someone who arrived from a hello finds the way back to it.
   ========================================================= */

const { default: HelloManage } = await import("@/components/hello/HelloManage");
const { default: HelloFriendsCard } = await import("@/components/hello/HelloFriendsCard");
const { rememberRecentHello, forgetRecentHello } = await import("@/lib/hello/recent");

const ROW = {
  id: "AbCdEfGhIjKl",
  createdAt: "2026-10-19T09:00:00.000Z",
  revoked: false,
  pair: ["en", "zh-TW"],
  sense: { en: { text: "library" }, "zh-TW": { text: "圖書館" } },
  url: "https://exchange-notes-app.vercel.app/hello/AbCdEfGhIjKl",
  test: false,
};

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  forgetRecentHello();
  document.body.innerHTML = "";
});

describe("my Yumi invitations", () => {
  it("lists them, and turns one off only after asking", async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      init?.method === "DELETE"
        ? new Response(JSON.stringify({ revoked: true }), { status: 200 })
        : new Response(JSON.stringify({ hellos: [ROW] }), { status: 200 }),
    );
    render(<HelloManage />);
    expect(await screen.findByText("library · 圖書館")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open/ }).getAttribute("href")).toBe("/hello/AbCdEfGhIjKl");

    fireEvent.click(screen.getByRole("button", { name: "Turn off" }));
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
    expect(screen.getByText("Turn this link off?")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Turn off" }));
    await waitFor(() => expect(screen.getByText("Turned off")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith("/api/hello/AbCdEfGhIjKl", { method: "DELETE" });
    expect(screen.queryByRole("button", { name: "Turn off" })).toBeNull();
  });

  it("can change its mind", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ hellos: [ROW] }), { status: 200 }));
    render(<HelloManage />);
    await screen.findByText("library · 圖書館");
    fireEvent.click(screen.getByRole("button", { name: "Turn off" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Turn this link off?")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("says plainly what turning off cannot take back", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ hellos: [] }), { status: 200 }));
    render(<HelloManage />);
    expect(await screen.findByText("You haven’t made any invitations yet.")).toBeTruthy();
    expect(screen.getByText(/can’t be taken back/)).toBeTruthy();
  });
});

describe("the friends screen", () => {
  it("offers the way back to the hello this device last opened", async () => {
    rememberRecentHello({ id: "AbCdEfGhIjKl", name: "Chi" });
    await act(async () => {
      render(<HelloFriendsCard />);
    });
    expect(screen.getByRole("link", { name: /Chi/ }).getAttribute("href")).toBe("/hello/AbCdEfGhIjKl");
  });

  it("shows nothing when this device opened no hello", () => {
    const { container } = render(<HelloFriendsCard />);
    expect(container.innerHTML).toBe("");
  });
});

describe("Settings", () => {
  it("is where the reader finds their invitations, and search finds it too", async () => {
    const { buildSettingsSearchIndex } = await import("@/components/settings/settingsSearchIndex");
    const { loadTranslations } = await import("@/lib/i18n");
    const t = await loadTranslations("traditional-chinese");
    const entry = buildSettingsSearchIndex(t).find((item) => item.id === "setting-yumi-hellos");
    expect(entry).toMatchObject({ title: "我的 Yumi 邀請函", section: "Yumi" });
    expect(entry?.keywords).toContain("invitation");
  });
});
