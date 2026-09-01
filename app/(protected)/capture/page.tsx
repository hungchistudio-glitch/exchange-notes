"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import {
  DuplicateVocabularyError,
  createVocabularyEntry,
} from "@/lib/vocabulary/createEntry";
import TargetCamera, {
  type CameraCapture,
} from "@/components/camera/TargetCamera";
import TargetImageViewer from "@/components/camera/TargetImageViewer";
import { AssetWriteError, commitCapture } from "@/lib/media/assets";
import {
  PdfRenderError,
  isPdf,
  openPdf,
  type PdfDocument,
} from "@/lib/media/pdf";
import { publishCardBlob } from "@/lib/media/sharing";
import { MAX_IMAGE_FILE_SIZE } from "@/lib/media/config";
import type { NormalizedRect } from "@/lib/media/geometry";
import { buildCapture, type BuiltCapture } from "@/lib/media/pipeline";
import { MediaDecodeError, decodeBlob, type Raster } from "@/lib/media/raster";
import type { MediaSourceType } from "@/lib/media/record";
import {
  encodeWordCardMessage,
  type SharedWordCard,
} from "@/lib/messages/wordCard";
import { getPronunciationForPair, type PronunciationResult } from "@/lib/pronunciation/getPronunciation";
import { listFriends, type FriendProfile } from "@/lib/friends";
import { setPendingSharedVocabulary } from "@/lib/vocabularyDraft";
import FriendPickerModal from "@/components/vocabulary/FriendPickerModal";
import VocabularyCopyButton from "@/components/vocabulary/ui/VocabularyCopyButton";
import useTranslation from "@/hooks/i18n/useTranslation";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import { useLexiconSearchSheet } from "@/contexts/LexiconSearchContext";
import {
  getLanguage,
  getLanguageName,
  isLanguageCode,
  type LanguageCode,
} from "@/lib/languages";
import { speak as speakText } from "@/lib/speech";
import { insertValues } from "@/lib/utils";
import { normalizePartOfSpeech } from "@/lib/vocabulary/partOfSpeech";

type IdentificationResult = {
  term: string;
  translation: string;
  partOfSpeech: string;
  termExample: string;
  translationExample: string;
  confidence: "high" | "medium" | "low";
  /**
   * Which language each side is in, as the model reported it.
   *
   * Absent on results cached before the schema carried them — v2 keys did
   * not include it — so every read falls back to the reader's pair rather
   * than requiring it.
   */
  termLanguage?: LanguageCode;
  translationLanguage?: LanguageCode;
};

type CaptureSource = "camera" | "library" | null;

function safeReturnHref(value: string | null, fallback: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

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

/*
 * Every size, quality and margin this screen used to decide for itself now
 * comes from lib/media/config, which is the whole point of that file: the
 * capture screen resized to 1280, the search sheet to 768, and the menu
 * camera to 1800, and all three were answering the same question.
 */
const MAX_FILE_SIZE = MAX_IMAGE_FILE_SIZE;

const IDENTIFICATION_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/*
 * Above the server's own budget, deliberately.
 *
 * At sixteen seconds this abort fired while the route was still working, and
 * the reader was told the recognition had timed out for a request that had
 * already spent a daily unit and was about to answer. The server now bounds
 * itself (VISION_TOTAL_BUDGET_MS, twenty seconds by default) and returns a
 * real error when it runs out; this is the backstop for a connection that
 * dies rather than the thing that decides how long a reader waits.
 */
const IDENTIFICATION_TIMEOUT_MS = 25 * 1000;
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
      "term",
      "translation",
      "partOfSpeech",
      "termExample",
      "translationExample",
    ].every(
      (field) =>
        typeof candidate[field] === "string" &&
        (candidate[field] as string).trim().length > 0,
    ) &&
    ["high", "medium", "low"].includes(String(candidate.confidence)) &&
    // A cached result predating these fields has neither, and is still good.
    [candidate.termLanguage, candidate.translationLanguage].every(
      (value) => value === undefined || value === null || isLanguageCode(value),
    )
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

function CaptureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language: interfaceLanguage } = useTranslation();
  const { pair: languagePair } = useDisplayLanguages();

  /*
   * The app-wide search sheet, opened over this screen once the photo has
   * been read. See the hand-off effect below.
   */
  const { openSearch } = useLexiconSearchSheet();
  const capture = t.capture;

  /*
   * The camera, the photo picker and the file picker all live inside
   * TargetCamera now. What this screen keeps is what happens after the
   * shutter: a built capture waiting to be recognised, and the card image
   * to show while that happens.
   */
  const [built, setBuilt] = useState<BuiltCapture | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  /*
   * An imported photograph, held between "a file arrived" and "the reader
   * pointed at the part of it that matters".
   *
   * The raster is kept rather than the File, because decoding is the
   * expensive half and doing it once — before the viewer, and again for the
   * crop — would be doing it twice.
   */
  const [pendingImage, setPendingImage] = useState<{
    src: string;
    raster: Raster;
    fileName: string;
    /** One-based, for a source that has pages. */
    page?: number;
    /*
     * Carried in state rather than read off documentRef while rendering.
     * React 19 forbids reading a ref during render, and it would be wrong
     * anyway: the first render after a file is picked happens before the
     * ref is populated, so the stepper would be missing for one frame.
     */
    pageCount?: number;
  } | null>(null);

  /*
   * The open document, while the reader is looking through it.
   *
   * Held so that turning a page is a render rather than a re-parse, and
   * closed the moment the viewer does — a parsed PDF owns a worker thread,
   * and leaking one per file opened is exactly the kind of thing that makes
   * an app feel heavier the longer it is used.
   */
  const documentRef = useRef<PdfDocument | null>(null);

  const [preparing, setPreparing] = useState(false);
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
  const [speakingLang, setSpeakingLang] = useState<LanguageCode | null>(null);
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
  const widgetAction = searchParams.get("widgetAction");
  const withParam = searchParams.get("with");
  const fromParam = searchParams.get("from");

  const source: CaptureSource =
    sourceParam === "camera" || sourceParam === "library"
      ? sourceParam
      : widgetAction === "camera"
        ? "camera"
        : null;

  /*
   * Opened straight away when the link asked for it.
   *
   * `source` is known from the URL on the first render, so this is initial
   * state rather than something an effect synchronises afterwards — which
   * would paint the landing screen for one frame before replacing it, and
   * trip this project's cascading-render rule on the way.
   *
   * Declared here rather than up with the other state because it reads
   * `source`, and a lazy initialiser that closes over a `const` declared
   * below it throws on the first render.
   */
  const [cameraOpen, setCameraOpen] = useState(() => source !== null);

  const messagesHref = withParam
    ? `/messages/new?friend=${encodeURIComponent(withParam)}`
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
      : "/home";
  const returnHref = safeReturnHref(searchParams.get("returnTo"), cancelHref);

  const leaveCapture = useCallback(() => {
    setCameraOpen(false);
    window.speechSynthesis?.cancel();

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.replace(returnHref);
  }, [returnHref, router]);

  /**
   * Whether the camera was opened from the Universal Search.
   *
   * When it was, this screen's job ends at recognition. It reads the photo,
   * hands the word to the search, and gets out of the way — see the effect
   * below.
   *
   * It used to show its own result card first, so a photographed word passed
   * two near-identical cards with two save buttons before it could be kept.
   * Two cards for one word is two chances to wonder which one is the real
   * answer.
   */
  const fromLexicon = fromParam === "lexicon";

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, [result]);

  /*
   * The picker-return dance that used to live here is gone.
   *
   * Two effects and three refs existed to notice that a file picker had been
   * dismissed without a file, because no browser fires a reliable event for
   * that and the screen had to decide whether to exit. The pickers belong to
   * TargetCamera now, which is still on screen either way — a cancelled
   * picker just puts the preview back, which needs no bookkeeping at all.
   */

  /*
   * Recognised, and straight into the answer.
   *
   * Two things happen here and the order is the whole of it: the sheet opens
   * *first*, and the route is replaced underneath it second.
   *
   * The sheet is mounted on the protected layout, which both this screen and
   * the home screen are inside, so it survives the navigation — it is already
   * covering the display when the route changes, and the reader never sees
   * the page swap. Doing it the other way round is what made a photographed
   * word travel through a fully painted home screen to reach its own card.
   *
   * Replacing the route also means closing the card leaves the reader at home
   * rather than back on a capture screen still holding the same word. That
   * used to be a second effect watching the sheet close, which fired on the
   * wrong sheet: arriving here from the search's own Scan button, the sheet
   * that was closing behind the navigation counted as "the card was
   * dismissed", and the reader was bounced home before they had taken a
   * photo. There is no close to detect any more.
   */
  useEffect(() => {
    if (!fromLexicon || !result?.term) return;

    openSearch({ query: result.term, autoSubmit: true });
    router.replace(returnHref);
  }, [fromLexicon, openSearch, result, returnHref, router]);

  /*
   * The two languages this result is actually in.
   *
   * The model reports them, and they are what the card renders, speaks and
   * saves under. Falling back to the reader's pair covers results cached
   * before the schema carried the fields — the pair is what the prompt asked
   * for, so it is the right fallback rather than a guess.
   */
  const termLanguage = result?.termLanguage ?? languagePair[0];
  const translationLanguage =
    result?.translationLanguage ??
    (termLanguage === languagePair[1] ? languagePair[0] : languagePair[1]);

  // Same phonetic lookup used by the Discover vocabulary drawer (IPA via the
  // free dictionary API, zhuyin/pinyin computed locally) — so a word
  // identified here looks consistent with the rest of the app's word cards.
  const pronunciationKey = result
    ? `${result.term}|${result.translation}`
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

    void getPronunciationForPair(
      { text: result.term, language: termLanguage },
      { text: result.translation, language: translationLanguage },
    ).then(
      (data) => {
        if (!cancelled) setPronunciationEntry({ key: pronunciationKey, data });
      }
    );

    return () => {
      cancelled = true;
    };
  }, [result, pronunciationKey, termLanguage, translationLanguage]);

  /*
   * Attaching the stream to the element, keeping the preview alive across
   * the photo picker, and stopping the tracks on the way out are all
   * useCameraStream's job now (hooks/camera/useCameraStream.ts). Three
   * effects and a ref went with them.
   */

  function speak(text: string, language: LanguageCode) {
    if (!speechSupported || !text.trim()) return;

    speakText(text, getLanguage(language).speechTag, {
      onStart: () => setSpeakingLang(language),
      onEnd: () => setSpeakingLang(null),
      onError: () => setSpeakingLang(null),
    });
  }

  /**
   * A raster and a target, turned into everything a save will need.
   *
   * The single funnel for all three ways a picture can arrive here — the
   * shutter, the photo library, a file — which is what makes them one
   * workflow rather than three that happen to end at the same screen.
   *
   * The raster is released whatever happens: it is the full-resolution
   * frame, and on a 12-megapixel phone camera holding one by accident is
   * tens of megabytes that never come back.
   */
  const prepare = useCallback(
    async (
      raster: Raster,
      targetRect: NormalizedRect,
      sourceType: MediaSourceType,
      name: string,
      page?: number,
    ) => {
      setPreparing(true);
      setError("");
      setResult(null);
      setSaved(false);

      try {
        const next = await buildCapture({
          raster,
          targetRect,
          sourceType,
          recognitionKind: "object",
          /*
           * The model is sent the target, not the whole frame. The prompt
           * asks for "the object at the exact centre", which was only ever
           * approximately true — cropping to what the reader actually
           * pointed at makes it true.
           */
          recognitionScope: "target",
          sourceFileName: sourceType === "camera" ? undefined : name,
          // Kept so a saved word can say which page of which document it
          // came from, which is the source relationship the spec asks for.
          sourcePage: page,
        });

        setBuilt(next);
        setImageData(URL.createObjectURL(next.capture.card.blob));
        setFileName(name);
        setCameraOpen(false);
        setPendingImage(null);
      } catch (buildError) {
        console.error(buildError);
        setError(
          buildError instanceof MediaDecodeError
            ? capture.errors.processImage
            : capture.errors.captureImage,
        );
      } finally {
        raster.close();
        setPreparing(false);
      }
    },
    [capture.errors.captureImage, capture.errors.processImage],
  );

  const onCameraCapture = useCallback(
    ({ raster, targetRect }: CameraCapture) => {
      void prepare(raster, targetRect, "camera", "camera-photo.webp");
    },
    [prepare],
  );

  /**
   * One page of a document, rendered and put in front of the reader.
   *
   * Shares everything after the render with a photograph: the same viewer,
   * the same target selection, the same pipeline. Only the way the pixels
   * are obtained differs, which is the whole point of the Raster type.
   */
  const showPage = useCallback(
    async (page: number, fileName: string) => {
      const document_ = documentRef.current;

      if (!document_) return;

      setPreparing(true);

      try {
        const raster = await document_.renderPage(page);

        /*
         * The page render becomes an object URL only so the viewer can show
         * it. It is never uploaded — the retained source and the card are
         * made from the raster by the pipeline, and both are a fraction of
         * this render's size.
         */
        const blob = await new Promise<Blob | null>((resolve) =>
          (raster.source as HTMLCanvasElement).toBlob(resolve, "image/webp", 0.9),
        );

        setPendingImage((current) => {
          if (current) {
            current.raster.close();
            URL.revokeObjectURL(current.src);
          }

          return blob
            ? {
                src: URL.createObjectURL(blob),
                raster,
                fileName,
                page,
                pageCount: document_.pageCount,
              }
            : null;
        });
      } catch (renderError) {
        console.error(renderError);
        setError(capture.errors.processImage);
      } finally {
        setPreparing(false);
      }
    },
    [capture.errors.processImage],
  );

  /**
   * A picked document.
   *
   * The only entry point in the app that accepts something which is not an
   * image. Page one is shown first, because that is the page somebody
   * photographing a menu or a form means nine times in ten.
   */
  const onPickFile = useCallback(
    async (file: File) => {
      setError("");

      if (!isPdf(file)) {
        setError(capture.errors.selectImage);
        return;
      }

      try {
        documentRef.current?.close();
        documentRef.current = await openPdf(file);

        await showPage(1, file.name);
      } catch (openError) {
        console.error(openError);
        setError(
          openError instanceof PdfRenderError
            ? capture.errors.processImage
            : capture.errors.captureImage,
        );
      }
    },
    [
      capture.errors.captureImage,
      capture.errors.processImage,
      capture.errors.selectImage,
      showPage,
    ],
  );

  /**
   * A picked photograph, decoded once and shown for a target to be chosen.
   *
   * The checks come first and are cheap, as they were before: a forty
   * megabyte screenshot should be refused in a microsecond rather than
   * after the browser has spent a second decoding it.
   */
  const onPickPhoto = useCallback(
    async (file: File) => {
      setError("");

      if (!file.type.startsWith("image/")) {
        setError(capture.errors.selectImage);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(capture.errors.imageTooLarge);
        return;
      }

      try {
        const raster = await decodeBlob(file);

        setPendingImage({
          src: URL.createObjectURL(file),
          raster,
          fileName: file.name,
        });
      } catch (decodeError) {
        console.error(decodeError);
        setError(capture.errors.processImage);
      }
    },
    [
      capture.errors.imageTooLarge,
      capture.errors.processImage,
      capture.errors.selectImage,
    ],
  );

  async function identifyImage() {
    if (!built || analyzing) return;

    setAnalyzing(true);
    setError("");
    setResult(null);

    try {
      /*
       * The pipeline already produced the copy the model gets, cropped to
       * the target and sized for it. Keyed on that copy because that is
       * what determines the model's answer — and it is a stronger key than
       * before, since two photographs of the same shelf with different
       * targets are now different requests rather than one cache hit.
       */
      const aiImage = built.recognitionImage;
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

  /**
   * The card for a friend, with its picture published first.
   *
   * The word being shared here has usually not been saved, so there is no
   * library asset to copy — the card derivative is sitting in memory from
   * the capture, and gets uploaded straight into the shared folder. That is
   * the one place a picture reaches storage without a vocabulary row
   * pointing at it, and it is deliberate: the message is the thing that
   * points at it, and a message is permanent.
   *
   * Both ways of sending build the card here, so a word sent into an open
   * conversation and one sent through the friend picker carry the same
   * picture rather than one of them quietly carrying none.
   */
  async function buildShareCard(): Promise<SharedWordCard | null> {
    if (!result) return null;

    let imagePath: string | undefined;

    if (built) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        imagePath =
          (await publishCardBlob(supabase, user.id, built.capture.card.blob)) ??
          undefined;
      }
    }

    return {
      imagePath,
      word: result.term,
      translation: result.translation,
      /*
       * The card carries the languages the model actually answered in, not
       * the sender's settings. Labelling them from the pair filed an Italian
       * word as English on the receiving end.
       */
      wordLanguage: termLanguage,
      translationLanguage,
      partOfSpeech: result.partOfSpeech,
      texts: {
        [termLanguage]: result.term,
        [translationLanguage]: result.translation,
      },
      examples: {
        [termLanguage]: result.termExample,
        [translationLanguage]: result.translationExample,
      },
    };
  }

  async function saveToVocabulary() {
    if (!result || !built || saving || saved) return;

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

      /*
       * The pictures are written first, then the row.
       *
       * The old order was the same, but the recovery was not: an upload
       * whose insert failed was removed in a catch, which works right up
       * until the tab closes between the two. Now the assets are committed
       * as a pair by lib/media/assets, and a failed insert leaves at most
       * two files that the orphan sweep already knows how to find.
       */
      let media = null;

      try {
        media = await commitCapture(supabase, user.id, built.capture);
      } catch (assetError) {
        /*
         * Offline, or out of storage. The word is saved without its
         * picture rather than not at all — the same trade this file
         * already makes for the duplicate check, and the right one: a
         * missing image is a nuisance, a word the reader could not save
         * is worse.
         */
        console.error(assetError);

        if (!(assetError instanceof AssetWriteError)) throw assetError;
      }

      await createVocabularyEntry({
        userId: user.id,
        term: result.term,
        translation: result.translation,
        partOfSpeech: result.partOfSpeech,
        termExample: result.termExample,
        translationExample: result.translationExample,
        media,
        confidence: result.confidence,
        status: "new",
        language: {
          pair: languagePair,
          /*
           * What the model said, not what the settings say.
           *
           * This used to state the reader's pair outright, which outranks
           * everything and is never recomputed — so a word the model itself
           * had labelled Italian was stored as English, permanently,
           * because the reader happened to be studying English that week.
           * The pair still travels along as the context the photo was taken
           * in, and as the fallback when a cached result predates the
           * language fields.
           */
          ai: {
            termLanguage: result.termLanguage,
            translationLanguage: result.translationLanguage,
          },
        },
      });

      setSaved(true);
      router.push("/vocabulary");
    } catch (saveError) {
      console.error(saveError);

      setError(
        /*
         * The duplicate check moved into createVocabularyEntry, which throws
         * rather than returning a flag — so a word already in the library
         * arrives here. Saying so is a real answer; the generic "could not
         * save" would have the reader photographing it again.
         */
        saveError instanceof DuplicateVocabularyError
          ? capture.errors.duplicateWord
          : saveError instanceof Error &&
              saveError.message === capture.errors.loginBeforeSave
            ? capture.errors.loginBeforeSave
            : capture.errors.saveWord,
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

  async function sendToPartner() {
    if (!result) return;

    // Already inside a specific conversation (opened the camera from
    // there via ?with=) — the recipient is already known, so this keeps
    // the existing draft-prefill behavior instead of asking again.
    if (withParam) {
      const card = await buildShareCard();

      if (!card) return;

      sessionStorage.setItem(
        "exchange-notes-draft-message",
        encodeWordCardMessage(card),
      );
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

  async function handlePickFriend(friendId: string) {
    if (!result || sendingFriendId) return;

    setSendingFriendId(friendId);

    const card = await buildShareCard();

    if (!card) {
      setSendingFriendId(null);
      return;
    }

    setPendingSharedVocabulary(card);
    router.push(`/messages/new?friend=${encodeURIComponent(friendId)}`);
  }

  /** Back to the camera, which is where another photograph comes from. */
  function chooseAnotherImage() {
    reset();
    setCameraOpen(true);
  }

  /**
   * Whether something is covering the whole screen.
   *
   * The camera and the imported-photo viewer are both fixed and full-bleed,
   * and the page behind them must not paint its header and hero copy — that
   * is what once made reaching the viewfinder feel like passing through an
   * unrelated page.
   */
  const fullScreen = cameraOpen || Boolean(pendingImage);

  const closeCamera = useCallback(() => {
    setCameraOpen(false);
    leaveCapture();
  }, [leaveCapture]);

  /** A picked photograph or document the reader backed out of. */
  const discardPendingImage = useCallback(() => {
    documentRef.current?.close();
    documentRef.current = null;

    // Released here rather than inside the updater: React may call an
    // updater twice, and freeing a bitmap is not a thing to do twice.
    if (pendingImage) {
      pendingImage.raster.close();
      URL.revokeObjectURL(pendingImage.src);
    }

    setPendingImage(null);
  }, [pendingImage]);

  /*
   * Released when the screen goes, not only when the reader resets.
   *
   * A raster is the full-resolution decode and an object URL pins its blob;
   * navigating away mid-flow used to be the one path that leaked both.
   *
   * Read through a ref so this runs on unmount alone. Depending on the value
   * directly would free the previous photograph every time a new one is
   * picked — which is correct by luck today, and would stop being so the
   * moment anything held on to it.
   */
  const pendingRef = useRef(pendingImage);

  useEffect(() => {
    pendingRef.current = pendingImage;
  }, [pendingImage]);

  useEffect(
    () => () => {
      documentRef.current?.close();
      documentRef.current = null;

      const held = pendingRef.current;

      if (!held) return;

      held.raster.close();
      URL.revokeObjectURL(held.src);
    },
    [],
  );

  const cameraCopy = {
    close: capture.camera.closeCameraAriaLabel,
    shutter: capture.camera.captureAriaLabel,
    torchOn: capture.camera.torchOn,
    torchOff: capture.camera.torchOff,
    photoLibrary: capture.source.photoLibrary,
    importFile: capture.camera.importFile,
    zoom: capture.camera.zoom,
    zoomLevel: capture.camera.zoomLevel,
    hint: capture.camera.targetHint,
    selectedTarget: capture.camera.selectedTarget,
    candidateTarget: capture.camera.candidateTarget,
    focused: capture.camera.focused,
    analysing: capture.camera.analysing,
    permissionDenied: capture.errors.cameraPermissionDenied,
    unavailable: capture.errors.cameraUnavailable,
    retry: capture.camera.retry,
  };

  const viewerCopy = {
    close: capture.camera.closeCameraAriaLabel,
    confirm: capture.camera.confirmTarget,
    reset: capture.camera.resetZoom,
    hint: capture.camera.targetHint,
    selectedTarget: capture.camera.selectedTarget,
    candidateTarget: capture.camera.candidateTarget,
    busy: capture.camera.analysing,
    previousPage: capture.camera.previousPage,
    nextPage: capture.camera.nextPage,
    pageLabel: capture.camera.pageLabel,
  };

  function reset() {
    window.speechSynthesis?.cancel();

    // The preview is an object URL over a blob that would otherwise be held
    // for the life of the tab.
    if (imageData) URL.revokeObjectURL(imageData);

    setBuilt(null);
    setCameraOpen(false);

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
          an unrelated page. The camera component owns that beat now — it
          paints black from its first frame and reports permission failures
          itself — so this only has to stand aside while it, or the imported
          photo viewer, is up.
        */}
        {!fullScreen && (
          <header
            className="flex h-14 shrink-0 items-center justify-between"
            style={{
              paddingTop: "env(safe-area-inset-top)",
            }}
          >
            <button
              type="button"
              onClick={leaveCapture}
              className="min-w-14 text-sm font-medium text-ink-soft transition-colors hover:text-neutral-900"
            >
              {capture.camera.cancel}
            </button>

            <h1 className="text-sm font-semibold tracking-tight">
              {capture.title}
            </h1>

            <button
              type="button"
              onClick={reset}
              className="min-w-14 text-right text-sm font-medium text-ink-soft transition-colors hover:text-neutral-900"
            >
              {capture.reset}
            </button>
          </header>
        )}

        {!fullScreen && !imageData && (
          <section className="flex flex-1 flex-col items-center justify-center pb-28 text-center">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
              {getLanguageName(languagePair[0], interfaceLanguage)} ×{" "}
              {getLanguageName(languagePair[1], interfaceLanguage)}
            </p>

            <h2 className="mt-3 text-[1.75rem] font-semibold tracking-[-0.03em]">
              {capture.source.title}
            </h2>

            <p className="mt-2 max-w-[260px] text-sm leading-6 text-ink-soft">
              {capture.source.description}
            </p>

            <div className="mt-10 flex items-start justify-center gap-12">
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                disabled={false}
                className="group flex w-20 flex-col items-center gap-2.5 disabled:opacity-40"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-950 text-white transition-transform duration-150 group-active:scale-95">
                  <CameraIcon />
                </span>

                <span className="text-xs font-medium text-neutral-600">
                  {capture.source.useCamera}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setCameraOpen(true)
                }
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
              <p className="mt-8 max-w-xs text-xs leading-5 text-ink-faint">
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
        {cameraOpen && (
          <TargetCamera
            copy={cameraCopy}
            busy={preparing}
            onCapture={onCameraCapture}
            onClose={closeCamera}
            onPickPhoto={(file) => void onPickPhoto(file)}
            onPickFile={(file) => void onPickFile(file)}
          />
        )}

        {/*
          An imported photograph, at the same target-selection step the
          camera's own preview offers. Same component, same gestures, same
          normalised rectangle out of the other end.
        */}
        {pendingImage && (
          <TargetImageViewer
            /*
             * Keyed on the page so turning one remounts the viewer, which
             * clears the target and the candidates. A rectangle chosen on
             * page two means nothing on page three.
             */
            key={pendingImage.page ?? "photo"}
            src={pendingImage.src}
            copy={viewerCopy}
            busy={preparing}
            pages={
              pendingImage.page && pendingImage.pageCount
                ? {
                    page: pendingImage.page,
                    pageCount: pendingImage.pageCount,
                    onPageChange: (page) =>
                      void showPage(page, pendingImage.fileName),
                  }
                : null
            }
            onConfirm={(target) =>
              void prepare(
                pendingImage.raster,
                target,
                pendingImage.page ? "file" : "photo",
                pendingImage.fileName,
                pendingImage.page,
              )
            }
            onClose={discardPendingImage}
          />
        )}

        {!fullScreen && imageData && (
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
              <p className="mt-2 truncate px-2 text-center text-[0.6875rem] text-ink-faint">
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

            {/*
              Suppressed when the search is answering, because it is the same
              word again: this screen's card, underneath the sheet's card, one
              tap from being seen. Two cards for one word is two chances to
              wonder which is the real answer.
            */}
            {result && !fromLexicon && (
              <div className="flex flex-1 flex-col pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                    {capture.result.eyebrow}
                  </span>

                  <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[0.625rem] font-medium text-ink-soft">
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

                {/*
                  Pair order already: the identification answers in the
                  learner's own two languages, learning first.
                */}
                <div className="mt-2 flex items-start gap-3">
                  <h2 className="min-w-0 flex-1 break-words text-[1.5rem] font-semibold tracking-[-0.03em]">
                    {result.term}
                  </h2>
                  <VocabularyCopyButton
                    text={result.term}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white transition active:scale-90"
                  />
                </div>
                <p className="mt-0.5 break-words text-base font-normal text-ink-faint">
                  {result.translation}
                </p>
                <p className="mt-1 text-xs text-ink-faint">
                  {
                    t.vocabulary.detail.partOfSpeech[
                      normalizePartOfSpeech(result.partOfSpeech)
                    ]
                  }
                </p>

                <div className="mt-2.5 space-y-1.5">
                  {(() => {
                    /*
                     * Two boxes, each labelled with the language it is in and
                     * spoken by that language's own voice.
                     *
                     * This was a hard-coded pair of boxes headed "English" and
                     * "中文", reading their contents with an en-US and a zh-TW
                     * voice. Photograph a lamp while studying Italian and the
                     * card said the Italian word was English and pronounced it
                     * like one. Both halves now come off the result's own
                     * languages, which the model reports.
                     */
                    const valueClass = (primary: boolean) =>
                      primary
                        ? "mt-0.5 block break-words text-[1rem] font-semibold text-black"
                        : "mt-0.5 block break-words text-[0.875rem] font-normal text-ink-soft";

                    const buttonClass = (primary: boolean) =>
                      primary
                        ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white shadow-sm transition active:scale-90"
                        : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink-soft shadow-sm transition active:scale-90";

                    const languageBox = (
                      text: string,
                      language: LanguageCode,
                      reading: string | null | undefined,
                      primary: boolean,
                    ) => (
                      <div
                        key={language}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-2.5 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                            {getLanguage(language).endonym}
                          </span>
                          <span className={valueClass(primary)}>{text}</span>
                          {reading && (
                            <span className="mt-0.5 block text-[0.75rem] text-ink-faint">
                              {reading}
                            </span>
                          )}
                        </span>

                        {speechSupported && (
                          <button
                            type="button"
                            onClick={() => speak(text, language)}
                            aria-label={insertValues(
                              t.vocabulary.detail.listenAriaLabel,
                              { text },
                            )}
                            className={buttonClass(primary)}
                          >
                            <SpeakerIcon speaking={speakingLang === language} />
                          </button>
                        )}
                      </div>
                    );

                    /*
                     * Which reading belongs to which side is a question about
                     * the language, not about the field: IPA for the alphabets,
                     * pinyin and zhuyin for Chinese. Asked of the language table
                     * rather than assumed from the slot.
                     */
                    const readingFor = (language: LanguageCode) =>
                      getLanguage(language).phonetics.includes("pinyin")
                        ? [pronunciation?.pinyin, pronunciation?.zhuyin]
                            .filter(Boolean)
                            .join("  ") || null
                        : (pronunciation?.englishPronunciation ?? null);

                    // The learning language leads, as it does on every card.
                    return [
                      languageBox(
                        result.term,
                        termLanguage,
                        readingFor(termLanguage),
                        true,
                      ),
                      languageBox(
                        result.translation,
                        translationLanguage,
                        readingFor(translationLanguage),
                        false,
                      ),
                    ];
                  })()}
                </div>

                {(result.termExample || result.translationExample) && (
                  <div className="mt-2.5">
                    <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
                      {t.vocabulary.detail.example}
                    </p>

                    <div className="mt-1.5 space-y-1.5">
                      {(() => {
                        const exampleBox = (
                          text: string,
                          language: LanguageCode,
                          strong: boolean,
                        ) =>
                          text ? (
                            <div
                              key={`example-${language}`}
                              className="flex w-full items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-2.5 text-left"
                            >
                              <span
                                className={`min-w-0 break-words text-sm leading-6 ${
                                  strong ? "text-neutral-900" : "text-ink-soft"
                                }`}
                              >
                                {text}
                              </span>

                              {speechSupported && (
                                <button
                                  type="button"
                                  onClick={() => speak(text, language)}
                                  aria-label={insertValues(
                                    t.vocabulary.detail.listenAriaLabel,
                                    { text },
                                  )}
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink-soft shadow-sm transition active:scale-90"
                                >
                                  <SpeakerIcon
                                    speaking={speakingLang === language}
                                  />
                                </button>
                              )}
                            </div>
                          ) : null;

                        return [
                          exampleBox(result.termExample, termLanguage, true),
                          exampleBox(
                            result.translationExample,
                            translationLanguage,
                            false,
                          ),
                        ];
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

        {!fullScreen && !imageData && error && (
          <p
            role="alert"
            className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
          >
            {error}
          </p>
        )}

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
      <div className="flex items-center gap-2 text-sm text-ink-soft">
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
