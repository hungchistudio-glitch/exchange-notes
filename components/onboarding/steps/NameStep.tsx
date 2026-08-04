"use client";

import { Camera, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import Avatar from "@/components/foundation/media/Avatar";
import useTranslation from "@/hooks/i18n/useTranslation";
import { findProfileByExchangeId } from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";
import { normalizeExchangeId } from "@/lib/utils";

type IdStatus = "idle" | "checking" | "available" | "taken" | "error";

type NameStepProps = {
  userId: string;
  displayName: string;
  exchangeId: string;
  avatarUrl: string | null;
  initialExchangeId: string;
  saving: boolean;
  error: string;
  onChangeDisplayName: (value: string) => void;
  onChangeExchangeId: (value: string) => void;
  onChangeAvatarUrl: (value: string | null) => void;
  onContinue: () => void;
};

// The DB trigger's fallback handle looks like "user_9f2a1c..." — not
// something worth showing as a starting point. A slug of the person's own
// name reads as a real suggestion instead, while staying fully editable.
function suggestExchangeIdFromName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

  return slug.length >= 3 ? slug : "";
}

export default function NameStep({
  userId,
  displayName,
  exchangeId,
  avatarUrl,
  initialExchangeId,
  saving,
  error,
  onChangeDisplayName,
  onChangeExchangeId,
  onChangeAvatarUrl,
  onContinue,
}: NameStepProps) {
  const { t } = useTranslation();
  const copy = t.onboarding.name;

  const [idStatus, setIdStatus] = useState<IdStatus>("idle");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const suggestedOnce = useRef(false);

  // One-shot: if the current handle is still the trigger's generated
  // fallback, swap in a nicer suggestion derived from the display name as
  // soon as one is available (e.g. once it's been prefilled from Google).
  useEffect(() => {
    if (suggestedOnce.current) return;
    if (!initialExchangeId.startsWith("user_")) return;
    if (exchangeId !== initialExchangeId) return;

    const suggestion = suggestExchangeIdFromName(displayName);
    if (!suggestion) return;

    suggestedOnce.current = true;
    onChangeExchangeId(suggestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName, initialExchangeId]);

  useEffect(() => {
    if (checkTimeout.current) clearTimeout(checkTimeout.current);

    const isUnchangedOrTooShort =
      exchangeId.length < 3 || exchangeId === initialExchangeId;

    checkTimeout.current = setTimeout(
      async () => {
        if (isUnchangedOrTooShort) {
          setIdStatus("idle");
          return;
        }

        setIdStatus("checking");

        try {
          const supabase = createClient();
          const match = await findProfileByExchangeId(supabase, exchangeId);
          setIdStatus(!match || match.id === userId ? "available" : "taken");
        } catch {
          setIdStatus("error");
        }
      },
      isUnchangedOrTooShort ? 0 : 400,
    );

    return () => {
      if (checkTimeout.current) clearTimeout(checkTimeout.current);
    };
  }, [exchangeId, initialExchangeId, userId]);

  async function handlePhotoSelected(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file || uploadingPhoto) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError(copy.photoImageError);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError(copy.photoSizeError);
      return;
    }

    setUploadingPhoto(true);
    setPhotoError("");

    try {
      const supabase = createClient();
      const extension =
        file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const storagePath = `${userId}/profile.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(storagePath, file, { upsert: true, cacheControl: "3600", contentType: file.type });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(storagePath);

      onChangeAvatarUrl(`${publicUrl}?v=${Date.now()}`);
    } catch (uploadError) {
      console.error(uploadError);
      setPhotoError(copy.photoUploadError);
    } finally {
      setUploadingPhoto(false);
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
            : copy.usernameHint;

  const idHintTone =
    idStatus === "available"
      ? "text-emerald-600"
      : idStatus === "taken" || idStatus === "error"
        ? "text-red-600"
        : "text-black/45";

  const canContinue =
    displayName.trim().length > 0 &&
    exchangeId.length >= 3 &&
    idStatus !== "checking" &&
    idStatus !== "taken" &&
    !saving;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1">
        <h1 className="text-[24px] font-bold tracking-[-0.03em] text-black">
          {copy.title}
        </h1>

        <div className="mt-6 flex flex-col items-center">
          <div className="relative">
            <Avatar src={avatarUrl} fallback={displayName} size="xl" loading={uploadingPhoto} />

            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              aria-label={avatarUrl ? copy.changePhoto : copy.addPhoto}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white ring-[3px] ring-surface transition-transform active:scale-90 disabled:opacity-50"
            >
              <Camera size={13} strokeWidth={2} />
            </button>
          </div>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={(event) => void handlePhotoSelected(event.target.files)}
          />

          {photoError ? (
            <p className="mt-2 text-xs text-red-600">{photoError}</p>
          ) : null}
        </div>

        <label className="mt-7 block">
          <span className="mb-1.5 block text-[13px] font-medium text-black/60">
            {copy.displayNameLabel}
          </span>

          <input
            required
            value={displayName}
            onChange={(event) => onChangeDisplayName(event.target.value)}
            placeholder={copy.displayNamePlaceholder}
            autoComplete="name"
            className="w-full rounded-2xl border border-transparent bg-black/[0.035] px-4 py-3.5 text-base text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-black focus:bg-white"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[13px] font-medium text-black/60">
            {copy.usernameLabel}
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
              onChange={(event) => onChangeExchangeId(normalizeExchangeId(event.target.value))}
              placeholder={copy.usernamePlaceholder}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-transparent py-3.5 text-base text-black outline-none placeholder:text-neutral-400"
            />

            {idStatus === "checking" ? (
              <LoaderCircle size={15} className="shrink-0 animate-spin text-black/30" />
            ) : null}
          </div>

          <p className={`mt-2 text-xs leading-5 ${idHintTone}`}>{idHint}</p>
        </label>

        {error ? <p className="mt-4 text-xs leading-5 text-red-600">{error}</p> : null}
      </div>

      <button
        type="button"
        onClick={onContinue}
        disabled={!canContinue}
        className="mt-8 flex h-13 min-h-12 w-full items-center justify-center gap-2 rounded-full bg-black px-6 text-[15px] font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40"
      >
        {saving ? <LoaderCircle size={16} className="animate-spin" /> : null}
        {t.onboarding.continue}
      </button>
    </div>
  );
}
