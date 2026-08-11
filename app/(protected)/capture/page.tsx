"use client";

import Link from "next/link";
import {
  ChangeEvent,
  RefObject,
  Suspense,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { dataUrlToBlob, safeImageExtension } from "@/lib/imageUtils";
import { encodeWordCardMessage } from "@/lib/messages/wordCard";
import { getPronunciation, type PronunciationResult } from "@/lib/pronunciation/getPronunciation";
import { listFriends, type FriendProfile } from "@/lib/friends";
import { setPendingSharedVocabulary } from "@/lib/vocabularyDraft";
import FriendPickerModal from "@/components/vocabulary/FriendPickerModal";
import useSheetMotion from "@/components/foundation/overlays/useSheetMotion";
import useTranslation from "@/hooks/i18n/useTranslation";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import { insertValues } from "@/lib/utils";
import { normalizePartOfSpeech } from "@/lib/vocabulary/partOfSpeech";

type IdentificationResult = {
  englishName: string;
  chineseName: string;
  partOfSpeech: string;
  englishExample: string;
  chineseExample: string;
  confidence: "high" | "medium" | "low";
};

type CaptureSource = "camera" | "library" | null;

type CameraOverlayProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  onClose: () => void;
  onCapture: () => void;
  closeCameraAriaLabel: string;
  captureAriaLabel: string;
  focusHint: string;
};

/**
 * Browser capabilities are read through useSyncExternalStore rather than set
 * from an effect. They never change while the page is open, so the subscribe
 * function is a no-op; what matters is the server snapshot.
 *
 * That snapshot reports supported. Assuming unsupported would render the
 * "camera unavailable" notice on the server and then take it away a moment
 * later, which looks like a fault rather than a capability check.
 */
const subscribeNever = () => () => undefined;
const readCameraSupport = () =>
  Boolean(navigator.mediaDevices?.getUserMedia);
const readSpeechSupport = () => "speechSynthesis" in window;
const assumeSupported = () => true;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_DIMENSION = 1280;

/**
 * Gemini bills images as 768x768 tiles, so a 1280px photo costs four tiles
 * where a 768px one costs a single tile. Identifying the object nearest the
 * centre does not need the extra detail, so the model gets its own smaller
 * copy while the preview and the saved word image stay at MAX_DIMENSION.
 */
const MAX_AI_DIMENSION = 768;

const JPEG_QUALITY = 0.8;
const IDENTIFICATION_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const IDENTIFICATION_TIMEOUT_MS = 16 * 1000;
// v2: cache keys now hash the downscaled image actually sent to the model.
const IDENTIFICATION_CACHE_VERSION = "v2";

type CachedIdentification = {
  expiresAt: number;
  result: IdentificationResult;
};

function isIdentificationResult(value: unknown): value is IdentificationResult {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    [
      "englishName",
      "chineseName",
      "partOfSpeech",
      "englishExample",
      "chineseExample",
    ].every(
      (field) =>
        typeof candidate[field] === "string" &&
        (candidate[field] as string).trim().length > 0,
    ) && ["high", "medium", "low"].includes(String(candidate.confidence))
  );
}

async function getIdentificationCacheKey(imageData: string) {
  if (!globalThis.crypto?.subtle) return null;

  try {
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(imageData),
    );

    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  } catch {
    return null;
  }
}

function getCachedIdentification(key: string | null) {
  if (!key) return null;

  try {
    const storageKey = `yumi:vision:${IDENTIFICATION_CACHE_VERSION}:${key}`;
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return null;

    const cached = JSON.parse(stored) as CachedIdentification;
    if (
      !Number.isFinite(cached.expiresAt) ||
      cached.expiresAt <= Date.now() ||
      !isIdentificationResult(cached.result)
    ) {
      window.localStorage.removeItem(storageKey);
      return null;
    }

    return cached.result;
  } catch {
    return null;
  }
}

function cacheIdentification(
  key: string | null,
  result: IdentificationResult,
) {
  if (!key) return;

  try {
    const cached: CachedIdentification = {
      expiresAt: Date.now() + IDENTIFICATION_CACHE_TTL_MS,
      result,
    };

    window.localStorage.setItem(
      `yumi:vision:${IDENTIFICATION_CACHE_VERSION}:${key}`,
      JSON.stringify(cached),
    );
  } catch {
    // Recognition still works when private browsing disables local storage.
  }
}

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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 8.5a5 5 0 010 7"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.5 6a8.5 8.5 0 010 12"
      />
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
    <svg
      className="h-5 w-5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
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

function BookmarkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="M6 4.5h12v15l-6-4-6 4v-15z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M5 12h13M13 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CameraOverlay({
  videoRef,
  onClose,
  onCapture,
  closeCameraAriaLabel,
  captureAriaLabel,
  focusHint,
}: CameraOverlayProps) {
  const motion = useSheetMotion({ onClose });

  return (
    <section
      {...motion.panelProps}
      className={`${motion.panelClassName} fixed inset-0 z-[100] overflow-hidden bg-black`}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/45 to-transparent" />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-52 w-52">
          <span className="absolute left-0 top-0 h-9 w-9 rounded-tl-[20px] border-l-2 border-t-2 border-white/80" />
          <span className="absolute right-0 top-0 h-9 w-9 rounded-tr-[20px] border-r-2 border-t-2 border-white/80" />
          <span className="absolute bottom-0 left-0 h-9 w-9 rounded-bl-[20px] border-b-2 border-l-2 border-white/80" />
          <span className="absolute bottom-0 right-0 h-9 w-9 rounded-br-[20px] border-b-2 border-r-2 border-white/80" />
          <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-[0_0_0_5px_rgba(255,255,255,0.12)]" />
        </div>

        <p className="absolute top-[calc(50%+7.5rem)] rounded-full bg-black/25 px-3 py-1.5 text-xs font-medium tracking-wide text-white/90 backdrop-blur-md">
          {focusHint}
        </p>
      </div>

      <button
        type="button"
        onClick={motion.requestClose}
        aria-label={closeCameraAriaLabel}
        className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-md transition-transform duration-150 active:scale-90"
        style={{
          top: "max(1rem, env(safe-area-inset-top))",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 6l12 12M18 6L6 18"
          />
        </svg>
      </button>

      <div
        className={`${motion.handleClassName} absolute inset-x-0 z-10 flex h-12 items-start justify-center pt-3`}
        style={{ top: "env(safe-area-inset-top)" }}
        {...motion.handleProps}
      >
        <span className="h-1 w-12 rounded-full bg-white/55 shadow-sm" />
      </div>

      <div
        className="absolute inset-x-0 bottom-0 flex justify-center"
        style={{
          paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <button
          type="button"
          onClick={onCapture}
          aria-label={captureAriaLabel}
          className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-[3px] border-white/95 transition-transform duration-150 active:scale-95"
        >
          <span className="h-[60px] w-[60px] rounded-full bg-white" />
        </button>
      </div>
    </section>
  );
}

function CaptureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { isLearningChinese } = useLearningLanguageContext();
  const capture = t.capture;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
  const cameraSupported = useSyncExternalStore(
    subscribeNever,
    readCameraSupport,
    assumeSupported,
  );
  const speechSupported = useSyncExternalStore(
    subscribeNever,
    readSpeechSupport,
    assumeSupported,
  );
  const [speakingLang, setSpeakingLang] = useState<"en" | "zh" | null>(null);
  const [pronunciationEntry, setPronunciationEntry] = useState<{
    key: string;
    data: PronunciationResult | null;
  } | null>(null);

  const [friendPickerOpen, setFriendPickerOpen] = useState(false);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState("");
  const [sendingFriendId, setSendingFriendId] = useState<string | null>(null);
  const friendsRequestedRef = useRef(false);

  const sourceParam = searchParams.get("source");
  const withParam = searchParams.get("with");
  const fromParam = searchParams.get("from");

  const source: CaptureSource =
    sourceParam === "camera" || sourceParam === "library"
      ? sourceParam
      : null;

  const messagesHref = withParam
    ? `/messages?with=${withParam}`
    : "/messages";

  /**
   * Where Cancel goes back to.
   *
   * It used to be messages-or-home, so every entry from the vocabulary page —
   * the search bar's camera and photo buttons, the Yumi menu, the empty-state
   * link — dropped the user on the home screen instead of the list they
   * started from.
   *
   * Matched against a fixed set rather than used as a path: the value comes
   * from the query string, and treating it as one would be an open redirect.
   */
  const cancelHref = withParam
    ? messagesHref
    : fromParam === "vocabulary"
      ? "/vocabulary"
      : "/";

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, [result]);

  // Same phonetic lookup used by the Discover vocabulary drawer (English
  // IPA via the free dictionary API, zhuyin/pinyin computed locally) — so
  // a word identified here looks consistent with the rest of the app's
  // word cards.
  const pronunciationKey = result
    ? `${result.englishName}|${result.chineseName}`
    : null;

  // Derived rather than cleared: tagging the fetched data with the word it
  // was fetched for means a slow response for a previous identification can
  // never appear beside the current one, and nothing has to be reset
  // synchronously when `result` changes.
  const pronunciation =
    pronunciationKey && pronunciationEntry?.key === pronunciationKey
      ? pronunciationEntry.data
      : null;

  useEffect(() => {
    if (!result || !pronunciationKey) return;

    let cancelled = false;

    void getPronunciation(result.englishName, result.chineseName).then(
      (data) => {
        if (!cancelled) setPronunciationEntry({ key: pronunciationKey, data });
      }
    );

    return () => {
      cancelled = true;
    };
  }, [result, pronunciationKey]);

  // Body scrolling is locked by the camera overlay's own useSheetMotion, which
  // now also handles overscroll. A second lock here fought it: this one lived
  // as long as cameraActive, the overlay's only while the overlay was
  // mounted, and taking a photo unmounts the overlay first — so the overlay
  // released a lock this effect was still holding.

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;

    if (!cameraActive || !video || !stream) return;

    video.srcObject = stream;

    const handleLoadedMetadata = () => {
      void video.play().catch((playError) => {
        console.error("video.play() failed:", playError);
        setError(capture.errors.cameraPreview);
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
      }, 200);

      return () => window.clearTimeout(timeout);
    }
  }, [source]);

  function speak(text: string, language: "en" | "zh") {
    if (!speechSupported || !text.trim()) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const targetLang = language === "en" ? "en-US" : "zh-TW";
    const langPrefix = language === "en" ? "en" : "zh";

    utterance.lang = targetLang;
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const matchedVoice =
      voices.find((voice) => voice.lang === targetLang) ??
      voices.find((voice) =>
        voice.lang.toLowerCase().startsWith(langPrefix)
      );

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => setSpeakingLang(language);
    utterance.onend = () => setSpeakingLang(null);
    utterance.onerror = () => setSpeakingLang(null);

    window.speechSynthesis.speak(utterance);
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  }

  async function startCamera() {
    if (cameraStarting || cameraActive) return;

    setError("");
    setResult(null);
    setImageData(null);
    setSaved(false);
    setCameraStarting(true);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStarting(false);
      takePhotoInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
          width: {
            ideal: 1920,
          },
          height: {
            ideal: 1080,
          },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);
    } catch (mediaError) {
      console.error("getUserMedia failed:", mediaError);

      const permissionDenied =
        mediaError instanceof DOMException &&
        (mediaError.name === "NotAllowedError" ||
          mediaError.name === "PermissionDeniedError");

      setError(
        permissionDenied
          ? capture.errors.cameraPermissionDenied
          : capture.errors.cameraUnavailable
      );
    } finally {
      setCameraStarting(false);
    }
  }

  function drawToDataUrl(
    sourceImage: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
    maxDimension: number = MAX_DIMENSION
  ): string | null {
    if (
      !Number.isFinite(sourceWidth) ||
      !Number.isFinite(sourceHeight) ||
      sourceWidth <= 0 ||
      sourceHeight <= 0
    ) {
      return null;
    }

    const canvas =
      canvasRef.current ?? document.createElement("canvas");

    const scale = Math.min(
      1,
      maxDimension / Math.max(sourceWidth, sourceHeight)
    );

    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));

    const context = canvas.getContext("2d");

    if (!context) return null;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      sourceImage,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  }

  /**
   * Re-renders the stored preview down to MAX_AI_DIMENSION for the
   * identification request. Falls back to the full-size copy if the decode
   * fails: a larger image only costs more, whereas throwing here would block
   * the capture entirely.
   */
  function buildAiImage(dataUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const image = new Image();

      image.onload = () => {
        resolve(
          drawToDataUrl(
            image,
            image.naturalWidth,
            image.naturalHeight,
            MAX_AI_DIMENSION
          ) ?? dataUrl
        );
      };

      image.onerror = () => resolve(dataUrl);
      image.src = dataUrl;
    });
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
          const dataUrl = drawToDataUrl(
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

  async function handleSelectedFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    setError("");
    setResult(null);
    setSaved(false);

    if (!file.type.startsWith("image/")) {
      setError(capture.errors.selectImage);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(capture.errors.imageTooLarge);
      return;
    }

    try {
      const compressedImage = await compressImage(file);

      stopCamera();
      setImageData(compressedImage);
      setFileName(file.name);
    } catch (uploadError) {
      console.error(uploadError);
      setError(capture.errors.processImage);
    }
  }

  function capturePhoto() {
    const video = videoRef.current;

    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setError(capture.errors.cameraNotReady);
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      setError(capture.errors.cameraNotReady);
      return;
    }

    const dataUrl = drawToDataUrl(
      video,
      video.videoWidth,
      video.videoHeight
    );

    if (!dataUrl) {
      setError(capture.errors.captureImage);
      return;
    }

    setImageData(dataUrl);
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

    try {
      // Keyed on the downscaled copy because that is what determines the
      // model's answer.
      const aiImage = await buildAiImage(imageData);
      const cacheKey = await getIdentificationCacheKey(aiImage);
      const cachedResult = getCachedIdentification(cacheKey);

      if (cachedResult) {
        setResult(cachedResult);
        return;
      }

      const controller = new AbortController();
      const timeout = window.setTimeout(
        () => controller.abort(),
        IDENTIFICATION_TIMEOUT_MS,
      );

      let response: Response;

      try {
        response = await fetch("/api/identify-object", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: aiImage,
          }),
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeout);
      }

      const data = (await response.json()) as
        | IdentificationResult
        | { error: string; code?: string };

      if (!response.ok || "error" in data) {
        if ("error" in data && data.code === "daily_limit") {
          throw new Error("VISION_DAILY_LIMIT");
        }

        if (response.status === 429 || response.status === 503) {
          throw new Error("VISION_BUSY");
        }

        throw new Error(
          "error" in data
            ? data.error
            : "Could not identify this image."
        );
      }

      cacheIdentification(cacheKey, data);
      setResult(data);
    } catch (requestError) {
      console.error(requestError);
      setError(
        requestError instanceof DOMException && requestError.name === "AbortError"
          ? capture.errors.identifyTimeout
          : requestError instanceof Error &&
              requestError.message === "VISION_DAILY_LIMIT"
            ? capture.errors.identifyDailyLimit
          : requestError instanceof Error && requestError.message === "VISION_BUSY"
            ? capture.errors.identifyBusy
            : capture.errors.identifyImage,
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function createShareText() {
    if (!result) return "";

    return encodeWordCardMessage({
      word: result.englishName,
      translation: result.chineseName,
      partOfSpeech: result.partOfSpeech,
      englishExample: result.englishExample,
      chineseExample: result.chineseExample,
    });
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
        throw new Error(capture.errors.loginBeforeSave);
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

      const { error: insertError } = await supabase
        .from("vocabulary_items")
        .insert({
          user_id: user.id,
          word: result.englishName.trim(),
          translation: result.chineseName.trim(),
          language: "english",
          part_of_speech:
            result.partOfSpeech.trim() || null,
          example_sentence:
            result.englishExample.trim() || null,
          translated_example:
            result.chineseExample.trim() || null,
          image_url: publicImage.publicUrl,
          confidence: result.confidence,
          status: "new",
        });

      if (insertError) {
        await supabase.storage
          .from("vocabulary-images")
          .remove([imagePath]);

        throw insertError;
      }

      setSaved(true);
      router.push("/vocabulary");
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error &&
          saveError.message === capture.errors.loginBeforeSave
          ? capture.errors.loginBeforeSave
          : capture.errors.saveWord
      );
    } finally {
      setSaving(false);
    }
  }

  async function loadFriends() {
    friendsRequestedRef.current = true;
    setFriendsLoading(true);
    setFriendsError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setFriendsError(capture.errors.loginBeforeShare);
      setFriendsLoading(false);
      friendsRequestedRef.current = false;
      return;
    }

    try {
      const friendsData = await listFriends(supabase, user.id);
      setFriends(friendsData);
    } catch (loadError) {
      console.error("Failed to load friends:", loadError);
      setFriendsError(capture.errors.loadPartners);
      friendsRequestedRef.current = false;
    } finally {
      setFriendsLoading(false);
    }
  }

  function sendToPartner() {
    if (!result) return;

    // Already inside a specific conversation (opened the camera from
    // there via ?with=) — the recipient is already known, so this keeps
    // the existing draft-prefill behavior instead of asking again.
    if (withParam) {
      sessionStorage.setItem("exchange-notes-draft-message", createShareText());
      router.push(messagesHref);
      return;
    }

    // Arrived from Discover with no target conversation — the recipient
    // isn't known yet, so ask who via the same friend picker Vocabulary
    // uses, instead of silently dropping onto the conversation list.
    setFriendPickerOpen(true);
    if (!friendsRequestedRef.current) {
      void loadFriends();
    }
  }

  function handleClosePicker() {
    setFriendPickerOpen(false);
    setSendingFriendId(null);
  }

  function handlePickFriend(friendId: string) {
    if (!result || sendingFriendId) return;

    setSendingFriendId(friendId);
    setPendingSharedVocabulary({
      word: result.englishName,
      translation: result.chineseName,
      partOfSpeech: result.partOfSpeech,
      englishExample: result.englishExample,
      chineseExample: result.chineseExample,
    });
    router.push(`/messages?with=${encodeURIComponent(friendId)}`);
  }

  function chooseAnotherImage() {
    window.speechSynthesis?.cancel();

    setImageData(null);
    setFileName("");
    setResult(null);
    setError("");
    setSaved(false);

    chooseImageInputRef.current?.click();
  }

  function reset() {
    stopCamera();
    window.speechSynthesis?.cancel();

    setImageData(null);
    setFileName("");
    setResult(null);
    setError("");
    setSaved(false);
    setAnalyzing(false);
    setSaving(false);
    setSpeakingLang(null);
  }

  return (
    <main className="min-h-[100dvh] bg-surface text-neutral-950">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-4">
        {/*
          Hidden while the camera is coming up, not only while it is up.

          getUserMedia takes a permission prompt and a stream to resolve, and
          during that beat this page used to show its whole landing screen —
          header, title, hero copy — behind a prompt for a camera the user has
          already asked for. Reaching the viewfinder felt like passing through
          an unrelated page. cameraStarting is a safe condition to gate on
          because it always resolves: either cameraActive turns true or the
          catch sets an error, and both bring this back.
        */}
        {!cameraActive && !cameraStarting && (
          <header
            className="flex h-14 shrink-0 items-center justify-between"
            style={{
              paddingTop: "env(safe-area-inset-top)",
            }}
          >
            <Link
              href={cancelHref}
              className="min-w-14 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
            >
              {capture.camera.cancel}
            </Link>

            <h1 className="text-sm font-semibold tracking-tight">
              {capture.title}
            </h1>

            <button
              type="button"
              onClick={reset}
              className="min-w-14 text-right text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
            >
              {capture.reset}
            </button>
          </header>
        )}

        {!cameraActive && !cameraStarting && !imageData && (
          <section className="flex flex-1 flex-col items-center justify-center pb-28 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
              English × 繁體中文
            </p>

            <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.03em]">
              {capture.source.title}
            </h2>

            <p className="mt-2 max-w-[260px] text-sm leading-6 text-neutral-500">
              {capture.source.description}
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

                <span className="text-xs font-medium text-neutral-600">
                  {capture.source.useCamera}
                </span>
              </button>

              <button
                type="button"
                onClick={() => chooseImageInputRef.current?.click()}
                className="group flex w-20 flex-col items-center gap-2.5"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-black/5 bg-white text-neutral-900 transition-transform duration-150 group-active:scale-95">
                  <LibraryIcon />
                </span>

                <span className="text-xs font-medium text-neutral-600">
                  {capture.source.photoLibrary}
                </span>
              </button>
            </div>

            {!cameraSupported && (
              <p className="mt-8 max-w-xs text-xs leading-5 text-neutral-400">
                {capture.source.unsupported}
              </p>
            )}
          </section>
        )}

        {/*
          The hold between the tap and the lens. Black rather than the page
          surface, so what the user sees is the camera arriving rather than the
          app going blank — and no view transition is involved, which is what
          once left the viewfinder visible with every control dead.
        */}
        {cameraStarting && (
          <div
            className="fixed inset-0 z-[90] grid place-items-center bg-black"
            role="status"
            aria-live="polite"
          >
            <p className="text-xs font-medium tracking-wide text-white/70">
              {capture.camera.opening}
            </p>
          </div>
        )}

        {cameraActive && !imageData && (
          <CameraOverlay
            videoRef={videoRef}
            onClose={stopCamera}
            onCapture={capturePhoto}
            closeCameraAriaLabel={capture.camera.closeCameraAriaLabel}
            captureAriaLabel={capture.camera.captureAriaLabel}
            focusHint={capture.camera.focusHint}
          />
        )}

        {!cameraActive && imageData && (
          <section className="flex flex-1 flex-col pb-28">
            <div className="relative overflow-hidden rounded-[24px] bg-neutral-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageData}
                alt={capture.camera.selectedObjectAlt}
                className={
                  result
                    ? "h-[15dvh] max-h-[130px] min-h-[100px] w-full object-cover"
                    : "max-h-[52dvh] w-full object-contain"
                }
              />

              {analyzing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                  <span className="relative z-10 flex items-center gap-2 rounded-full border border-white/20 bg-black/45 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-xl">
                    <SpinnerIcon />
                    {capture.identifying}
                  </span>
                  <span className="absolute inset-x-8 top-1/2 h-px animate-pulse bg-gradient-to-r from-transparent via-white/90 to-transparent shadow-[0_0_12px_rgba(255,255,255,0.7)]" />
                </div>
              )}
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
                  {capture.camera.chooseAnother}
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
                      {capture.identifying}
                    </span>
                  ) : (
                    capture.identify
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
              <div className="flex flex-1 flex-col pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                    {capture.result.eyebrow}
                  </span>

                  <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[10px] font-medium text-neutral-500">
                    {insertValues(capture.result.confidence, {
                      value:
                        result.confidence === "high"
                          ? t.vocabulary.detail.confidenceHigh
                          : result.confidence === "low"
                            ? t.vocabulary.detail.confidenceLow
                            : t.vocabulary.detail.confidenceMedium,
                    })}
                  </span>
                </div>

                {isLearningChinese ? (
                  <>
                    <h2 className="mt-2 break-words text-[24px] font-semibold tracking-[-0.03em]">
                      {result.chineseName}
                    </h2>
                    <p className="mt-0.5 break-words text-base font-normal text-neutral-400">
                      {result.englishName}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="mt-2 break-words text-[24px] font-semibold tracking-[-0.03em]">
                      {result.englishName}
                    </h2>
                    <p className="mt-0.5 break-words text-base font-normal text-neutral-400">
                      {result.chineseName}
                    </p>
                  </>
                )}
                <p className="mt-1 text-xs text-neutral-400">
                  {
                    t.vocabulary.detail.partOfSpeech[
                      normalizePartOfSpeech(result.partOfSpeech)
                    ]
                  }
                </p>

                <div className="mt-2.5 space-y-1.5">
                  {(() => {
                    const englishIsPrimary = !isLearningChinese;
                    const primaryValueClass =
                      "mt-0.5 block break-words text-[16px] font-semibold text-black/90";
                    const secondaryValueClass =
                      "mt-0.5 block break-words text-[14px] font-normal text-black/45";
                    const primaryButtonClass =
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white shadow-sm transition active:scale-90";
                    const secondaryButtonClass =
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black/60 shadow-sm transition active:scale-90";

                    const englishBox = (
                      <div
                        key="english"
                        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-2.5 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-black/40">
                            English
                          </span>
                          <span
                            className={
                              englishIsPrimary
                                ? primaryValueClass
                                : secondaryValueClass
                            }
                          >
                            {result.englishName}
                          </span>
                          {pronunciation?.englishPronunciation && (
                            <span className="mt-0.5 block text-[12px] text-black/40">
                              {pronunciation.englishPronunciation}
                            </span>
                          )}
                        </span>

                        {speechSupported && (
                          <button
                            type="button"
                            onClick={() => speak(result.englishName, "en")}
                            aria-label={capture.result.playEnglishAriaLabel}
                            className={
                              englishIsPrimary
                                ? primaryButtonClass
                                : secondaryButtonClass
                            }
                          >
                            <SpeakerIcon speaking={speakingLang === "en"} />
                          </button>
                        )}
                      </div>
                    );

                    const chineseBox = (
                      <div
                        key="chinese"
                        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-2.5 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-black/40">
                            中文
                          </span>
                          <span
                            className={
                              englishIsPrimary
                                ? secondaryValueClass
                                : primaryValueClass
                            }
                          >
                            {result.chineseName}
                          </span>
                          {(pronunciation?.pinyin || pronunciation?.zhuyin) && (
                            <span className="mt-0.5 block text-[12px] text-black/40">
                              {[pronunciation?.pinyin, pronunciation?.zhuyin]
                                .filter(Boolean)
                                .join("  ")}
                            </span>
                          )}
                        </span>

                        {speechSupported && (
                          <button
                            type="button"
                            onClick={() => speak(result.chineseName, "zh")}
                            aria-label={capture.result.playChineseAriaLabel}
                            className={
                              englishIsPrimary
                                ? secondaryButtonClass
                                : primaryButtonClass
                            }
                          >
                            <SpeakerIcon speaking={speakingLang === "zh"} />
                          </button>
                        )}
                      </div>
                    );

                    return isLearningChinese
                      ? [chineseBox, englishBox]
                      : [englishBox, chineseBox];
                  })()}
                </div>

                {(result.englishExample || result.chineseExample) && (
                  <div className="mt-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/32">
                      {t.vocabulary.detail.example}
                    </p>

                    <div className="mt-1.5 space-y-1.5">
                      {(() => {
                        const englishExampleBox = result.englishExample ? (
                          <div
                            key="english-example"
                            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-2.5 text-left"
                          >
                            <span className="min-w-0 break-words text-sm leading-6 text-neutral-900">
                              {result.englishExample}
                            </span>

                            {speechSupported && (
                              <button
                                type="button"
                                onClick={() =>
                                  speak(result.englishExample, "en")
                                }
                                aria-label={
                                  capture.result.playEnglishAriaLabel
                                }
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black/60 shadow-sm transition active:scale-90"
                              >
                                <SpeakerIcon
                                  speaking={speakingLang === "en"}
                                />
                              </button>
                            )}
                          </div>
                        ) : null;

                        const chineseExampleBox = result.chineseExample ? (
                          <div
                            key="chinese-example"
                            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-2.5 text-left"
                          >
                            <span className="min-w-0 break-words text-sm leading-6 text-neutral-500">
                              {result.chineseExample}
                            </span>

                            {speechSupported && (
                              <button
                                type="button"
                                onClick={() =>
                                  speak(result.chineseExample, "zh")
                                }
                                aria-label={
                                  capture.result.playChineseAriaLabel
                                }
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black/60 shadow-sm transition active:scale-90"
                              >
                                <SpeakerIcon
                                  speaking={speakingLang === "zh"}
                                />
                              </button>
                            )}
                          </div>
                        ) : null;

                        return isLearningChinese
                          ? [chineseExampleBox, englishExampleBox]
                          : [englishExampleBox, chineseExampleBox];
                      })()}
                    </div>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => void saveToVocabulary()}
                    disabled={saving || saved}
                    aria-label={
                      saving
                        ? capture.result.saving
                        : saved
                          ? capture.result.saved
                          : capture.result.saveToVocabulary
                    }
                    className="flex h-12 w-full items-center justify-center rounded-2xl bg-neutral-950 text-white transition-transform active:scale-[0.98] disabled:opacity-40"
                  >
                    {saving ? (
                      <SpinnerIcon />
                    ) : saved ? (
                      <CheckIcon />
                    ) : (
                      <BookmarkIcon />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={sendToPartner}
                    aria-label={capture.result.sendToPartner}
                    className="flex h-12 w-full items-center justify-center rounded-2xl border border-black/[0.06] bg-white text-neutral-900 transition-transform active:scale-[0.98]"
                  >
                    <SendIcon />
                  </button>
                </div>
              </div>
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

      {friendPickerOpen && (
        <FriendPickerModal
          friends={friends}
          loading={friendsLoading}
          errorMessage={friendsError}
          sendingFriendId={sendingFriendId}
          onClose={handleClosePicker}
          onPick={handlePickFriend}
          onRetry={() => void loadFriends()}
        />
      )}
    </main>
  );
}

function CaptureLoading() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-surface text-neutral-950">
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <SpinnerIcon />
        {t.common.loading}
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
