"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import ClearFieldButton from "@/components/foundation/forms/ClearFieldButton";
import useTranslation from "@/hooks/i18n/useTranslation";
import { findProfileByExchangeId } from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";
import { normalizeExchangeId } from "@/lib/utils";

type IdStatus = "idle" | "checking" | "available" | "taken" | "error";

type EditProfileSheetProps = {
  open: boolean;
  onClose: () => void;
  userId: string;
  initialName: string;
  initialExchangeId: string;
  onSaved: (values: { display_name: string; exchange_id: string }) => void;
};

export default function EditProfileSheet({
  open,
  onClose,
  userId,
  initialName,
  initialExchangeId,
  onSaved,
}: EditProfileSheetProps) {
  const { t } = useTranslation();
  const copy = t.settings.profile;

  const [name, setName] = useState(initialName);
  const [exchangeId, setExchangeId] = useState(initialExchangeId);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState("");

  /**
   * Outcome of the last completed availability lookup, tagged with the id it
   * ran against so a slow response is never shown beside newer input.
   */
  const [idCheck, setIdCheck] = useState<{
    exchangeId: string;
    status: "available" | "taken" | "error";
  } | null>(null);

  /**
   * Resets the form each time the sheet reopens. Adjusting state during
   * render is React's documented alternative to a reset effect. Remounting
   * via a `key` would be the other option, but useSheetMotion keeps this
   * component mounted for its 380ms exit animation, so a key that changed on
   * close would cut that animation short.
   */
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setName(initialName);
      setExchangeId(initialExchangeId);
      setIdCheck(null);
      setError("");
      setJustSaved(false);
    }
  }

  const needsIdCheck =
    exchangeId.length >= 3 && exchangeId !== initialExchangeId;

  // Derived rather than stored: "idle" and "checking" follow directly from
  // the current input, so only the asynchronous outcome is real state.
  const idStatus: IdStatus = !needsIdCheck
    ? "idle"
    : idCheck?.exchangeId === exchangeId
      ? idCheck.status
      : "checking";

  // Debounced Exchange ID availability check.
  useEffect(() => {
    if (!open || !needsIdCheck) return;

    const timeout = setTimeout(async () => {
      try {
        const supabase = createClient();
        const match = await findProfileByExchangeId(supabase, exchangeId);

        setIdCheck({
          exchangeId,
          status: !match || match.id === userId ? "available" : "taken",
        });
      } catch {
        setIdCheck({ exchangeId, status: "error" });
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [exchangeId, needsIdCheck, open, userId]);

  const isDirty =
    name.trim() !== initialName.trim() || exchangeId !== initialExchangeId;

  const canSave =
    isDirty &&
    !saving &&
    name.trim().length > 0 &&
    exchangeId.length >= 3 &&
    idStatus !== "checking" &&
    idStatus !== "taken";

  async function handleSave() {
    if (!canSave) return;

    setSaving(true);
    setError("");

    try {
      const supabase = createClient();

      const displayName = name.trim();
      const cleanId = normalizeExchangeId(exchangeId);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          exchange_id: cleanId,
        })
        .eq("id", userId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      onSaved({ display_name: displayName, exchange_id: cleanId });
      setJustSaved(true);

      setTimeout(() => {
        onClose();
      }, 900);
    } catch {
      setError(copy.profileUpdateError);
    } finally {
      setSaving(false);
    }
  }

  const idHint =
    idStatus === "checking"
      ? copy.checkingAvailability
      : idStatus === "available"
        ? copy.idAvailable
        : idStatus === "taken"
          ? copy.idTaken
          : idStatus === "error"
            ? copy.idCheckError
            : copy.exchangeIdDescription;

  const idHintTone =
    idStatus === "available"
      ? "text-emerald-600"
      : idStatus === "taken" || idStatus === "error"
        ? "text-red-600"
        : "text-black/45";

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={copy.editProfile}
      footer={
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canSave}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white transition-all active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-35"
        >
          {saving ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : justSaved ? (
            <Check size={16} />
          ) : null}

          {justSaved ? copy.profileUpdated : saving ? copy.saving : copy.saveChanges}
        </button>
      }
    >
      <div className="space-y-4">
        {error ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-black/60">
            {copy.yourName}
          </span>

          <div className="relative">
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={copy.namePlaceholder}
              autoComplete="name"
              className="w-full rounded-2xl border border-transparent bg-black/[0.035] py-3.5 pl-4 pr-12 text-base text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-black focus:bg-white"
            />
            {name && <ClearFieldButton floating onClear={() => setName("")} />}
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-black/60">
            {copy.exchangeId}
          </span>

          <div className="flex items-center rounded-2xl border border-transparent bg-black/[0.035] pl-1.5 pr-4 transition-colors focus-within:border-black focus-within:bg-white">
            <span className="mr-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.05] text-sm font-bold text-black/50">
              @
            </span>

            <input
              required
              minLength={3}
              maxLength={24}
              value={exchangeId}
              onChange={(event) =>
                setExchangeId(normalizeExchangeId(event.target.value))
              }
              placeholder={copy.exchangeIdPlaceholder}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-transparent py-3.5 text-base text-black outline-none placeholder:text-neutral-400"
            />

            {exchangeId && idStatus !== "checking" ? (
              <ClearFieldButton onClear={() => setExchangeId("")} />
            ) : null}

            {idStatus === "checking" ? (
              <LoaderCircle size={15} className="shrink-0 animate-spin text-black/30" />
            ) : null}
          </div>

          <p className={`mt-2 text-xs leading-5 ${idHintTone}`}>{idHint}</p>
        </label>
      </div>
    </BottomSheet>
  );
}
