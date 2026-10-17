import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* The queue is module state, so each test takes a fresh copy. */
async function fresh() {
  vi.resetModules();
  return (await import("@/lib/yumi3d/prepareWhenIdle")).prepareWhenIdle;
}

describe("preparing a Yumi in the quiet after load", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("runs one scene at a time, in the order asked, each after the last has settled", async () => {
    const prepareWhenIdle = await fresh();
    const log: string[] = [];
    let finishFirst!: () => void;
    prepareWhenIdle(() => { log.push("film:start"); return new Promise<void>(r => { finishFirst = () => { log.push("film:ready"); r(); }; }); });
    prepareWhenIdle(async () => { log.push("showcase:start"); });

    await vi.runAllTimersAsync();
    expect(log).toEqual(["film:start"]);

    finishFirst();
    await vi.runAllTimersAsync();
    expect(log).toEqual(["film:start", "film:ready", "showcase:start"]);
  });

  it("skips a scene whose component left before its turn, and goes on after a failure", async () => {
    const prepareWhenIdle = await fresh();
    const ran: string[] = [];
    prepareWhenIdle(async () => { ran.push("a"); throw new Error("no WebGL"); });
    const cancel = prepareWhenIdle(async () => { ran.push("b"); });
    prepareWhenIdle(async () => { ran.push("c"); });
    cancel();
    await vi.runAllTimersAsync();
    expect(ran).toEqual(["a", "c"]);
  });

  it("waits for the page's load event", async () => {
    const state = vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
    const prepareWhenIdle = await fresh();
    const task = vi.fn(async () => {});
    prepareWhenIdle(task);
    await vi.runAllTimersAsync();
    expect(task).not.toHaveBeenCalled();
    state.mockReturnValue("complete");
    window.dispatchEvent(new Event("load"));
    await vi.runAllTimersAsync();
    expect(task).toHaveBeenCalledOnce();
  });
});
