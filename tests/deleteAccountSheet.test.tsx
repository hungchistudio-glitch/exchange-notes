import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DeleteAccountSheet from "@/components/settings/DeleteAccountSheet";
import { setInterfaceLanguage } from "@/lib/appPreferences";
import { getTranslations, loadTranslations } from "@/lib/i18n";

const calls = vi.hoisted(() => ({
  request: vi.fn(),
  forget: vi.fn(),
  webPush: vi.fn(),
  nativePush: vi.fn(),
}));

vi.mock("@/lib/account/deletion", () => ({ requestAccountDeletion: calls.request }));
vi.mock("@/lib/offline/forgetDevice", () => ({ forgetDeviceCopies: calls.forget }));
vi.mock("@/lib/push/client", () => ({ removeWebPushOnSignOut: calls.webPush }));
vi.mock("@/lib/push/nativeClient", () => ({ disableNativePushRegistration: calls.nativePush }));

const copy = getTranslations("english")!.settings.profile;
const replace = vi.fn();
const reload = vi.fn();

beforeEach(() => {
  setInterfaceLanguage("english");
  vi.clearAllMocks();
  calls.request.mockResolvedValue({ ok: false, reason: "failed" });
  calls.forget.mockResolvedValue(undefined);
  calls.webPush.mockResolvedValue(undefined);
  calls.nativePush.mockResolvedValue(undefined);
  vi.stubGlobal("location", { ...window.location, replace, reload });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function open() {
  render(<DeleteAccountSheet open onClose={() => {}} email="reader@example.com" />);
  return screen.getByRole("button", { name: copy.deleteAccountAction });
}

describe("Delete account", () => {
  it("says what goes, and stays off until the reader ticks that it is permanent", async () => {
    const button = open();

    expect(screen.getByText(copy.deleteAccountWarning)).toBeVisible();
    expect(screen.getByText(copy.deleteAccountKept)).toBeVisible();
    expect(screen.getByText("reader@example.com")).toBeVisible();
    expect(button).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox", { name: copy.deleteAccountUnderstood }));
    expect(button).toBeEnabled();

    await act(async () => {
      fireEvent.click(button);
    });
    expect(calls.request).toHaveBeenCalledTimes(1);
  });

  it("clears this device after the server deletes the account, then leaves for the landing page", async () => {
    vi.useFakeTimers();
    calls.request.mockResolvedValue({ ok: true });
    const button = open();
    fireEvent.click(screen.getByRole("checkbox"));

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByRole("status")).toHaveTextContent(copy.deleteAccountDone);
    expect(calls.webPush).toHaveBeenCalled();
    expect(calls.nativePush).toHaveBeenCalled();
    expect(calls.forget).toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("keeps everything and says so when the server could not delete it", async () => {
    calls.request.mockResolvedValue({ ok: false, reason: "failed" });
    const button = open();
    fireEvent.click(screen.getByRole("checkbox"));

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByRole("alert")).toHaveTextContent(copy.deleteAccountError);
    expect(calls.forget).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(button).toBeEnabled();
  });

  it("reloads into the sign-in screen when the session is already gone", async () => {
    calls.request.mockResolvedValue({ ok: false, reason: "signed-out" });
    const button = open();
    fireEvent.click(screen.getByRole("checkbox"));

    await act(async () => {
      fireEvent.click(button);
    });

    expect(reload).toHaveBeenCalled();
    expect(calls.forget).not.toHaveBeenCalled();
  });

  it("is translated in every interface language", async () => {
    for (const language of ["traditional-chinese", "spanish", "french", "italian"] as const) {
      const translated = (await loadTranslations(language)).settings.profile;
      expect(translated.deleteAccount).not.toBe(copy.deleteAccount);
      expect(translated.deleteAccountWarning).not.toBe(copy.deleteAccountWarning);
      expect(translated.deleteAccountUnderstood).not.toBe(copy.deleteAccountUnderstood);
    }
  });
});
