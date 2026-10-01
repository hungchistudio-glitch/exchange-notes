import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   Coming back to a newer app (Chi, 2026-10-01: "回到 App 時自動重整")

   A phone that stays on one screen used to keep a days-old build. Coming
   back to the app after a while now reloads onto the newer one — but never
   while the reader is typing, has a camera open, is recording, or is
   reading a menu, and never twice for the same build.
   ========================================================= */

import AppUpdateWatcher from "@/components/foundation/AppUpdateWatcher";
import {
  MIN_AWAY_MS,
  checkForUpdate,
  decideUpdate,
  hasUnsentText,
} from "@/lib/pwa/appUpdate";
import { holdReload, reloadHeld, useReloadHold } from "@/lib/pwa/reloadHolds";
import { GET as version } from "@/app/api/version/route";

function serving(version: string | null) {
  return vi.fn(async () =>
    version === null
      ? new Response("down", { status: 503 })
      : Response.json({ version }),
  ) as unknown as typeof fetch;
}

beforeEach(() => {
  document.body.innerHTML = "";
  window.sessionStorage.clear();
});

describe("deciding", () => {
  const base = { running: "aaa", served: "bbb", reloadedFor: null, busy: false };

  it("reloads onto a newer build", () => {
    expect(decideUpdate(base)).toBe("reload");
  });

  it("stays when the build is the same, or nobody answered", () => {
    expect(decideUpdate({ ...base, served: "aaa" })).toBe("current");
    expect(decideUpdate({ ...base, served: null })).toBe("current");
    expect(decideUpdate({ ...base, running: "" })).toBe("current");
  });

  it("waits while the reader is busy", () => {
    expect(decideUpdate({ ...base, busy: true })).toBe("wait");
  });

  it("reloads once per build, never in a loop", () => {
    expect(decideUpdate({ ...base, reloadedFor: "bbb" })).toBe("gave_up");
    expect(decideUpdate({ ...base, reloadedFor: "older" })).toBe("reload");
  });
});

describe("what counts as typing", () => {
  it("a focused field, even an empty one", () => {
    document.body.innerHTML = `<input type="text" id="q" />`;
    document.getElementById("q")!.focus();
    expect(hasUnsentText()).toBe(true);
  });

  it("a field with something in it, focused or not", () => {
    document.body.innerHTML = `<textarea>Bonjour à tous</textarea>`;
    expect(hasUnsentText()).toBe(true);
  });

  it("not an empty field, a checkbox, or a read-only one", () => {
    document.body.innerHTML = `
      <input type="text" value="" />
      <input type="checkbox" checked />
      <input type="text" value="shown" readonly />
      <input type="hidden" value="token" />
      <button>Go</button>`;
    expect(hasUnsentText()).toBe(false);
  });

  it("an editable area with text", () => {
    document.body.innerHTML = `<div contenteditable="true">draft</div>`;
    expect(hasUnsentText()).toBe(true);
  });
});

describe("holds", () => {
  it("are counted, and released", () => {
    const first = holdReload();
    const second = holdReload();
    expect(reloadHeld()).toBe(true);
    first();
    expect(reloadHeld()).toBe(true);
    second();
    expect(reloadHeld()).toBe(false);
  });

  it("follow a component's life, or a flag", () => {
    const { rerender, unmount } = renderHook(({ active }) => useReloadHold(active), {
      initialProps: { active: true },
    });
    expect(reloadHeld()).toBe(true);
    rerender({ active: false });
    expect(reloadHeld()).toBe(false);
    rerender({ active: true });
    unmount();
    expect(reloadHeld()).toBe(false);
  });
});

describe("checking", () => {
  it("reloads when the server has moved on and nothing is in the way", async () => {
    const reload = vi.fn();

    await expect(
      checkForUpdate({ running: "aaa", fetcher: serving("bbb"), reload }),
    ).resolves.toBe("reload");
    expect(reload).toHaveBeenCalledTimes(1);

    // Same build still served after that reload: do not try again.
    await expect(
      checkForUpdate({ running: "aaa", fetcher: serving("bbb"), reload }),
    ).resolves.toBe("gave_up");
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does not reload over a camera, and does once it is closed", async () => {
    const reload = vi.fn();
    const release = holdReload();

    await expect(
      checkForUpdate({ running: "aaa", fetcher: serving("bbb"), reload }),
    ).resolves.toBe("wait");

    release();
    await expect(
      checkForUpdate({ running: "aaa", fetcher: serving("bbb"), reload }),
    ).resolves.toBe("reload");
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the server cannot be reached", async () => {
    const reload = vi.fn();
    await expect(
      checkForUpdate({ running: "aaa", fetcher: serving(null), reload }),
    ).resolves.toBe("current");
    await expect(
      checkForUpdate({
        running: "aaa",
        fetcher: vi.fn(async () => {
          throw new TypeError("offline");
        }) as unknown as typeof fetch,
        reload,
      }),
    ).resolves.toBe("current");
    expect(reload).not.toHaveBeenCalled();
  });
});

describe("the server's answer", () => {
  it("is never cached", async () => {
    const response = version();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toHaveProperty("version");
  });
});

describe("the watcher", () => {
  let visibility: DocumentVisibilityState = "visible";

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "aaa");
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
    visibility = "visible";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function goAway(forMs: number) {
    visibility = "hidden";
    document.dispatchEvent(new Event("visibilitychange"));
    vi.setSystemTime(Date.now() + forMs);
    visibility = "visible";
    document.dispatchEvent(new Event("visibilitychange"));
  }

  it("asks only after a while away", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => Response.json({ version: "aaa" }));

    render(<AppUpdateWatcher />);

    await act(async () => goAway(5_000));
    expect(fetchSpy).not.toHaveBeenCalled();

    await act(async () => goAway(MIN_AWAY_MS));
    expect(fetchSpy).toHaveBeenCalledWith("/api/version", expect.anything());
  });

  it("does nothing on a build with no version", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    render(<AppUpdateWatcher />);
    await act(async () => goAway(MIN_AWAY_MS * 2));

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
