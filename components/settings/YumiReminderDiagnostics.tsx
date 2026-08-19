"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useMemo, useState } from "react";

import StatusMessage from "@/components/foundation/feedback/StatusMessage";
import useTranslation from "@/hooks/i18n/useTranslation";
import { getDeviceTimeZone } from "@/lib/push/deviceTimeZone";

/**
 * The two things worth knowing about Yumi's reminders once you have decided
 * you want them: which clock they follow, and whether one would actually
 * arrive on this device.
 *
 * It sits inside the Notifications sheet rather than behind the reminder
 * switch, because the switch is a boolean and a boolean does not open a
 * screen. Everything here is about delivery, which is what that sheet is.
 */
export default function YumiReminderDiagnostics() {
  const { t } = useTranslation();
  const copy = t.settings.yumiReminders;

  const timeZone = useMemo(() => getDeviceTimeZone(), []);

  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "danger";
    message: string;
  } | null>(null);

  async function sendTest() {
    if (testing) return;

    setTesting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/push/yumi-test", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) throw new Error(copy.testError);

      setFeedback({ tone: "success", message: copy.testSent });
    } catch {
      setFeedback({ tone: "danger", message: copy.testError });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-black/[0.07] bg-black/[0.02] px-4 py-4">
      <h3 className="text-[15px] font-semibold tracking-[-0.02em]">
        {copy.testTitle}
      </h3>

      <p className="mt-1 text-xs leading-5 text-ink-soft">
        {copy.testDescription}
      </p>

      <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.13em] text-ink-faint">
        {copy.timezoneLabel}
      </p>

      <p className="mt-0.5 break-all text-sm text-ink-strong">{timeZone}</p>

      <button
        type="button"
        disabled={testing}
        onClick={() => void sendTest()}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-black/[0.1] bg-white px-4 text-sm font-semibold text-black transition-all active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {testing ? (
          <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />
        ) : (
          <Send aria-hidden="true" size={16} strokeWidth={1.9} />
        )}

        {testing ? copy.testing : copy.test}
      </button>

      {feedback ? (
        <div className="mt-3">
          <StatusMessage tone={feedback.tone}>{feedback.message}</StatusMessage>
        </div>
      ) : null}
    </div>
  );
}
