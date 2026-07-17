"use client";

import {
  ArrowLeft,
  LoaderCircle,
  Send,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";

import CaptureProgress from "@/components/capture/CaptureProgress";
import CaptureResultEditor from "@/components/capture/CaptureResultEditor";
import CaptureSourcePicker from "@/components/capture/CaptureSourcePicker";
import AppButton from "@/components/ui/AppButton";
import AppCard from "@/components/ui/AppCard";
import AppPage from "@/components/ui/AppPage";
import PageHeader from "@/components/ui/PageHeader";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useRef, useState } from "react";

import { speak } from "@/lib/speech";
import { getPronunciationData } from "@/lib/pronunciation";
import { listFriends, type FriendProfile } from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";
import { setPendingSharedVocabulary } from "@/lib/vocabularyDraft";
import type {
  AppLanguage,
  VocabularyCategory,
  VocabularyItem,
} from "@/lib/types/app";
import { dataUrlToBlob, safeImageExtension } from "@/lib/vocabulary";

type IdentificationResult = {
  englishName: string;
  chineseName: string;
  partOfSpeech: string;
  englishExample: string;
  chineseExample: string;
  confidence: "high" | "medium" | "low";
  category: VocabularyCategory;
};

type CaptureDraft = {
  imageData?: string;
  fileName?: string;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
const CAPTURE_DRAFT_KEY = "exchange-notes-capture-draft";

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

function getVocabularyKey(word: string, translation: string) {
  return `${normalizeText(word)}::${normalizeText(translation)}`;
}

export default function CameraPage() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const takePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const chooseImageInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);

  const [imageData, setImageData] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [, setLearningLanguage] = useState<AppLanguage | null>(
    null,
  );

  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);

  const [partnerPickerOpen, setPartnerPickerOpen] = useState(false);
  const [partners, setPartners] = useState<FriendProfile[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setCameraSupported(Boolean(navigator.mediaDevices?.getUserMedia));
  }, []);

  useEffect(() => {
    let active = true;

    async function loadLearningLanguage() {
      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data } = await supabase
          .from("profiles")
          .select("learning_language")
          .eq("id", user.id)
          .single();

        if (active && data?.learning_language) {
          setLearningLanguage(data.learning_language as AppLanguage);
        }
      } catch (profileError) {
        console.warn("Could not load learning language:", profileError);
      }
    }

    void loadLearningLanguage();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const rawDraft = sessionStorage.getItem(CAPTURE_DRAFT_KEY);

    if (!rawDraft) return;

    sessionStorage.removeItem(CAPTURE_DRAFT_KEY);

    try {
      const draft = JSON.parse(rawDraft) as CaptureDraft;

      if (!draft.imageData) return;

      setImageData(draft.imageData);
      setFileName(draft.fileName || "photo.jpg");
      setResult(null);
      setError("");
      window.setTimeout(() => void identifyImage(draft.imageData), 0);
    } catch (draftError) {
      console.error("Could not restore capture draft:", draftError);
      setError("Could not open the selected image.");
    }
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  async function startCamera() {
    setError("");
    setResult(null);
    setImageData(null);
    setSaved(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraSupported(false);
      takePhotoInputRef.current?.click();
      return;
    }

    setCameraStarting(true);

    try {
      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: "environment" },
            width: { ideal: 1600 },
            height: { ideal: 1600 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1600 },
            height: { ideal: 1600 },
          },
          audio: false,
        });
      }

      streamRef.current = stream;
      setCameraActive(true);
    } catch (mediaError) {
      console.error("getUserMedia failed:", mediaError);

      const errorName =
        mediaError instanceof DOMException ? mediaError.name : "";

      if (errorName === "NotAllowedError") {
        setError(
          "Camera permission was denied. Enable camera access in your browser settings, or choose an image instead.",
        );
      } else if (errorName === "NotFoundError") {
        setError("No camera was found on this device.");
      } else if (errorName === "NotReadableError") {
        setError("The camera is already being used by another application.");
      } else {
        setError(
          "Camera access is unavailable. Try choosing an image instead.",
        );
      }
    } finally {
      setCameraStarting(false);
    }
  }

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;

    if (!cameraActive || !video || !stream) return;

    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    const handleLoadedMetadata = () => {
      void video.play().catch((playError) => {
        console.error("video.play() failed:", playError);
        setError("Could not start the camera preview. Try again.");
      });
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [cameraActive]);

  function drawToDataUrl(
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
  ): string | null {
    const canvas = canvasRef.current ?? document.createElement("canvas");

    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(sourceWidth, sourceHeight),
    );

    canvas.width = Math.round(sourceWidth * scale);
    canvas.height = Math.round(sourceHeight * scale);

    const context = canvas.getContext("2d");

    if (!context) return null;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  }

  function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => {
        reject(new Error("Could not read this image."));
      };

      reader.onload = () => {
        if (typeof reader.result !== "string") {
          reject(new Error("Could not read this image."));
          return;
        }

        const image = new Image();

        image.onerror = () => {
          reject(new Error("Could not open this image."));
        };

        image.onload = () => {
          const compressed = drawToDataUrl(
            image,
            image.naturalWidth || image.width,
            image.naturalHeight || image.height,
          );

          if (!compressed) {
            reject(new Error("Could not process this image."));
            return;
          }

          resolve(compressed);
        };

        image.src = reader.result;
      };

      reader.readAsDataURL(file);
    });
  }

  async function handleSelectedFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError("");
    setResult(null);
    setSaved(false);

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Please choose an image smaller than 10 MB.");
      return;
    }

    try {
      const compressed = await compressImage(file);

      stopCamera();
      setImageData(compressed);
      setFileName(file.name || "image.jpg");
      void identifyImage(compressed);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not process this image.",
      );
    }
  }

  function capturePhoto() {
    const video = videoRef.current;

    if (
      !video ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      setError("The camera is not ready yet.");
      return;
    }

    const captured = drawToDataUrl(video, video.videoWidth, video.videoHeight);

    if (!captured) {
      setError("Could not capture the image.");
      return;
    }

    setImageData(captured);
    setFileName("camera-photo.jpg");
    setResult(null);
    setSaved(false);
    stopCamera();
    void identifyImage(captured);
  }

  async function identifyImage(imageOverride?: string) {
    const targetImage = imageOverride || imageData;
    if (!targetImage || analyzing) return;

    setAnalyzing(true);
    setError("");
    setResult(null);
    setSaved(false);

    try {
      const response = await fetch("/api/identify-object", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: targetImage,
        }),
      });

      const data = (await response.json()) as
        IdentificationResult | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error(
          "error" in data ? data.error : "Could not identify this image.",
        );
      }

      setResult(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not identify this image.",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveToVocabulary() {
    if (!result || !imageData || saving || saved) return;

    setSaving(true);
    setError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Please log in before saving a word.");
      }

      const word = result.englishName.trim();
      const translation = result.chineseName.trim();
      const candidateKey = getVocabularyKey(word, translation);

      const { data: existingItems, error: duplicateError } = await supabase
        .from("vocabulary_items")
        .select("id, word, translation")
        .eq("user_id", user.id);

      if (duplicateError) throw duplicateError;

      const duplicate = (existingItems ?? []).some(
        (item) =>
          getVocabularyKey(item.word as string, item.translation as string) ===
          candidateKey,
      );

      if (duplicate) {
        setSaved(true);
        setError("This word is already in your vocabulary.");
        return;
      }

      const imageBlob = dataUrlToBlob(imageData);
      const extension = safeImageExtension(imageBlob.type);
      const imagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("vocabulary-images")
        .upload(imagePath, imageBlob, {
          contentType: imageBlob.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicImage } = supabase.storage
        .from("vocabulary-images")
        .getPublicUrl(imagePath);

      const { error: insertError } = await supabase
        .from("vocabulary_items")
        .insert({
          user_id: user.id,
          word,
          translation,
          language: "english",
          part_of_speech: result.partOfSpeech.trim() || null,
          example_sentence: result.englishExample.trim() || null,
          translated_example: result.chineseExample.trim() || null,
          image_url: publicImage.publicUrl,
          confidence: result.confidence,
          category: result.category,
          status: "new",
        });

      if (insertError) {
        await supabase.storage.from("vocabulary-images").remove([imagePath]);

        throw insertError;
      }

      setSaved(true);

      window.setTimeout(() => {
        router.push("/vocabulary");
      }, 500);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save this word.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function openPartnerPicker() {
    if (!result || loadingPartners) return;

    setError("");
    setLoadingPartners(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Please log in before sharing a word.");
      }

      const friends = await listFriends(supabase, user.id);

      if (friends.length === 0) {
        throw new Error(
          "You don't have any learning partners yet. Add a friend first.",
        );
      }

      setPartners(friends);
      setPartnerPickerOpen(true);
    } catch (partnerError) {
      setError(
        partnerError instanceof Error
          ? partnerError.message
          : "Could not load your learning partners.",
      );
    } finally {
      setLoadingPartners(false);
    }
  }

  async function sendToSelectedPartner(friendId: string) {
    if (!result || sending) return;

    setSending(true);
    setSelectedPartnerId(friendId);
    setError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Please log in before sharing a word.");
      }

      const now = new Date().toISOString();

      const sharedItem: VocabularyItem = {
        id: `capture-${crypto.randomUUID()}`,
        user_id: user.id,
        word: result.englishName.trim(),
        translation: result.chineseName.trim(),
        language: "english",
        part_of_speech: result.partOfSpeech.trim() || null,
        example_sentence: result.englishExample.trim() || null,
        translated_example: result.chineseExample.trim() || null,
        confidence: result.confidence,
        category: result.category,
        status: "new",

        // Privacy-first sharing:
        // the original photo stays only on the Capture screen.
        image_url: null,

        created_at: now,
        updated_at: now,
      };

      setPendingSharedVocabulary(sharedItem);

      setPartnerPickerOpen(false);
      setSending(false);
      setSelectedPartnerId(null);

      window.location.assign(`/messages?with=${encodeURIComponent(friendId)}`);
    } catch (sendError) {
      console.error("Could not prepare shared word:", sendError);

      setError(
        sendError instanceof Error
          ? sendError.message
          : "Could not send this word.",
      );

      setSending(false);
      setSelectedPartnerId(null);
    }
  }

  function reset() {
    stopCamera();
    setImageData(null);
    setFileName("");
    setResult(null);
    setError("");
    setSaved(false);
    setAnalyzing(false);
    setSaving(false);
    setSending(false);
    setSelectedPartnerId(null);
    setPartnerPickerOpen(false);
  }

  const localPronunciation = result
    ? getPronunciationData({
        english: result.englishName,
        chinese: result.chineseName,
      })
    : null;

  const englishPronunciation = localPronunciation?.english?.trim() || "";

  const chinesePinyin = localPronunciation?.pinyin?.trim() || "";

  const chineseZhuyin = localPronunciation?.zhuyin?.trim() || "";

  const chinesePronunciation = [chinesePinyin, chineseZhuyin]
    .filter(Boolean)
    .join(" · ");







  const progressStep = saved
    ? "save"
    : result
      ? "review"
      : analyzing
        ? "analyze"
        : "photo";

  return (
    <AppPage
      width="default"
      className="pb-[calc(9rem+env(safe-area-inset-bottom))]"
    >
      <PageHeader
        eyebrow="AI vocabulary capture"
        title="Discover"
        description="Photograph something, review the bilingual result, and save it as a word."
        leading={
          <Link
            href="/vocabulary"
            aria-label="Back to vocabulary"
            onClick={stopCamera}
            className="flex h-11 w-11 items-center justify-center rounded-full text-black/55 transition hover:bg-black/[0.04]"
          >
            <ArrowLeft size={20} strokeWidth={1.8} />
          </Link>
        }
        trailing={
          imageData || cameraActive ? (
            <button
              type="button"
              onClick={reset}
              className="h-11 px-2 text-[13px] font-semibold text-black/45"
            >
              Reset
            </button>
          ) : null
        }
      />

      <div className="mt-6">
        <CaptureProgress current={progressStep} />
      </div>

      {!cameraActive && !imageData ? (
        <CaptureSourcePicker
          cameraStarting={cameraStarting}
          cameraSupported={cameraSupported}
          onCamera={() => void startCamera()}
          onChooseImage={() => chooseImageInputRef.current?.click()}
        />
      ) : null}

      {cameraActive && !imageData ? (
        <section className="mt-6">
          <div className="relative aspect-[3/4] overflow-hidden rounded-[28px] bg-black shadow-[0_18px_45px_rgba(0,0,0,0.14)]">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              disablePictureInPicture
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-5 rounded-[22px] border border-white/48" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/45 to-transparent" />
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center">
            <button
              type="button"
              onClick={stopCamera}
              className="justify-self-start px-3 py-3 text-[13px] font-semibold text-black/45"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={capturePhoto}
              aria-label="Capture photo"
              className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[5px] border-white bg-black shadow-[0_6px_22px_rgba(0,0,0,0.2)] transition-transform active:scale-95"
            >
              <span className="h-[56px] w-[56px] rounded-full border border-white/35" />
            </button>
            <span />
          </div>
        </section>
      ) : null}

      {imageData ? (
        <section className="mt-6">
          <AppCard padding="none" className="overflow-hidden bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageData}
              alt="Selected object"
              className="max-h-[46dvh] w-full object-contain"
            />
          </AppCard>

          <div className="mt-3 flex items-center justify-between gap-3 px-1">
            <p className="min-w-0 truncate text-[11px] text-black/32">
              {fileName || "Selected image"}
            </p>
            {!analyzing && !result ? (
              <button
                type="button"
                onClick={() => void identifyImage()}
                className="shrink-0 text-[12px] font-semibold text-black/55"
              >
                Analyze again
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {analyzing ? (
        <AppCard padding="lg" className="mt-5 text-center">
          <LoaderCircle size={26} className="mx-auto animate-spin" />
          <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.03em]">
            Analyzing your photo
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-black/45">
            AI is identifying the object and preparing English and Traditional
            Chinese examples.
          </p>
        </AppCard>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-5 rounded-[18px] border border-red-200/70 bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-700"
        >
          {error}
        </div>
      ) : null}

      {result && !analyzing ? (
        <CaptureResultEditor
          result={result}
          englishPronunciation={englishPronunciation}
          chinesePronunciation={chinesePronunciation}
          saving={saving}
          saved={saved}
          loadingPartners={loadingPartners}
          sending={sending}
          onChange={(patch) => {
            setResult((current) =>
              current ? { ...current, ...patch } : current,
            );
            setSaved(false);
            setError("");
          }}
          onSpeak={speak}
          onSave={() => void saveToVocabulary()}
          onSend={() => void openPartnerPicker()}
        />
      ) : null}

      {partnerPickerOpen ? (
        <div
          className="fixed inset-0 z-[180] flex items-end justify-center bg-black/30 backdrop-blur-[3px] sm:items-center"
          onClick={() => {
            if (!sending) setPartnerPickerOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="partner-picker-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-t-[30px] bg-white shadow-2xl sm:rounded-[30px]"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 18px)" }}
          >
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-black/15 sm:hidden" />
            <header className="flex items-center justify-between border-b border-black/[0.07] px-5 pb-4 pt-4">
              <div>
                <p className="app-eyebrow">Learning partners</p>
                <h2
                  id="partner-picker-title"
                  className="mt-1 text-[22px] font-semibold tracking-[-0.03em]"
                >
                  Send this word to
                </h2>
              </div>
              <AppButton
                size="icon"
                variant="ghost"
                onClick={() => setPartnerPickerOpen(false)}
                disabled={sending}
                aria-label="Close partner picker"
              >
                <X size={17} />
              </AppButton>
            </header>

            <div className="max-h-[55dvh] overflow-y-auto px-4 py-4">
              <div className="space-y-2">
                {partners.map((partner) => {
                  const partnerName =
                    partner.displayName || `@${partner.exchangeId}`;
                  const isSelected = selectedPartnerId === partner.id;

                  return (
                    <button
                      key={partner.id}
                      type="button"
                      disabled={sending}
                      onClick={() => void sendToSelectedPartner(partner.id)}
                      className="flex w-full items-center gap-3 rounded-[20px] border border-black/[0.06] bg-[#f8f6f1] px-4 py-3.5 text-left transition-transform active:scale-[0.99] disabled:opacity-50"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black text-white">
                        {partner.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={partner.avatarUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserRound size={19} strokeWidth={1.8} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold tracking-[-0.015em]">
                          {partnerName}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-black/40">
                          @{partner.exchangeId}
                        </span>
                      </span>
                      {isSelected && sending ? (
                        <LoaderCircle size={17} className="animate-spin" />
                      ) : (
                        <Send
                          size={16}
                          strokeWidth={1.7}
                          className="text-black/40"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={takePhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => void handleSelectedFile(event)}
        className="hidden"
      />
      <input
        ref={chooseImageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={(event) => void handleSelectedFile(event)}
        className="hidden"
      />
    </AppPage>
  );
}
