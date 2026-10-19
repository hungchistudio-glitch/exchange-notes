import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onHomeFrame } from "@/lib/home/homeFrame";

let frames: FrameRequestCallback[] = [];

function frame(now = 16) {
  const pending = frames;
  frames = [];
  pending.forEach(callback => callback(now));
}

beforeEach(() => {
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal("cancelAnimationFrame", () => { frames = []; });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the home screen's shared frame", () => {
  it("runs every read before any write, in one animation frame", () => {
    const calls: string[] = [];
    const stopA = onHomeFrame({ read: () => calls.push("read a"), write: () => calls.push("write a") });
    const stopB = onHomeFrame({ read: () => calls.push("read b"), write: () => calls.push("write b") });
    expect(frames).toHaveLength(1);

    frame();
    expect(calls).toEqual(["read a", "read b", "write a", "write b"]);
    expect(frames).toHaveLength(1);
    stopA();
    stopB();
  });

  it("stops asking for frames once nobody is listening", () => {
    const write = vi.fn();
    const stop = onHomeFrame({ write });
    frame();
    stop();
    expect(frames).toHaveLength(0);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("drops a task that throws and keeps everyone else's frame going", async () => {
    const thrown = new Promise<unknown>(resolve => {
      vi.stubGlobal("queueMicrotask", (callback: () => void) => {
        try { callback(); } catch (error) { resolve(error); }
      });
    });
    const broken = vi.fn(() => { throw new Error("broken"); });
    const fine = vi.fn();
    const stopBroken = onHomeFrame({ write: broken });
    const stopFine = onHomeFrame({ write: fine });

    frame();
    frame();
    expect(broken).toHaveBeenCalledTimes(1);
    expect(fine).toHaveBeenCalledTimes(2);
    await expect(thrown).resolves.toEqual(new Error("broken"));
    stopBroken();
    stopFine();
  });
});
