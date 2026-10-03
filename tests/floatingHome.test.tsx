import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FloatingCookieField from "@/components/home/yumi/FloatingCookieField";
import FloatingWordCard from "@/components/home/yumi/FloatingWordCard";
import { reviewWords } from "@/components/home/yumi/reviewWords";
import { buildAvailableCookies } from "@/lib/pet/moodEngine";
import { speak, stopSpeech, type SpeechCallbacks } from "@/lib/speech";
import english from "@/lib/i18n/en";

vi.mock("@/hooks/i18n/useTranslation", () => ({ default: () => ({ language: "english", t: english }) }));
vi.mock("@/hooks/useDisplayLanguages", () => ({ default: () => ({ learningLanguage: "it", supportLanguage: "zh-TW" }) }));
vi.mock("@/hooks/usePhonetics", () => ({ default: () => () => null }));
vi.mock("@/lib/speech", () => ({ speak: vi.fn(), stopSpeech: vi.fn() }));

beforeEach(() => { vi.mocked(speak).mockClear(); vi.mocked(stopSpeech).mockClear(); });

function field() {
  const stageRef = createRef<HTMLDivElement>();
  const onFeed = vi.fn();
  const cookies = buildAvailableCookies(reviewWords, []);
  const view = render(<div ref={stageRef} data-yumi-mode="rest">
    <FloatingCookieField stageRef={stageRef} cookies={cookies} items={reviewWords} onFeed={onFeed} />
  </div>);
  return { ...view, stageRef, onFeed, cookies };
}

