"use client";

import {
  BellRing,
  LoaderCircle,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import StatusMessage from "@/components/foundation/feedback/StatusMessage";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import useTranslation from "@/hooks/i18n/useTranslation";

type PreferencesResponse = {
  ok?: boolean;
  enabled?: boolean;
  timeZone?: string;
  error?: string;
};

function getDeviceTimeZone(): string {
  try {
    return (
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone ||
      "America/New_York"
    );
  } catch {
    return "America/New_York";
  }
}

export default function YumiReminderSettingsButton() {
  const {
    isTraditionalChinese,
  } = useTranslation();

  const copy = isTraditionalChinese
    ? {
        rowTitle: "Yumi 呼喚",
        rowDescription:
          "當你今天還沒餵 Yumi 單字餅乾時，讓牠提醒你。",
        on: "開啟",
        off: "關閉",
        sheetTitle: "Yumi 呼喚通知",
        sheetDescription:
          "每天最多一次。已餵過 Yumi、最近才打開 App，或處於安靜時段時不會呼喚。",
        enable: "開啟 Yumi 呼喚",
        disable: "關閉 Yumi 呼喚",
        test: "傳送 Yumi 測試通知",
        loading: "讀取設定中…",
        saving: "儲存中…",
        testing: "傳送中…",
        saved: "Yumi 呼喚設定已更新。",
        testSent: "Yumi 測試通知已送出。",
        timezone: "裝置時區",
        loadError: "無法讀取 Yumi 呼喚設定。",
        saveError: "無法儲存 Yumi 呼喚設定。",
        testError: "無法傳送 Yumi 測試通知。",
      }
    : {
        rowTitle: "Yumi reminders",
        rowDescription:
          "Let Yumi call you when no word cookie has been fed today.",
        on: "On",
        off: "Off",
        sheetTitle: "Yumi reminder notifications",
        sheetDescription:
          "At most once per day. Yumi stays quiet after being fed, after a recent app visit, or during quiet hours.",
        enable: "Turn on Yumi reminders",
        disable: "Turn off Yumi reminders",
        test: "Send Yumi test notification",
        loading: "Loading settings…",
        saving: "Saving…",
        testing: "Sending…",
        saved: "Yumi reminder settings updated.",
        testSent: "Yumi test notification sent.",
        timezone: "Device timezone",
        loadError:
          "Yumi reminder settings could not be loaded.",
        saveError:
          "Yumi reminder settings could not be saved.",
        testError:
          "The Yumi test notification could not be sent.",
      };

  const detectedTimeZone =
    useMemo(
      () => getDeviceTimeZone(),
      [],
    );

  const [open, setOpen] =
    useState(false);

  const [enabled, setEnabled] =
    useState(false);

  const [timeZone, setTimeZone] =
    useState(detectedTimeZone);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [testing, setTesting] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      try {
        const response = await fetch(
          "/api/push/yumi-preferences",
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          },
        );

        const body =
          (await response
            .json()
            .catch(() => ({}))) as PreferencesResponse;

        if (!response.ok) {
          throw new Error(
            body.error ??
              copy.loadError,
          );
        }

        if (cancelled) {
          return;
        }

        setEnabled(
          body.enabled === true,
        );

        setTimeZone(
          body.timeZone ||
            detectedTimeZone,
        );
      } catch {
        if (!cancelled) {
          setError(copy.loadError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [
    copy.loadError,
    detectedTimeZone,
  ]);

  async function updateEnabled(
    nextEnabled: boolean,
  ) {
    if (saving) {
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/push/yumi-preferences",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({
            enabled: nextEnabled,
            timeZone:
              detectedTimeZone,
          }),
        },
      );

      const body =
        (await response
          .json()
          .catch(() => ({}))) as PreferencesResponse;

      if (!response.ok) {
        throw new Error(
          body.error ??
            copy.saveError,
        );
      }

      setEnabled(nextEnabled);
      setTimeZone(
        body.timeZone ||
          detectedTimeZone,
      );
      setMessage(copy.saved);
    } catch {
      setError(copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (testing) {
      return;
    }

    setTesting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/push/yumi-test",
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        },
      );

      const body =
        (await response
          .json()
          .catch(() => ({}))) as {
            error?: string;
          };

      if (!response.ok) {
        throw new Error(
          body.error ??
            copy.testError,
        );
      }

      setMessage(copy.testSent);
    } catch {
      setError(copy.testError);
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      <SettingsRow
        title={copy.rowTitle}
        description={
          copy.rowDescription
        }
        value={
          loading
            ? copy.loading
            : enabled
              ? copy.on
              : copy.off
        }
        tone={
          enabled
            ? "emerald"
            : "neutral"
        }
        icon={
          <BellRing
            size={17}
            strokeWidth={1.8}
          />
        }
        onClick={() =>
          setOpen(true)
        }
      />

      <BottomSheet
        open={open}
        onClose={() =>
          setOpen(false)
        }
        title={copy.sheetTitle}
        description={
          copy.sheetDescription
        }
      >
        <div className="space-y-4">
          <div className="rounded-[22px] border border-black/[0.06] bg-black/[0.025] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.13em] text-ink-faint">
              {copy.timezone}
            </p>

            <p className="mt-1 break-all text-sm text-ink-strong">
              {timeZone}
            </p>
          </div>

          <button
            type="button"
            disabled={
              loading ||
              saving
            }
            onClick={() =>
              void updateEnabled(
                !enabled,
              )
            }
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-black px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {saving && (
              <LoaderCircle
                size={17}
                className="animate-spin"
              />
            )}

            {saving
              ? copy.saving
              : enabled
                ? copy.disable
                : copy.enable}
          </button>

          <button
            type="button"
            disabled={
              !enabled ||
              testing
            }
            onClick={() =>
              void sendTest()
            }
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-black/[0.1] bg-white px-4 py-3 text-sm font-semibold text-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {testing && (
              <LoaderCircle
                size={17}
                className="animate-spin"
              />
            )}

            {testing
              ? copy.testing
              : copy.test}
          </button>

          {error && (
            <StatusMessage tone="danger">
              {error}
            </StatusMessage>
          )}

          {message && (
            <StatusMessage tone="success">
              {message}
            </StatusMessage>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
