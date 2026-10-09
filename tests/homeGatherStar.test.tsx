import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/(protected)/home/page";
import FloatingCookieField from "@/components/home/yumi/FloatingCookieField";
import HomeGatherStar from "@/components/home/yumi/HomeGatherStar";
import { reviewWords } from "@/components/home/yumi/reviewWords";
import { InterfaceModeProvider } from "@/contexts/InterfaceModeContext";
import { onHomeReturnRequest } from "@/lib/home/homeMoments";
import { buildAvailableCookies } from "@/lib/pet/moodEngine";
import english from "@/lib/i18n/en";

vi.mock("@/hooks/i18n/useTranslation", () => ({ default: () => ({ language: "english", t: english }) }));
vi.mock("@/hooks/useDisplayLanguages", () => ({ default: () => ({ learningLanguage: "it", supportLanguage: "zh-TW" }) }));
vi.mock("@/hooks/usePhonetics", () => ({ default: () => () => null }));
vi.mock("@/lib/speech", () => ({ speak: vi.fn(), stopSpeech: vi.fn() }));

/* The Standard home with everything that needs a scene, an account or the
   network stood down: what is left is the screen's own furniture. */
vi.mock("@/components/home/yumi/YumiRingOverlay", () => ({ default: ({ children }: { children: React.ReactNode }) => <div data-testid="ring">{children}</div> }));
vi.mock("@/components/home/yumi/YumiHomeStage", () => ({ default: () => null }));
vi.mock("@/components/lexicon/UniversalSearchField", () => ({ default: () => null }));
vi.mock("@/components/pwa/HomeInstallPrompt", () => ({ default: () => null }));
vi.mock("@/components/tutorial/TutorialLauncher", () => ({ default: () => null }));
vi.mock("@/components/cosmic/CommandDeck", () => ({ default: () => <div data-testid="deck" /> }));
vi.mock("@/contexts/VocabularyContext", () => ({ useVocabulary: () => ({ items: [], loading: false }) }));
vi.mock("@/hooks/useVocabularyStats", () => ({ default: () => ({ reviewStats: { due: 0 } }) }));
vi.mock("@/hooks/messages/useUnreadMessageCount", () => ({ default: () => ({ unreadCount: 0 }) }));
vi.mock("@/hooks/friends/useIncomingFriendRequestCount", () => ({ default: () => ({ count: 0 }) }));
vi.mock("@/hooks/home/useLocalClock", () => ({ default: () => null }));

const STAR = "Gather and scatter cookies";
const star = () => screen.queryByRole("button", { name: STAR });
const field = () => document.querySelector("[data-floating-field]");

function home(mode: "standard" | "yumi-cosmic") {
  return render(<InterfaceModeProvider initialMode={mode} preview><HomePage /></InterfaceModeProvider>);
}

function withField(initial: "rest" | "answering" | "open" = "rest") {
  const stageRef = createRef<HTMLDivElement>();
  const view = render(<div ref={stageRef} data-yumi-mode={initial}>
    <FloatingCookieField stageRef={stageRef} cookies={buildAvailableCookies(reviewWords, [])} items={reviewWords} onFeed={vi.fn()} />
    <HomeGatherStar />
  </div>);
  return { ...view, stageRef };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); document.documentElement.removeAttribute("data-interface-mode"); });

describe("the home star", () => {
  it("is part of the Standard home from its first frame, before any scene or cookie field", () => {
    home("standard");
    expect(star()).toBeInTheDocument();
    // Nothing has mounted the cookie field — the star does not wait for it.
    expect(field()).toBeNull();
  });

  it("is the one thing Cosmic does not have", () => {
    home("yumi-cosmic");
    expect(screen.getByTestId("deck")).toBeInTheDocument();
    expect(star()).toBeNull();
  });

  it("stays on screen with no cookies at all, and a press then does nothing harmful", () => {
    const stageRef = createRef<HTMLDivElement>();
    render(<div ref={stageRef} data-yumi-mode="rest">
      <FloatingCookieField stageRef={stageRef} cookies={[]} items={[]} onFeed={vi.fn()} />
      <HomeGatherStar />
    </div>);
    expect(star()).toBeInTheDocument();
    fireEvent.click(star()!);
    expect(field()).toHaveAttribute("data-gathering");
    act(() => { vi.advanceTimersByTime(1800); });
    expect(field()).not.toHaveAttribute("data-gathering");
  });

  it("gathers at rest, standing above the field rather than inside it", () => {
    withField();
    expect(field()?.contains(star())).toBe(false);
    fireEvent.click(star()!);
    expect(field()).toHaveAttribute("data-gathering");
  });

  it("during a search answer, takes the reader home first and gathers once the cookies are back", async () => {
    const { stageRef } = withField("answering");
    const goHome = vi.fn(() => true);
    const stop = onHomeReturnRequest(goHome);
    try {
      fireEvent.click(star()!);
      expect(goHome).toHaveBeenCalledOnce();
      expect(field()).not.toHaveAttribute("data-gathering");
      // YumiRingOverlay's return lands: the stage is at rest again.
      await act(async () => { stageRef.current!.dataset.yumiMode = "rest"; });
      act(() => { vi.advanceTimersByTime(519); });
      expect(field()).not.toHaveAttribute("data-gathering");
      act(() => { vi.advanceTimersByTime(1); });
      expect(field()).toHaveAttribute("data-gathering");
    } finally { stop(); }
  });

  it("does not gather later if the ring was opened instead of going home", async () => {
    const { stageRef } = withField("answering");
    const stop = onHomeReturnRequest(() => true);
    try {
      fireEvent.click(star()!);
      await act(async () => { stageRef.current!.dataset.yumiMode = "open"; });
      await act(async () => { stageRef.current!.dataset.yumiMode = "answering"; });
      await act(async () => { stageRef.current!.dataset.yumiMode = "rest"; });
      act(() => { vi.advanceTimersByTime(2000); });
      expect(field()).not.toHaveAttribute("data-gathering");
    } finally { stop(); }
  });

  it("does nothing while the ring is out", () => {
    withField("open");
    const goHome = vi.fn(() => true);
    const stop = onHomeReturnRequest(goHome);
    try {
      fireEvent.click(star()!);
      expect(goHome).not.toHaveBeenCalled();
      expect(field()).not.toHaveAttribute("data-gathering");
    } finally { stop(); }
  });

  it("is harmless with no field on screen at all", () => {
    render(<HomeGatherStar />);
    expect(() => fireEvent.click(star()!)).not.toThrow();
  });
});
