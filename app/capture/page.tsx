"use client";

import Link from "next/link";
import {
  ChangeEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { dataUrlToBlob, safeImageExtension } from "@/lib/vocabulary";

type IdentificationResult = {
  englishName: string;
  chineseName: string;
  partOfSpeech: string;
  englishExample: string;
  chineseExample: string;
  confidence: "high" | "medium" | "low";
};

type CaptureSource = "camera" | "library" | null;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

// ---------------------------------------------------------------------------
// Static icons (defined once, outside the component so they never re-render
// with new identities on every parent render).
// ---------------------------------------------------------------------------

function SpeakerIcon({ speaking }: { speaking: boolean }) {
  return (
    <svg
      className={speaking ? "h-4 w-4 animate-pulse" : "h-4 w-4"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 8.5a5 5 0 010 7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 6a8.5 8.5 0 010 12" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 8.5A1.5 1.5 0 015.5 7h2l1-1.5h7L16.5 7h2A1.5 1.5 0 0120 8.5V17a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17V8.5z"
      />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16l4.5-4.5a2 2 0 012.8 0L15 15l1-1a2 2 0 012.8 0L20 15.5"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Image helpers (pure functions, no React state — kept outside the component
// so they aren't recreated on every render and are easy to unit test).
// ---------------------------------------------------------------------------

function drawSourceToDataUrl(
  canvas: HTMLCanvasElement,
  sourceImage: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number
): string | null {
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    return null;
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));

  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

/**
 * Decode + downscale a File into a compressed JPEG data URL.
 *
 * Prefers `createImageBitmap`, which decodes off the main thread and skips
 * the base64 round-trip that `FileReader.readAsDataURL` + `<img>` requires.
 * Falls back to the FileReader/Image approach for browsers without bitmap
 * support (older Safari).
 */
async function compressImageFile(
  file: File,
  canvas: HTMLCanvasElement
): Promise<string> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });

      try {
        const dataUrl = drawSourceToDataUrl(canvas, bitmap, bitmap.width, bitmap.height);
        if (!dataUrl) throw new Error("Could not process this image.");
        return dataUrl;
      } finally {
        bitmap.close();
      }
    } catch (bitmapError) {
      // Fall through to the FileReader/Image fallback below.
      console.warn("createImageBitmap failed, falling back:", bitmapError);
    }
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Could not read this image."));

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read this image."));
        return;
      }

      const image = new Image();

      image.onerror = () => reject(new Error("Could not open this image."));

      image.onload = () => {
        const dataUrl = drawSourceToDataUrl(
          canvas,
          image,
          image.naturalWidth || image.width,
          image.naturalHeight || image.height
        );

        if (!dataUrl) {
          reject(new Error("Could not process this image."));
          return;
        }

        resolve(dataUrl);
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Presentational subcomponents
// ---------------------------------------------------------------------------

function CameraOverlay({
  videoRef,
  onClose,
  onCapture,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onClose: () => void;
  onCapture: () => void;
}) {
  return (
    <section className="fixed inset-0 z-[100] bg-black">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/55" />

      <div
        className="absolute inset-x-0 top-0 flex items-center justify-between px-4"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close camera"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-xl transition-transform active:scale-90"
        >
          <CloseIcon />
        </button>

        <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-xl">
          Point at an object
        </span>

        <div className="h-10 w-10" aria-hidden="true" />
      </div>

      <div
        className="absolute inset-x-0 bottom-0 flex justify-center px-4 pt-16"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={onCapture}
          aria-label="Capture photo"
          className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[4px] border-white bg-white/20 shadow-2xl backdrop-blur-sm transition-transform duration-150 active:scale-95"
        >
          <span className="h-[58px] w-[58px] rounded-full bg-white" />
        </button>
      </div>
    </section>
  );
}

function ResultPanel({
  result,
  speechSupported,
  speakingLang,
  onSpeakEnglish,
  onSpeakChinese,
  saving,
  saved,
  onSave,
  onSendToPartner,
}: {
  result: IdentificationResult;
  speechSupported: boolean;
  speakingLang: "en" | "zh" | null;
  onSpeakEnglish: () => void;
  onSpeakChinese: () => void;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  onSendToPartner: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col pt-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
          Identified
        </span>

        <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[10px] font-medium capitalize text-neutral-500">
          {result.confidence}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-2.5">
          <h2 className="min-w-0 break-words text-[30px] font-semibold tracking-[-0.035em]">
            {result.englishName}
          </h2>

          {speechSupported && (
            <button
              type="button"
              onClick={onSpeakEnglish}
              aria-label="Play English word and example"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-white text-neutral-700 transition-transform active:scale-90"
            >
              <SpeakerIcon speaking={speakingLang === "en"} />
            </button>
          )}
        </div>

        <div className="mt-1 flex items-center gap-2">
          <p className="text-lg font-medium text-neutral-700">{result.chineseName}</p>

          {speechSupported && (
            <button
              type="button"
              onClick={onSpeakChinese}
              aria-label="播放中文單字和例句"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-white text-neutral-700 transition-transform active:scale-90"
            >
              <SpeakerIcon speaking={speakingLang === "zh"} />
            </button>
          )}
        </div>

        <p className="mt-1.5 text-xs text-neutral-400">{result.partOfSpeech}</p>
      </div>

      <div className="mt-4 border-t border-black/[0.06] pt-4">
        <p className="text-sm leading-6 text-neutral-900">{result.englishExample}</p>
        <p className="mt-1.5 text-sm leading-6 text-neutral-500">{result.chineseExample}</p>
      </div>

      <div className="mt-auto space-y-2.5 pt-5">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || saved}
          className="flex h-12 w-full items-center justify-center rounded-2xl bg-neutral-950 px-5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
        >
          {saving ? "Saving..." : saved ? "Saved" : "Save to Vocabulary"}
        </button>

        <button
          type="button"
          onClick={onSendToPartner}
          className="h-12 w-full rounded-2xl border border-black/[0.06] bg-white px-5 text-sm font-semibold text-neutral-900 transition-transform active:scale-[0.98]"
        >
          Send to Partner
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function CaptureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const identifyAbortRef = useRef<AbortController | null>(null);

  const takePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const chooseImageInputRef = useRef<HTMLInputElement | null>(null);
  const sourceHandledRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speakingLang, setSpeakingLang] = useState<"en" | "zh" | null>(null);

  const sourceParam = searchParams.get("source");
  const source: CaptureSource =
    sourceParam === "camera" || sourceParam === "library" ? sourceParam : null;

  useEffect(() => {
    setCameraSupported(Boolean(navigator.mediaDevices?.getUserMedia));
    setSpeechSupported("speechSynthesis" in window);
  }, []);

  // Cancel any speech whenever the result changes or the component unmounts.
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, [result]);

  // Abort any in-flight identify request on unmount.
  useEffect(() => {
    return () => {
      identifyAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!cameraActive) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [cameraActive]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;

    if (!cameraActive || !video || !stream) return;

    video.srcObject = stream;

    const handleLoadedMetadata = () => {
      void video.play().catch((playError) => {
        console.error("video.play() failed:", playError);
        setError("Could not start the camera preview. Try again.");
      });
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [cameraActive]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const speak = useCallback(
    (text: string, lang: "en" | "zh") => {
      if (!speechSupported || !text.trim()) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "en" ? "en-US" : "zh-TW";
      utterance.rate = 0.95;

      utterance.onstart = () => setSpeakingLang(lang);
      utterance.onend = () => setSpeakingLang(null);
      utterance.onerror = () => setSpeakingLang(null);

      window.speechSynthesis.speak(utterance);
    },
    [speechSupported]
  );

  const speakEnglish = useCallback(() => {
    if (!result) return;
    speak([result.englishName, result.englishExample].filter(Boolean).join(". "), "en");
  }, [result, speak]);

  const speakChinese = useCallback(() => {
    if (!result) return;
    speak([result.chineseName, result.chineseExample].filter(Boolean).join("。"), "zh");
  }, [result, speak]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (cameraStarting || cameraActive) return;

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);
    } catch (mediaError) {
      console.error("getUserMedia failed:", mediaError);

      const isDenied =
        mediaError instanceof DOMException &&
        (mediaError.name === "NotAllowedError" || mediaError.name === "PermissionDeniedError");

      setError(
        isDenied
          ? "Camera permission was denied. Enable camera access in your browser settings, or choose an image instead."
          : "Camera access is unavailable. Try choosing an image instead."
      );
    } finally {
      setCameraStarting(false);
    }
  }, [cameraActive, cameraStarting]);

  useEffect(() => {
    if (sourceHandledRef.current) return;
    sourceHandledRef.current = true;

    if (source === "camera") {
      void startCamera();
      return;
    }

    if (source === "library") {
      const timeout = window.setTimeout(() => {
        chooseImageInputRef.current?.click();
      }, 150);

      return () => window.clearTimeout(timeout);
    }
    // Only meant to run once, driven by the initial `source` query param.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const handleSelectedFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
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

    const canvas = canvasRef.current;
    if (!canvas) {
      setError("Could not process this image.");
      return;
    }

    try {
      const compressed = await compressImageFile(file, canvas);

      stopCamera();
      setImageData(compressed);
      setFileName(file.name);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not process this image.");
    }
  }, [stopCamera]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setError("The camera is not ready yet.");
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      setError("The camera is not ready yet.");
      return;
    }

    const dataUrl = drawSourceToDataUrl(canvas, video, video.videoWidth, video.videoHeight);

    if (!dataUrl) {
      setError("Could not capture the image.");
      return;
    }

    setImageData(dataUrl);
    setFileName("camera-photo.jpg");
    setResult(null);
    setSaved(false);
    stopCamera();
  }, [stopCamera]);

  const identifyImage = useCallback(async () => {
    if (!imageData || analyzing) return;

    // Cancel any previous in-flight request before starting a new one.
    identifyAbortRef.current?.abort();
    const controller = new AbortController();
    identifyAbortRef.current = controller;

    setAnalyzing(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/identify-object", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
        signal: controller.signal,
      });

      const data = (await response.json()) as IdentificationResult | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Could not identify this image.");
      }

      setResult(data);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") {
        return;
      }

      setError(
        requestError instanceof Error ? requestError.message : "Could not identify this image."
      );
    } finally {
      if (identifyAbortRef.current === controller) {
        identifyAbortRef.current = null;
      }
      setAnalyzing(false);
    }
  }, [imageData, analyzing]);

  const shareText = useMemo(() => {
    if (!result) return "";
    return `${result.englishName}\n${result.chineseName}\n\n${result.englishExample}\n${result.chineseExample}`;
  }, [result]);

  const saveToVocabulary = useCallback(async () => {
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

      const imageBlob = dataUrlToBlob(imageData);
      const extension = safeImageExtension(imageBlob.type);
      const imagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("vocabulary-images")
        .upload(imagePath, imageBlob, {
          contentType: imageBlob.type,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicImage } = supabase.storage
        .from("vocabulary-images")
        .getPublicUrl(imagePath);

      const { error: insertError } = await supabase.from("vocabulary_items").insert({
        user_id: user.id,
        word: result.englishName.trim(),
        translation: result.chineseName.trim(),
        language: "english",
        part_of_speech: result.partOfSpeech.trim() || null,
        example_sentence: result.englishExample.trim() || null,
        translated_example: result.chineseExample.trim() || null,
        image_url: publicImage.publicUrl,
        confidence: result.confidence,
        status: "new",
      });

      if (insertError) {
        await supabase.storage.from("vocabulary-images").remove([imagePath]);
        throw insertError;
      }

      setSaved(true);
      router.push("/vocabulary");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this word.");
    } finally {
      setSaving(false);
    }
  }, [result, imageData, saving, saved, router]);

  const sendToPartner = useCallback(() => {
    if (!result) return;

    sessionStorage.setItem("exchange-notes-draft-message", shareText);
    router.push("/messages");
  }, [result, shareText, router]);

  const chooseAnotherImage = useCallback(() => {
    window.speechSynthesis?.cancel();
    identifyAbortRef.current?.abort();

    setImageData(null);
    setFileName("");
    setResult(null);
    setError("");
    setSaved(false);

    chooseImageInputRef.current?.click();
  }, []);

  const reset = useCallback(() => {
    stopCamera();
    window.speechSynthesis?.cancel();
    identifyAbortRef.current?.abort();

    setImageData(null);
    setFileName("");
    setResult(null);
    setError("");
    setSaved(false);
    setAnalyzing(false);
    setSaving(false);
    setSpeakingLang(null);
  }, [stopCamera]);

  return (
    <main className="min-h-[100dvh] bg-[#f4f2ed] text-neutral-950">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-4">
        {!cameraActive && (
          <header
            className="flex h-14 shrink-0 items-center justify-between"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <Link
              href="/"
              className="min-w-14 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
            >
              Cancel
            </Link>

            <h1 className="text-sm font-semibold tracking-tight">Discover</h1>

            <button
              type="button"
              onClick={reset}
              className="min-w-14 text-right text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
            >
              Reset
            </button>
          </header>
        )}

        {!cameraActive && !imageData && (
          <section className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
              English × 繁體中文
            </p>

            <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.03em]">Discover a word</h2>

            <p className="mt-2 max-w-[260px] text-sm leading-6 text-neutral-500">
              Capture an object or choose a photo to learn its name.
            </p>

            <div className="mt-10 flex items-start justify-center gap-12">
              <button
                type="button"
                onClick={() => void startCamera()}
                disabled={cameraStarting}
                className="group flex w-20 flex-col items-center gap-2.5 disabled:opacity-40"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-950 text-white transition-transform duration-150 group-active:scale-95">
                  {cameraStarting ? <SpinnerIcon /> : <CameraIcon />}
                </span>

                <span className="text-xs font-medium text-neutral-600">Camera</span>
              </button>

              <button
                type="button"
                onClick={() => chooseImageInputRef.current?.click()}
                className="group flex w-20 flex-col items-center gap-2.5"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-black/5 bg-white text-neutral-900 transition-transform duration-150 group-active:scale-95">
                  <LibraryIcon />
                </span>

                <span className="text-xs font-medium text-neutral-600">Library</span>
              </button>
            </div>

            {!cameraSupported && (
              <p className="mt-8 max-w-xs text-xs leading-5 text-neutral-400">
                Camera access is not supported in this browser. Choose a photo from your library
                instead.
              </p>
            )}
          </section>
        )}

        {cameraActive && !imageData && (
          <CameraOverlay videoRef={videoRef} onClose={stopCamera} onCapture={capturePhoto} />
        )}

        {!cameraActive && imageData && (
          <section className="flex flex-1 flex-col pb-6">
            <div className="overflow-hidden rounded-[24px] bg-neutral-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageData}
                alt="Selected object"
                className={
                  result
                    ? "h-[28dvh] min-h-[190px] w-full object-cover"
                    : "max-h-[52dvh] w-full object-contain"
                }
              />
            </div>

            {!result && fileName && (
              <p className="mt-2 truncate px-2 text-center text-[11px] text-neutral-400">
                {fileName}
              </p>
            )}

            {!result && (
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={chooseAnotherImage}
                  className="h-12 rounded-2xl border border-black/5 bg-white px-4 text-sm font-semibold transition-transform active:scale-[0.98]"
                >
                  Choose another
                </button>

                <button
                  type="button"
                  onClick={() => void identifyImage()}
                  disabled={analyzing}
                  className="flex h-12 items-center justify-center rounded-2xl bg-neutral-950 px-4 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
                >
                  {analyzing ? (
                    <span className="flex items-center gap-2">
                      <SpinnerIcon />
                      Identifying
                    </span>
                  ) : (
                    "Identify"
                  )}
                </button>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
              >
                {error}
              </p>
            )}

            {result && (
              <ResultPanel
                result={result}
                speechSupported={speechSupported}
                speakingLang={speakingLang}
                onSpeakEnglish={speakEnglish}
                onSpeakChinese={speakChinese}
                saving={saving}
                saved={saved}
                onSave={() => void saveToVocabulary()}
                onSendToPartner={sendToPartner}
              />
            )}
          </section>
        )}

        {!cameraActive && !imageData && error && (
          <p
            role="alert"
            className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
          >
            {error}
          </p>
        )}

        <canvas ref={canvasRef} className="hidden" />

        <input
          ref={takePhotoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleSelectedFile}
          className="hidden"
        />

        <input
          ref={chooseImageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleSelectedFile}
          className="hidden"
        />
      </div>
    </main>
  );
}

function CaptureLoading() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f4f2ed] text-neutral-950">
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <SpinnerIcon />
        Loading
      </div>
    </main>
  );
}

export default function CapturePage() {
  return (
    <Suspense fallback={<CaptureLoading />}>
      <CaptureContent />
    </Suspense>
  );
}
