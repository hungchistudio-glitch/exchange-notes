import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HomeMotionSettingsButton from "@/components/settings/HomeMotionSettingsButton";
import { deviceTilt, enableDeviceMotion, homeMotionOn, setHomeMotion, shakeReader, watchDeviceMotion } from "@/lib/home/deviceMotion";

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({ default: () => "english" }));

const orientation = vi.fn<() => Promise<"granted" | "denied">>();
const motion = vi.fn<() => Promise<"granted" | "denied">>();
const disposers: (() => void)[] = [];

beforeEach(() => {
  setHomeMotion(false);
  localStorage.removeItem("home-motion-v1");
  orientation.mockReset().mockResolvedValue("granted");
  motion.mockReset().mockResolvedValue("granted");
  vi.stubGlobal("DeviceOrientationEvent", { requestPermission: orientation });
  vi.stubGlobal("DeviceMotionEvent", { requestPermission: motion });
});

afterEach(() => {
  cleanup();
  for (const dispose of disposers.splice(0)) dispose();
  setHomeMotion(false);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.removeItem("home-motion-v1");
});

describe("motion permission belongs to Settings", () => {
  it.each([false, true])("never requests permission when Home mounts or is touched (saved on: %s)", (on) => {
    if (on) setHomeMotion(true);
    disposers.push(watchDeviceMotion());
    window.dispatchEvent(new Event("pointerup"));
    window.dispatchEvent(new Event("touchend"));
    expect(orientation).not.toHaveBeenCalled();
    expect(motion).not.toHaveBeenCalled();
    expect(homeMotionOn()).toBe(on);
  });

  it("asks both sensors directly from the Settings click, waits for permission, then can turn off without asking", async () => {
    let resolve!: (answer: "granted") => void;
    orientation.mockImplementation(() => new Promise(r => { resolve = r; }));
    render(<HomeMotionSettingsButton />);
    const toggle = screen.getByRole("switch", { name: "Capsules follow the phone" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(orientation).not.toHaveBeenCalled();
    fireEvent.click(toggle);
    // No deferred import or await before either request loses user activation.
    expect(orientation).toHaveBeenCalledTimes(1);
    expect(motion).toHaveBeenCalledTimes(1);
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    expect(orientation).toHaveBeenCalledTimes(1);
    await act(async () => resolve("granted"));
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"));
    expect(toggle).toBeEnabled();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(orientation).toHaveBeenCalledTimes(1);
    expect(motion).toHaveBeenCalledTimes(1);
  });

  it("keeps a refused switch off, explains why, and allows an explicit retry", async () => {
    motion.mockResolvedValueOnce("denied");
    render(<HomeMotionSettingsButton />);
    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);
    expect(await screen.findByRole("status")).toHaveTextContent("wasn’t granted");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(homeMotionOn()).toBe(false);
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("handles a rejected permission request without enabling motion", async () => {
    orientation.mockRejectedValue(new Error("NotAllowedError"));
    expect(await enableDeviceMotion()).toBe("denied");
    expect(homeMotionOn()).toBe(false);
  });

  it("does not undo a later off choice when an earlier permission request finishes", async () => {
    let resolve!: (answer: "granted") => void;
    orientation.mockImplementation(() => new Promise(r => { resolve = r; }));
    const result = enableDeviceMotion();
    setHomeMotion(false);
    resolve("granted");
    await result;
    expect(homeMotionOn()).toBe(false);
  });

  it("supports sensors without the iOS permission API", async () => {
    vi.stubGlobal("DeviceOrientationEvent", class extends Event {});
    vi.stubGlobal("DeviceMotionEvent", class extends Event {});
    expect(await enableDeviceMotion()).toBe("enabled");
    expect(homeMotionOn()).toBe(true);
    expect(orientation).not.toHaveBeenCalled();
  });

  it("explains unavailable motion instead of showing an enabled switch", async () => {
    Reflect.deleteProperty(window, "DeviceOrientationEvent");
    render(<HomeMotionSettingsButton />);
    fireEvent.click(screen.getByRole("switch"));
    expect(await screen.findByRole("status")).toHaveTextContent("isn’t available");
    expect(homeMotionOn()).toBe(false);
  });

  it("honours the in-memory choice when storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(homeMotionOn()).toBe(false);
    expect(await enableDeviceMotion()).toBe("enabled");
    expect(homeMotionOn()).toBe(true);
    setHomeMotion(false);
    expect(homeMotionOn()).toBe(false);
  });

  it("keeps the choice for this page when storage can be read but cannot be written", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    expect(await enableDeviceMotion()).toBe("enabled");
    expect(homeMotionOn()).toBe(true);
    setHomeMotion(false);
    expect(homeMotionOn()).toBe(false);
  });

  it("stops shared sensor listeners and clears queued motion when switched off", async () => {
    const remove = vi.spyOn(window, "removeEventListener");
    disposers.push(watchDeviceMotion(), watchDeviceMotion());
    const reader = shakeReader();
    disposers.push(reader.dispose);
    await enableDeviceMotion();
    window.dispatchEvent(Object.assign(new Event("deviceorientation"), { beta: 30, gamma: 0 }));
    window.dispatchEvent(Object.assign(new Event("devicemotion"), { acceleration: { x: 10, y: 0 }, interval: 16 }));
    expect(deviceTilt.live).toBe(true);
    setHomeMotion(false);
    expect(deviceTilt.live).toBe(false);
    expect(reader.take()).toEqual({ x: 0, y: 0 });
    expect(remove.mock.calls.filter(([name]) => name === "devicemotion")).toHaveLength(1);
    window.dispatchEvent(Object.assign(new Event("devicemotion"), { acceleration: { x: 10, y: 0 }, interval: 16 }));
    expect(reader.take()).toEqual({ x: 0, y: 0 });
  });
});
