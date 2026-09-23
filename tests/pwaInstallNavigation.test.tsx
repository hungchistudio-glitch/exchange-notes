import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import usePwaInstall from "@/hooks/pwa/usePwaInstall";

describe("install prompts across settings navigation", () => {
  it("keeps the browser prompt when its original screen unmounts and consumes it only once", async () => {
    const profile = renderHook(() => usePwaInstall());
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    act(() => { window.dispatchEvent(event); });
    expect(event.defaultPrevented).toBe(true);
    expect(profile.result.current.canPromptInstall).toBe(true);
    profile.unmount();

    const devices = renderHook(() => usePwaInstall());
    const installSheet = renderHook(() => usePwaInstall());
    expect(devices.result.current.canPromptInstall).toBe(true);
    expect(installSheet.result.current.canPromptInstall).toBe(true);
    await act(async () => {
      expect(await installSheet.result.current.promptInstall()).toBe("dismissed");
      expect(await devices.result.current.promptInstall()).toBe("unavailable");
    });
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(devices.result.current.canPromptInstall).toBe(false);
  });

  it("updates every mounted settings view when installation completes", async () => {
    const devices = renderHook(() => usePwaInstall());
    const summary = renderHook(() => usePwaInstall());
    await act(async () => { window.dispatchEvent(new Event("appinstalled")); });
    expect(devices.result.current.isStandalone).toBe(true);
    expect(summary.result.current.isStandalone).toBe(true);
  });
});
