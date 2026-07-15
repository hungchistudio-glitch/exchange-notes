"use client";

import {
  ArrowLeft,
  Camera,
  Check,
  ImagePlus,
  LoaderCircle,
  Send,
  UserRound,
  Volume2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useRef, useState } from "react";

import { toPinyin } from "@/lib/pinyin";
import { speak } from "@/lib/speech";
import { listFriends, type FriendProfile } from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";
import type {
  AppLanguage,
  VocabularyCategory,
  VocabularyItem,
} from "@/lib/types/app";
import { dataUrlToBlob, safeImageExtension } from "@/lib/vocabulary";
import { setPendingSharedVocabulary } from "@/lib/vocabularyDraft";

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

type WordPronunciation = {
  englishPronunciation: string;
  zhuyin: string;
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
  const [learningLanguage, setLearningLanguage] = useState<AppLanguage | null>(
    null,
  );
  const [pronunciation, setPronunciation] = useState<WordPronunciation | null>(
    null,
  );
  const [pronunciationLoading, setPronunciationLoading] = useState(false);
  const [pronunciationError, setPronunciationError] = useState("");

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
  }

  async function identifyImage() {
    if (!imageData || analyzing) return;

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
          image: imageData,
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

  useEffect(() => {
    if (!result) {
      setPronunciation(null);
      setPronunciationError("");
      setPronunciationLoading(false);
      return;
    }

    const currentResult = result;
    const controller = new AbortController();

    async function loadPronunciation() {
      setPronunciationLoading(true);
      setPronunciationError("");

      try {
        const response = await fetch("/api/word-pronunciation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            english: currentResult.englishName,
            chinese: currentResult.chineseName,
          }),
        });

        const data = (await response.json()) as Partial<WordPronunciation> & {
          error?: string;
        };

        if (!response.ok || "error" in data) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "Could not load pronunciation.",
          );
        }

        setPronunciation({
          englishPronunciation: data.englishPronunciation?.trim() || "",
          zhuyin: data.zhuyin?.trim() || "",
        });
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        console.warn("Could not load capture pronunciation:", requestError);

        setPronunciationError(
          requestError instanceof Error
            ? requestError.message
            : "Could not load pronunciation.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setPronunciationLoading(false);
        }
      }
    }

    void loadPronunciation();

    return () => {
      controller.abort();
    };
  }, [result]);

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
        image_url: imageData,
        created_at: now,
        updated_at: now,
      };

      setPendingSharedVocabulary(sharedItem);
      setPartnerPickerOpen(false);

      router.push(`/messages?with=${encodeURIComponent(friendId)}`);
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

  const learningChinese = learningLanguage === "traditional-chinese";

  const englishPronunciation =
    pronunciation?.englishPronunciation?.trim() || "";

  const chineseZhuyin = pronunciation?.zhuyin?.trim() || "";

  const chinesePinyin = result
    ? toPinyin(result.chineseName)?.trim() || ""
    : "";

  const primaryText = result
    ? learningChinese
      ? result.chineseName
      : result.englishName
    : "";

  const secondaryText = result
    ? learningChinese
      ? result.englishName
      : result.chineseName
    : "";

  const primaryLanguage = learningChinese ? "zh-TW" : "en-US";
  const secondaryLanguage = learningChinese ? "en-US" : "zh-TW";

  const primaryPronunciation = learningChinese
    ? chineseZhuyin || chinesePinyin
    : englishPronunciation;

  const secondaryPronunciation = learningChinese
    ? englishPronunciation
    : chineseZhuyin || chinesePinyin;

  const primaryPronunciationLabel = learningChinese
    ? chineseZhuyin
      ? "注音"
      : "拼音"
    : "EN";

  const secondaryPronunciationLabel = learningChinese
    ? "EN"
    : chineseZhuyin
      ? "注音"
      : "拼音";

  return (
    <main
      className="min-h-screen bg-[#f5f2eb] px-4 pt-5 text-black"
      style={{
        paddingBottom: "calc(11.5rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto max-w-xl">
        <header className="grid grid-cols-[44px_1fr_64px] items-center">
          <Link
            href="/vocabulary"
            aria-label="Back to Words"
            title="Back to Words"
            onClick={stopCamera}
            className="flex h-10 w-10 items-center justify-center rounded-full text-black/60 transition-colors hover:bg-black/[0.04] active:scale-95"
          >
            <ArrowLeft size={21} strokeWidth={1.8} />
          </Link>

          <h1 className="text-center text-[17px] font-semibold tracking-[-0.02em]">
            Discover
          </h1>

          <button
            type="button"
            onClick={reset}
            className="justify-self-end text-[14px] font-medium text-black/45 transition-colors hover:text-black"
          >
            Reset
          </button>
        </header>

        {!cameraActive && !imageData && (
          <section className="flex min-h-[68dvh] flex-col items-center justify-center pb-20 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/35">
              English × 繁體中文
            </p>

            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em]">
              Discover a word
            </h2>

            <p className="mt-4 max-w-xs text-[14px] leading-6 text-black/45">
              Photograph something from everyday life and turn it into a word
              you can remember.
            </p>

            <div className="mt-12 flex items-start justify-center gap-12">
              <button
                type="button"
                onClick={() => void startCamera()}
                disabled={cameraStarting}
                aria-label="Open Camera"
                className="flex w-24 flex-col items-center gap-3 disabled:opacity-40"
              >
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-black text-white transition-transform active:scale-95">
                  {cameraStarting ? (
                    <LoaderCircle size={25} className="animate-spin" />
                  ) : (
                    <Camera size={26} strokeWidth={1.7} />
                  )}
                </span>

                <span className="text-[12px] font-semibold text-black/50">
                  Camera
                </span>
              </button>

              <button
                type="button"
                onClick={() => chooseImageInputRef.current?.click()}
                aria-label="Choose Image"
                className="flex w-24 flex-col items-center gap-3"
              >
                <span className="flex h-20 w-20 items-center justify-center rounded-full border border-black/[0.05] bg-white shadow-[0_5px_18px_rgba(0,0,0,0.06)] transition-transform active:scale-95">
                  <ImagePlus size={26} strokeWidth={1.7} />
                </span>

                <span className="text-[12px] font-semibold text-black/50">
                  Choose Image
                </span>
              </button>
            </div>

            {!cameraSupported && (
              <p className="mt-8 max-w-xs text-[12px] leading-5 text-black/35">
                Live camera preview is not supported in this browser. Tap Camera
                to use your device camera instead.
              </p>
            )}
          </section>
        )}

        {cameraActive && !imageData && (
          <section className="mt-5">
            <div className="relative aspect-[3/4] overflow-hidden rounded-[28px] bg-black">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                disablePictureInPicture
                className="h-full w-full object-cover"
              />

              <div className="pointer-events-none absolute inset-5 rounded-[22px] border border-white/45" />
            </div>

            <div className="mt-6 flex items-center justify-center gap-10">
              <button
                type="button"
                onClick={stopCamera}
                className="text-[13px] font-medium text-black/45"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={capturePhoto}
                aria-label="Capture photo"
                className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[5px] border-white bg-black shadow-[0_5px_20px_rgba(0,0,0,0.18)] transition-transform active:scale-95"
              >
                <span className="h-[56px] w-[56px] rounded-full border border-white/30" />
              </button>
            </div>
          </section>
        )}

        {imageData && (
          <section className="mt-5">
            <div className="overflow-hidden rounded-[28px] bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageData}
                alt="Selected object"
                className="max-h-[48dvh] w-full object-contain"
              />
            </div>

            {fileName && (
              <p className="mt-3 truncate text-center text-[11px] text-black/30">
                {fileName}
              </p>
            )}

            {!result && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={reset}
                  className="h-12 rounded-full border border-black/[0.08] bg-white text-[13px] font-semibold"
                >
                  Choose another
                </button>

                <button
                  type="button"
                  onClick={() => void identifyImage()}
                  disabled={analyzing}
                  className="flex h-12 items-center justify-center gap-2 rounded-full bg-black text-[13px] font-semibold text-white disabled:opacity-35"
                >
                  {analyzing && (
                    <LoaderCircle size={15} className="animate-spin" />
                  )}

                  {analyzing ? "Identifying" : "Identify"}
                </button>
              </div>
            )}
          </section>
        )}

        {error && (
          <p className="mt-5 rounded-[18px] bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-700">
            {error}
          </p>
        )}

        {result && (
          <section className="mt-5 overflow-hidden rounded-[32px] border border-black/[0.055] bg-white shadow-[0_16px_50px_rgba(0,0,0,0.07)]">
            <div className="px-5 pb-6 pt-5 sm:px-7 sm:pb-7 sm:pt-6">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/35">
                  Identified word
                </p>

                <span className="rounded-full bg-[#f5f2eb] px-3 py-1.5 text-[10px] font-medium capitalize tracking-[0.02em] text-black/40">
                  {result.confidence} confidence
                </span>
              </div>

              <div className="mt-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <h2 className="min-w-0 break-words text-[40px] font-semibold leading-[0.98] tracking-[-0.05em] sm:text-[46px]">
                            {primaryText}
                          </h2>

                          <button
                            type="button"
                            onClick={() => speak(primaryText, primaryLanguage)}
                            aria-label={`Play ${primaryText}`}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f2eb] text-black/70 transition-transform active:scale-95"
                          >
                            <Volume2 size={17} strokeWidth={1.8} />
                          </button>
                        </div>

                        <div className="mt-3 flex min-h-5 flex-wrap items-center gap-2 text-[12px] text-black/40">
                          <span className="font-semibold uppercase tracking-[0.1em] text-black/25">
                            {primaryPronunciationLabel}
                          </span>

                          {primaryPronunciation ? (
                            <span>{primaryPronunciation}</span>
                          ) : pronunciationLoading ? (
                            <span className="inline-flex items-center gap-1.5 text-black/25">
                              <LoaderCircle
                                size={11}
                                className="animate-spin"
                              />
                              Loading
                            </span>
                          ) : (
                            <span className="text-black/25">
                              Listen with speaker
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center gap-3">
                        <p className="min-w-0 break-words text-[26px] font-medium leading-none tracking-[-0.035em] text-black/72">
                          {secondaryText}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            speak(secondaryText, secondaryLanguage)
                          }
                          aria-label={`Play ${secondaryText}`}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5f2eb] text-black/60 transition-transform active:scale-95"
                        >
                          <Volume2 size={15} strokeWidth={1.8} />
                        </button>
                      </div>

                      <div className="mt-3 flex min-h-5 flex-wrap items-center gap-2 text-[12px] text-black/38">
                        <span className="font-semibold uppercase tracking-[0.1em] text-black/25">
                          {secondaryPronunciationLabel}
                        </span>

                        {secondaryPronunciation ? (
                          <span>{secondaryPronunciation}</span>
                        ) : pronunciationLoading ? (
                          <span className="inline-flex items-center gap-1.5 text-black/25">
                            <LoaderCircle size={11} className="animate-spin" />
                            Loading
                          </span>
                        ) : (
                          <span className="text-black/25">
                            Listen with speaker
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-black/32">
                      {result.partOfSpeech && (
                        <span className="capitalize">
                          {result.partOfSpeech.toLowerCase()}
                        </span>
                      )}

                      {pronunciationError && (
                        <>
                          {result.partOfSpeech && (
                            <span className="text-black/15">•</span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setPronunciation(null);
                              setPronunciationError("");
                              setResult({ ...result });
                            }}
                            className="underline decoration-black/15 underline-offset-4"
                            title={pronunciationError}
                          >
                            Refresh pronunciation
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {(result.englishExample || result.chineseExample) && (
                <div className="mt-7 space-y-3">
                  {result.englishExample && (
                    <div className="rounded-[22px] bg-[#f8f6f1] px-4 py-4 sm:px-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/32">
                          English example
                        </p>

                        <button
                          type="button"
                          onClick={() => speak(result.englishExample, "en-US")}
                          aria-label="Play English example sentence"
                          title="English example sentence"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black/65 shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-transform active:scale-95"
                        >
                          <Volume2 size={15} strokeWidth={1.8} />
                        </button>
                      </div>

                      <p className="mt-2 break-words text-[16px] leading-7 tracking-[-0.012em] text-black/85">
                        {result.englishExample}
                      </p>
                    </div>
                  )}

                  {result.chineseExample && (
                    <div className="rounded-[22px] bg-[#f8f6f1] px-4 py-4 sm:px-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/32">
                          中文例句
                        </p>

                        <button
                          type="button"
                          onClick={() => speak(result.chineseExample, "zh-TW")}
                          aria-label="播放中文例句"
                          title="播放中文例句"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black/65 shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-transform active:scale-95"
                        >
                          <Volume2 size={15} strokeWidth={1.8} />
                        </button>
                      </div>

                      <p className="mt-2 break-words text-[15px] leading-7 tracking-[-0.01em] text-black/58">
                        {result.chineseExample}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 grid gap-2.5">
                <button
                  type="button"
                  onClick={() => void saveToVocabulary()}
                  disabled={saving || saved}
                  className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full bg-black px-5 text-[13px] font-semibold text-white transition-transform active:scale-[0.99] disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={15} className="animate-spin" />
                      Saving
                    </>
                  ) : saved ? (
                    <>
                      <Check size={15} />
                      Saved
                    </>
                  ) : (
                    "Save to Vocabulary"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void openPartnerPicker()}
                  disabled={sending || loadingPartners}
                  className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full bg-[#f1eee7] px-5 text-[13px] font-semibold text-black transition-transform active:scale-[0.99] disabled:opacity-40"
                >
                  {loadingPartners ? (
                    <LoaderCircle size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} strokeWidth={1.8} />
                  )}

                  {loadingPartners ? "Loading Partners" : "Send to Partner"}
                </button>
              </div>
            </div>
          </section>
        )}

        {partnerPickerOpen && (
          <div
            className="fixed inset-0 z-[180] flex items-end justify-center bg-black/25 backdrop-blur-[3px] sm:items-center"
            onClick={() => {
              if (!sending) {
                setPartnerPickerOpen(false);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="partner-picker-title"
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-xl overflow-hidden rounded-t-[30px] bg-white shadow-2xl sm:rounded-[30px]"
              style={{
                paddingBottom: "max(env(safe-area-inset-bottom), 18px)",
              }}
            >
              <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-black/15 sm:hidden" />

              <header className="flex items-center justify-between border-b border-black/[0.07] px-5 pb-4 pt-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/35">
                    Learning partners
                  </p>

                  <h2
                    id="partner-picker-title"
                    className="mt-1 text-xl font-semibold tracking-[-0.025em]"
                  >
                    Send this word to
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setPartnerPickerOpen(false)}
                  disabled={sending}
                  aria-label="Close partner picker"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f2eb] disabled:opacity-40"
                >
                  <X size={16} strokeWidth={1.8} />
                </button>
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
        )}

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
      </div>
    </main>
  );
}
