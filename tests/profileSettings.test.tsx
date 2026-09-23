import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import ProfilePage from "@/app/(protected)/profile/page";
import english from "@/lib/i18n/en";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  fetchProfile: vi.fn(),
  update: vi.fn(),
  signOut: vi.fn(),
  forgetDeviceCopies: vi.fn(),
  disableNativePushRegistration: vi.fn(),
  apply: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({
  auth: { getUser: mocks.getUser, signOut: mocks.signOut },
  from: () => ({
    select: () => ({ eq: () => ({ single: mocks.fetchProfile }) }),
    update: (value: unknown) => ({ eq: () => mocks.update(value) }),
  }),
}) }));
vi.mock("@/lib/offline/forgetDevice", () => ({ forgetDeviceCopies: mocks.forgetDeviceCopies }));
vi.mock("@/lib/push/nativeClient", () => ({ disableNativePushRegistration: mocks.disableNativePushRegistration }));
vi.mock("@/hooks/i18n/useTranslation", () => ({ default: () => ({ t: english, language: "english" }) }));
vi.mock("@/hooks/pwa/usePwaInstall", () => ({ default: () => ({ isStandalone: false }) }));
vi.mock("@/contexts/InterfaceModeContext", () => ({ useInterfaceMode: () => ({ isCosmic: false }) }));
vi.mock("@/contexts/LearningLanguageContext", () => ({ useLearningLanguageContext: () => ({ apply: mocks.apply, languagePair: ["zh-TW", "en"] }) }));
vi.mock("@/components/foundation/layout/AppHeader", () => ({ default: () => null }));
vi.mock("@/components/cosmic/ProgressHud", () => ({ default: () => null }));
vi.mock("@/components/settings/LearningProgressPanel", () => ({ default: () => null }));
vi.mock("@/components/settings/SettingsSearch", () => ({ default: () => null }));
vi.mock("@/components/settings/EditProfileSheet", () => ({ default: () => null }));
vi.mock("@/components/settings/DailyGoalSettingsButton", () => ({ default: () => null }));
vi.mock("@/components/settings/PronunciationSettingsButton", () => ({ default: () => null }));
vi.mock("@/components/settings/FontSizeSettingsButton", () => ({ default: () => null }));
vi.mock("@/components/settings/AppLanguageSettingsButton", () => ({ default: () => null }));
vi.mock("@/components/settings/InterfaceModeSettingsButton", () => ({ default: () => null }));
vi.mock("@/components/settings/WebPushSettingsButton", () => ({ default: () => null }));
vi.mock("@/components/settings/YumiReminderSettingsButton", () => ({ default: () => null }));
vi.mock("@/components/foundation/overlays/BottomSheet", () => ({
  default: ({ open, title, children, footer, closeDisabled }: { open: boolean; title: string; children: ReactNode; footer: ReactNode; closeDisabled: boolean }) => open ? <section role="dialog" aria-label={title} aria-busy={closeDisabled || undefined}>{children}{footer}</section> : null,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const profile = { display_name: "Reader", exchange_id: "reader", native_language: "en", learning_language: "zh-TW", avatar_url: null };
const nativeRow = () => screen.getByRole("button", { name: new RegExp(english.settings.profile.nativeLanguage) });
const learningRow = () => screen.getByRole("button", { name: new RegExp(english.settings.profile.learningLanguage) });

describe("profile settings persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/profile");
    mocks.getUser.mockResolvedValue({ data: { user: { id: "reader", email: "reader@example.test" } }, error: null });
    mocks.fetchProfile.mockResolvedValue({ data: profile, error: null });
    mocks.update.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.disableNativePushRegistration.mockResolvedValue(undefined);
    mocks.forgetDeviceCopies.mockResolvedValue(undefined);
  });

  it("disables language changes until the profile is available", async () => {
    const fetch = deferred<{ data: typeof profile; error: null }>();
    mocks.fetchProfile.mockReturnValue(fetch.promise);
    render(<ProfilePage />);
    expect(nativeRow()).toBeDisabled();
    expect(learningRow()).toBeDisabled();
    await act(async () => { fetch.resolve({ data: profile, error: null }); });
    await waitFor(() => expect(learningRow()).toBeEnabled());
  });

  it("serializes pair changes and restores both languages when saving fails", async () => {
    const user = userEvent.setup();
    const save = deferred<{ error: { message: string; code: string } }>();
    mocks.update.mockReturnValue(save.promise);
    render(<ProfilePage />);
    await waitFor(() => expect(learningRow()).toBeEnabled());
    await user.click(learningRow());
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /English/ }));
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ learning_language: "en", native_language: "zh-TW" });
    expect(mocks.apply).toHaveBeenLastCalledWith("en", "zh-TW");
    expect(nativeRow()).toBeDisabled();
    expect(learningRow()).toHaveAttribute("aria-busy", "true");
    await user.click(nativeRow());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await act(async () => { save.resolve({ error: { message: "Save unavailable", code: "network" } }); });
    expect(mocks.apply).toHaveBeenLastCalledWith("zh-TW", "en");
    expect(nativeRow()).toHaveTextContent("English");
    expect(learningRow()).toHaveTextContent("繁體中文");
    expect(learningRow()).toBeEnabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Save unavailable");
  });

  it("shows sign-out failure without deleting offline data and permits retry", async () => {
    const user = userEvent.setup();
    const signOut = deferred<{ error: { message: string } }>();
    mocks.signOut.mockReturnValueOnce(signOut.promise).mockRejectedValueOnce(new Error("Network unavailable"));
    render(<ProfilePage />);
    await waitFor(() => expect(learningRow()).toBeEnabled());
    await user.click(screen.getByRole("button", { name: new RegExp(english.settings.profile.logout) }));
    const dialog = screen.getByRole("dialog", { name: english.settings.profile.logout });
    const confirm = within(dialog).getByRole("button", { name: english.settings.profile.logout });
    await user.click(confirm);
    expect(confirm).toBeDisabled();
    expect(dialog).toHaveAttribute("aria-busy", "true");
    await act(async () => { signOut.resolve({ error: { message: "Network unavailable" } }); });
    expect(within(dialog).getByRole("alert")).toHaveTextContent(english.common.error);
    expect(mocks.forgetDeviceCopies).not.toHaveBeenCalled();
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(mocks.signOut).toHaveBeenCalledTimes(2);
    expect(confirm).toBeEnabled();
    expect(mocks.forgetDeviceCopies).not.toHaveBeenCalled();
  });
});
