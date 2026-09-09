"use client";

import { Camera, Check, Copy, LoaderCircle, QrCode, X } from "lucide-react";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import Avatar from "@/components/foundation/media/Avatar";
import AvatarCropper from "@/components/settings/AvatarCropper";
import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import ClearFieldButton from "@/components/foundation/forms/ClearFieldButton";
import StatusMessage from "@/components/foundation/feedback/StatusMessage";
import useTranslation from "@/hooks/i18n/useTranslation";
import usePageOrigin from "@/hooks/usePageOrigin";
import { findProfileByExchangeId, friendInviteUrl } from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";
import { normalizeExchangeId } from "@/lib/utils";

type IdStatus = "idle" | "checking" | "available" | "taken" | "error";

type EditProfileSheetProps = {
  open: boolean;
  onClose: () => void;
  userId: string;
  initialName: string;
  initialExchangeId: string;
  avatarUrl: string | null;
  onSaved: (values: { display_name: string; exchange_id: string }) => void;
  onAvatarChange: (avatarUrl: string | null) => void;
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/**
 * Profile Settings: everything about who you are, on one surface.
 *
 * The photo, the QR code and the handle used to sit on the front of Settings,
 * where they were the loudest thing on a page about preferences. They are all
 * identity, they are all edited rarely, and they all belong together — here.
 */
export default function EditProfileSheet({
  open,
  onClose,
  userId,
  initialName,
  initialExchangeId,
  avatarUrl,
  onSaved,
  onAvatarChange,
}: EditProfileSheetProps) {
  const { t } = useTranslation();
  const copy = t.settings.profile;
  const qrCopy = t.friends.profileQr;

  const origin = usePageOrigin();

  const [name, setName] = useState(initialName);
  const [exchangeId, setExchangeId] = useState(initialExchangeId);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  /*
   * The chosen file, held as an object URL while the reader frames it.
   *
   * Nothing is uploaded until they say so — picking a photo and changing
   * your mind should cost nothing, and the old avatar stays untouched.
   */
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);

  const closeCropper = useCallback(() => {
    setPendingPhoto((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  /*
   * An object URL holds the file in memory until it is revoked. Leaving the
   * sheet with one open — closing it, signing out, navigating away — would
   * keep a photo alive for the life of the tab.
   */
  useEffect(() => () => {
    setPendingPhoto((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const photoInputRef = useRef<HTMLInputElement | null>(null);

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
      setMessage("");
      setJustSaved(false);
      setQrOpen(false);
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

  /*
   * Debounced Exchange ID availability check, cancelled as well as keyed.
   *
   * Keying the answer to its handle stops a stale one being believed, but not
   * from being stored — and storing it overwrites the answer for the handle
   * actually in the field, which then has no request outstanding to replace
   * it. The row sits on "checking" and Save never enables again. Dropping a
   * resolution whose effect has already been torn down means the good answer
   * is the one that survives.
   */
  useEffect(() => {
    if (!open || !needsIdCheck) return;

    let cancelled = false;

    const timeout = setTimeout(async () => {
      try {
        const supabase = createClient();
        const match = await findProfileByExchangeId(supabase, exchangeId);

        if (cancelled) return;

        setIdCheck({
          exchangeId,
          status: !match || match.id === userId ? "available" : "taken",
        });
      } catch {
        if (cancelled) return;

        setIdCheck({ exchangeId, status: "error" });
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
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

  function handlePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || uploadingPhoto) return;

    if (!file.type.startsWith("image/")) {
      setError(copy.photoImageError);
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setError(copy.photoSizeError);
      return;
    }

    setError("");
    setMessage("");

    /*
     * Straight to the cropper. The upload used to happen here, with the file
     * as it came off the camera — so a portrait photo became whatever
     * `object-cover` found in the middle of it, usually a chin.
     */
    setPendingPhoto((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  async function uploadCroppedPhoto(cropped: Blob) {
    if (uploadingPhoto) return;

    setUploadingPhoto(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();

      /*
       * Always the same name, because the cropper always produces JPEG. The
       * path used to carry the original file's extension, so changing from a
       * PNG to a JPEG left the old object behind under a name nothing
       * pointed at any more.
       */
      const storagePath = `${userId}/profile.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(storagePath, cropped, {
          upsert: true,
          cacheControl: "3600",
          contentType: "image/jpeg",
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(storagePath);

      const avatarWithVersion = `${publicUrl}?v=${Date.now()}`;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarWithVersion })
        .eq("id", userId);

      if (profileError) throw profileError;

      onAvatarChange(avatarWithVersion);
      setMessage(copy.photoUpdated);
      closeCropper();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : copy.photoUploadError,
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removeProfilePhoto() {
    if (uploadingPhoto) return;

    setUploadingPhoto(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);

      if (updateError) throw updateError;

      onAvatarChange(null);
      setMessage(copy.photoRemoved);
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : copy.photoRemoveError,
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleCopyHandle() {
    try {
      await navigator.clipboard.writeText(`@${initialExchangeId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may be unavailable; fail silently.
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
        : "text-ink-soft";

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
        {error ? <StatusMessage tone="danger">{error}</StatusMessage> : null}
        {message ? (
          <StatusMessage tone="success">{message}</StatusMessage>
        ) : null}

        <div className="flex flex-col items-center">
          <div className="relative">
            <Avatar
              src={avatarUrl}
              fallback={name}
              size="xl"
              loading={uploadingPhoto}
            />

            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              aria-label={avatarUrl ? copy.changePhoto : copy.addPhoto}
              title={avatarUrl ? copy.changePhoto : copy.addPhoto}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white ring-[3px] ring-white transition-transform active:scale-90 disabled:opacity-50"
            >
              <Camera size={14} strokeWidth={2} />
            </button>

            {avatarUrl ? (
              <button
                type="button"
                onClick={() => void removeProfilePhoto()}
                disabled={uploadingPhoto}
                aria-label={copy.removePhoto}
                title={copy.removePhoto}
                className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white ring-[3px] ring-white transition-transform active:scale-90 disabled:opacity-50"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            ) : null}
          </div>

          {pendingPhoto ? (
            <AvatarCropper
              /* A new photo is a new crop: remounting is what puts the
                 framing back to centred-and-just-covering without an effect
                 that resets it. */
              key={pendingPhoto}
              src={pendingPhoto}
              busy={uploadingPhoto}
              onCancel={closeCropper}
              onConfirm={(cropped) => void uploadCroppedPhoto(cropped)}
            />
          ) : null}

          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={handlePhotoSelected}
          />

          {initialExchangeId ? (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCopyHandle()}
                className="flex items-center gap-1.5 rounded-full bg-black/[0.045] px-3 py-1.5 text-[0.8125rem] font-semibold text-ink-strong transition-colors hover:bg-black/[0.08]"
              >
                {copied ? (
                  <Check size={13} strokeWidth={2.5} className="text-emerald-600" />
                ) : (
                  <Copy size={13} strokeWidth={2} />
                )}
                {copied ? copy.copied : `@${initialExchangeId}`}
              </button>

              <button
                type="button"
                onClick={() => setQrOpen((current) => !current)}
                aria-expanded={qrOpen}
                aria-label={qrCopy.title}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  qrOpen
                    ? "bg-black text-white"
                    : "bg-black/[0.045] text-ink-soft hover:bg-black/[0.08]"
                }`}
              >
                <QrCode size={14} strokeWidth={2} />
              </button>
            </div>
          ) : null}

          {/*
            Opened in place rather than in a second overlay: a sheet that has
            to open a modal to show a square is one layer too many.
          */}
          {qrOpen && initialExchangeId ? (
            <div className="mt-3 flex w-full flex-col items-center rounded-[22px] border border-black/[0.06] bg-black/[0.02] px-4 py-4">
              {origin ? (
                <QRCodeSVG
                  value={friendInviteUrl(initialExchangeId, origin)}
                  size={148}
                  bgColor="transparent"
                  fgColor="#000000"
                  level="M"
                  aria-label={qrCopy.imageAlt}
                />
              ) : (
                <span className="text-center text-sm text-ink-faint">
                  {qrCopy.loading}
                </span>
              )}

              <p className="mt-3 text-center text-xs leading-5 text-ink-soft">
                {qrCopy.description}
              </p>
            </div>
          ) : null}
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-ink-soft">
            {copy.yourName}
          </span>

          <div className="relative">
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={copy.namePlaceholder}
              autoComplete="name"
              className="w-full rounded-2xl border border-transparent bg-black/[0.035] py-3.5 pl-4 pr-12 text-base text-black outline-none transition-colors placeholder:text-ink-faint focus:border-black focus:bg-white"
            />
            {name && <ClearFieldButton floating onClear={() => setName("")} />}
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-ink-soft">
            {copy.exchangeId}
          </span>

          <div className="flex items-center rounded-2xl border border-transparent bg-black/[0.035] pl-1.5 pr-4 transition-colors focus-within:border-black focus-within:bg-white">
            <span className="mr-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.05] text-sm font-bold text-ink-soft">
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
              className="w-full bg-transparent py-3.5 text-base text-black outline-none placeholder:text-ink-faint"
            />

            {exchangeId && idStatus !== "checking" ? (
              <ClearFieldButton onClear={() => setExchangeId("")} />
            ) : null}

            {idStatus === "checking" ? (
              <LoaderCircle size={15} className="shrink-0 animate-spin text-ink-faint" />
            ) : null}
          </div>

          <p className={`mt-2 text-xs leading-5 ${idHintTone}`}>{idHint}</p>
        </label>
      </div>
    </BottomSheet>
  );
}