describe("real home cookies", () => {
  it("gathers with one star press, then scatters automatically without feeding", () => {
    vi.useFakeTimers();
    const { onFeed, unmount } = field();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Gather and scatter cookies" }));
      expect(document.querySelector("[data-floating-field]")).toHaveAttribute("data-gathering");
      act(() => vi.advanceTimersByTime(1800));
      expect(document.querySelector("[data-floating-field]")).not.toHaveAttribute("data-gathering");
      expect(onFeed).not.toHaveBeenCalled();
    } finally { unmount(); vi.useRealTimers(); }
  });

  it("restarts a star pulse on another press and cancels it when search opens", async () => {
    vi.useFakeTimers();
    const { stageRef, unmount } = field();
    try {
      const star = screen.getByRole("button", { name: "Gather and scatter cookies" });
      fireEvent.click(star);
      act(() => vi.advanceTimersByTime(1000));
      fireEvent.click(star);
      act(() => vi.advanceTimersByTime(1000));
      expect(document.querySelector("[data-floating-field]")).toHaveAttribute("data-gathering");
      await act(async () => { stageRef.current!.dataset.yumiMode = "answering"; });
      expect(document.querySelector("[data-floating-field]")).not.toHaveAttribute("data-gathering");
      act(() => vi.advanceTimersByTime(2000));
      expect(document.querySelector("[data-floating-field]")).not.toHaveAttribute("data-gathering");
    } finally { unmount(); vi.useRealTimers(); }
  });

  it("shows up to twelve real words and opens a bilingual card without feeding", () => {
    const { onFeed } = field();
    expect(document.querySelectorAll("[data-floating-cookie]")).toHaveLength(12);
    fireEvent.click(screen.getByRole("button", { name: "lumière" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("光");
    expect(screen.getByRole("button", { name: "Listen: lumière" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Listen: 光" })).toBeVisible();
    expect(onFeed).not.toHaveBeenCalled();
  });

  it("feeds exactly once when automatic arrival and explicit feed overlap", () => {
    const { onFeed } = field();
    const cookie = screen.getByRole("button", { name: "ciao" });
    act(() => {
      cookie.dispatchEvent(new CustomEvent("yumi-cookie-feed", { bubbles: true }));
      cookie.dispatchEvent(new CustomEvent("yumi-cookie-feed", { bubbles: true }));
    });
    expect(onFeed).toHaveBeenCalledTimes(1);
    expect(onFeed.mock.calls[0][0].word).toBe("ciao");
  });

  it("does not auto-feed while a card is open or movement is paused", () => {
    const { onFeed } = field();
    const cookie = screen.getByRole("button", { name: "ciao" });
    fireEvent.click(screen.getByRole("button", { name: "Pause floating cookies" }));
    act(() => cookie.dispatchEvent(new CustomEvent("yumi-cookie-feed", { bubbles: true })));
    expect(onFeed).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Resume floating cookies" }));
    fireEvent.click(cookie);
    act(() => cookie.dispatchEvent(new CustomEvent("yumi-cookie-feed", { bubbles: true })));
    expect(onFeed).not.toHaveBeenCalled();
  });

  it("only feeds a completed drag into Yumi, never a cancelled gesture", () => {
    let frame: FrameRequestCallback = () => {};
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frame = callback; return 1; });
    const { stageRef, onFeed } = field();
    stageRef.current!.style.setProperty("--yumi-x", "200px");
    stageRef.current!.style.setProperty("--yumi-y", "300px");
    act(() => frame(performance.now()));
    const cookie = screen.getByRole("button", { name: "ciao" });
    function pointer(type: string, x: number, y: number) {
      const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
      Object.defineProperty(event, "pointerId", { value: 1 });
      act(() => cookie.dispatchEvent(event));
    }
    pointer("pointerdown", 70, 130);
    pointer("pointermove", 200, 300);
    pointer("pointercancel", 200, 300);
    pointer("pointerup", 200, 300);
    expect(onFeed).not.toHaveBeenCalled();
    pointer("pointerdown", 70, 130);
    pointer("pointermove", 200, 300);
    pointer("pointerup", 200, 300);
    expect(onFeed).toHaveBeenCalledTimes(1);
    fireEvent.click(cookie, { detail: 1 });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("makes cookies inert while navigation or search owns the screen", async () => {
    const { stageRef } = field();
    await act(async () => { stageRef.current!.dataset.yumiMode = "open"; });
    expect(document.querySelector("[data-floating-field]")).toHaveAttribute("inert");
    await act(async () => { stageRef.current!.dataset.yumiMode = "answering"; });
    expect(document.querySelector("[data-floating-field]")).toHaveAttribute("inert");
  });
});

describe("bilingual icon-only pronunciation", () => {
  it.each([
    [0, "serendipity", "en-US"], [1, "lumière", "fr-FR"], [2, "ciao", "it-IT"], [3, "你好", "zh-TW"], [4, "mariposa", "es-ES"],
  ])("keeps the saved word's language for row %s", (index, word, tag) => {
    render(<FloatingWordCard item={reviewWords[index as number]} onClose={vi.fn()} onFeed={vi.fn()} canFeed />);
    const button = screen.getByRole("button", { name: `Listen: ${word}` });
    expect(button.textContent).toBe("");
    fireEvent.click(button);
    expect(speak).toHaveBeenCalledWith(word, tag, expect.any(Object));
    const secondary = reviewWords[index as number].translation;
    const second = screen.getByRole("button", { name: `Listen: ${secondary}` });
    expect(second.textContent).toBe("");
    fireEvent.click(second);
    expect(speak).toHaveBeenLastCalledWith(secondary, index === 3 ? "en-US" : "zh-TW", expect.any(Object));
  });

  it("ignores an old voice ending after a new voice has started, and cancels on close", () => {
    render(<FloatingWordCard item={reviewWords[1]} onClose={vi.fn()} onFeed={vi.fn()} canFeed />);
    fireEvent.click(screen.getByRole("button", { name: "Listen: lumière" }));
    const first = vi.mocked(speak).mock.calls[0][2] as SpeechCallbacks;
    fireEvent.click(screen.getByRole("button", { name: "Listen: 光" }));
    act(() => first.onEnd?.());
    expect(screen.getByRole("button", { name: "Stop: 光" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(stopSpeech).toHaveBeenCalled();
  });
});
