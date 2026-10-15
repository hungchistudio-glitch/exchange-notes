"use client";

import { LoaderCircle } from "lucide-react";
import { useId, useRef, useState } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import useTranslation from "@/hooks/i18n/useTranslation";
import { requestAccountDeletion } from "@/lib/account/deletion";
import { forgetDeviceCopies } from "@/lib/offline/forgetDevice";
import { removeWebPushOnSignOut } from "@/lib/push/client";
import { disableNativePushRegistration } from "@/lib/push/nativeClient";

/* =========================================================
   Delete account: the one thing in Settings that cannot be taken back

   So it asks twice, the second time in the reader's own hand: the button
   stays off until they have ticked that they understand it is permanent.
   Not a typed phrase — on a phone that is a test of typing, and in five
   interface languages a phrase is five things to get wrong.

   After the server has deleted the account, this device is cleared the way
   signing out clears it (push registration, offline copies), and the page is
   replaced with the landing page as a new document, so nothing that held
   the account's data in memory survives the move.
   ========================================================= */

type Phase = "idle" | "deleting" | "deleted";

export default function DeleteAccountSheet({
  open,
  onClose,
  email,
}: {
  open: boolean;
  onClose: () => void;
  email: string;
}) {
  const { t } = useTranslation();
  const copy = t.settings.profile;
  const confirmId = useId();
  const [understood, setUnderstood] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  function close() {
    if (phase !== "idle") return;
    setUnderstood(false);
    setError("");
    onClose();
  }

  async function confirm() {
    if (!understood || inFlight.current) return;
    inFlight.current = true;
    setPhase("deleting");
    setError("");

    const result = await requestAccountDeletion();

    if (!result.ok) {
      // Signed out elsewhere in the meantime: there is no account here to
      // delete, and the protected layout will say so on the next load.
      if (result.reason === "signed-out") {
        window.location.reload();
        return;
      }
      setError(copy.deleteAccountError);
      setPhase("idle");
      inFlight.current = false;
      return;
    }

    setPhase("deleted");

    // The account is gone; nothing here may stop the device being cleared.
    try {
      await Promise.all([
        disableNativePushRegistration(),
        removeWebPushOnSignOut(),
      ]);
    } catch (pushError) {
      console.error("Could not unregister this device for push.", pushError);
    }
    try {
      await forgetDeviceCopies();
    } catch (storageError) {
      console.error("Could not clear this device's copies.", storageError);
    }

    // Long enough to read that it worked; the landing page is next.
    window.setTimeout(() => window.location.replace("/"), 1400);
  }

  const busy = phase !== "idle";

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={copy.deleteAccount}
      closeDisabled={busy}
      maxHeight="min(86dvh, 640px)"
      footer={
        phase === "deleted" ? null : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={close}
              disabled={busy}
              className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-black/[0.05] text-sm font-semibold text-black transition-all active:scale-[0.98] disabled:opacity-40"
            >
              {t.common.cancel}
            </button>

            <button
              type="button"
              onClick={() => void confirm()}
              disabled={!understood || busy}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-red-600 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40"
            >
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : null}
              {copy.deleteAccountAction}
            </button>
          </div>
        )
      }
    >
      {phase === "deleted" ? (
        <p role="status" className="text-sm font-medium leading-6 text-black">
          {copy.deleteAccountDone}
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-black">{copy.deleteAccountWarning}</p>
          <p className="text-sm leading-6 text-ink-soft">{copy.deleteAccountKept}</p>
          <p className="text-sm leading-6 text-ink-soft">{email}</p>

          <label
            htmlFor={confirmId}
            className="flex min-h-11 cursor-pointer items-start gap-3 text-sm font-medium leading-6 text-black"
          >
            <input
              id={confirmId}
              type="checkbox"
              checked={understood}
              disabled={busy}
              onChange={(event) => setUnderstood(event.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-red-600"
            />
            <span>{copy.deleteAccountUnderstood}</span>
          </label>

          {error ? (
            <p role="alert" className="text-sm font-medium text-red-600">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </BottomSheet>
  );
}
