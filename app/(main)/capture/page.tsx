"use client";

import Link from "next/link";
import {
  ChangeEvent,
  RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { dataUrlToBlob, safeImageExtension } from "@/lib/vocabulary";
import type { VocabularyCategory } from "@/lib/types/app";

type IdentificationResult = {
  englishName: string;
  chineseName: string;
  partOfSpeech: string;
  englishExample: string;
  chineseExample: string;
  confidence: "high" | "medium" | "low";
  category: VocabularyCategory;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

function DebugInfo({
  videoRef,
  streamRef,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  streamRef: RefObject<MediaStream | null>;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  const video = videoRef.current;
  const stream = streamRef.current;
  const track = stream?.getVideoTracks()[0];

  return (
    <span>
      tick:{tick} | videoWidth:{video?.videoWidth ?? "—"} | videoHeight:
      {video?.videoHeight ?? "—"} | readyState:{video?.readyState ?? "—"} |
      paused:{String(video?.paused)} | trackState:{track?.readyState ?? "—"} |
      trackMuted:{String(track?.muted)} | trackEnabled:
      {String(track?.enabled)} | trackLabel:{track?.label ?? "—"}
    </span>
  );
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
  const [imageData, setImageData] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);

  // Check camera support only on the client, after mount, to avoid
  // touching `navigator` during server rendering.
  useEffect(() => {
    setCameraSupported(Boolean(navigator.mediaDevices?.getUserMedia));
  }, []);

  // ---- Camera lifecycle -----------------------------------------------

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  }

  // Stop the camera on unmount so the browser releases the hardware.
  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function startCamera() {
    setError("");
    setResult(null);
    setImageData(null);

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
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);
    } catch (mediaError) {
      console.error("getUserMedia failed:", mediaError);

      const isDenied =
        mediaError instanceof DOMException &&
        (mediaError.name === "NotAllowedError" ||
          mediaError.name === "PermissionDeniedError");

      setError(
        isDenied
          ? "Camera permission was denied. Enable camera access in your browser settings, or choose an image instead."
          : "Camera access is unavailable. Try choosing an image instead."
      );
    } finally {
      setCameraStarting(false);
    }
  }

  // Attach the stream once the <video> element is actually mounted
  // (cameraActive === true), rather than guessing with a timeout.
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

  // ---- Image processing --------------------------------------------------

  function drawToDataUrl(
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number
  ): string | null {
    const canvas = canvasRef.current ?? document.createElement("canvas");

    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(sourceWidth, sourceHeight)
    );

    canvas.width = Math.round(sourceWidth * scale);
    canvas.height = Math.round(sourceHeight * scale);

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  }

  function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () =>
        reject(new Error("Could not read this image."));

      reader.onload = () => {
        if (typeof reader.result !== "string") {
          reject(new Error("Could not read this image."));
          return;
        }

        const image = new Image();

        image.onerror = () =>
          reject(new Error("Could not open this image."));

        image.onload = () => {
          const dataUrl = drawToDataUrl(
            image,
            image.width,
            image.height
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

  async function handleSelectedFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError("");
    setResult(null);

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
      setFileName(file.name);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not process this image."
      );
    }
  }

  function capturePhoto() {
    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("The camera is not ready yet.");
      return;
    }

    const dataUrl = drawToDataUrl(
      video,
      video.videoWidth,
      video.videoHeight
    );

    if (!dataUrl) {
      setError("Could not capture the image.");
      return;
    }

    setImageData(dataUrl);
    setFileName("camera-photo.jpg");
    setResult(null);
    stopCamera();
  }

  // ---- Identify / save --------------------------------------------------

  async function identifyImage() {
    if (!imageData || analyzing) return;

    setAnalyzing(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/identify-object", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });

      const data = (await response.json()) as
        | IdentificationResult
        | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error(
          "error" in data ? data.error : "Could not identify this image."
        );
      }

      setResult(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not identify this image."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function createShareText() {
    if (!result) return "";

    return `${result.englishName}
${result.chineseName}

${result.englishExample}
${result.chineseExample}`;
  }

  async function saveToVocabulary() {
    if (!result || !imageData || saving) return;

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

      if (uploadError) throw uploadError;

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
      router.push("/vocabulary");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save this word."
      );
    } finally {
      setSaving(false);
    }
  }

  function sendToPartner() {
    if (!result) return;

    sessionStorage.setItem(
      "exchange-notes-draft-message",
      createShareText()
    );

    router.push("/messages");
  }

  function reset() {
    stopCamera();
    setImageData(null);
    setFileName("");
    setResult(null);
    setError("");
    setSaved(false);
  }

  return (
    <main className="min-h-screen bg-[#f5f3ee] px-4 py-6 text-neutral-900">
      <div className="mx-auto max-w-xl">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-neutral-500">
            Cancel
          </Link>

          <h1 className="font-semibold">Discover</h1>

          <button
            type="button"
            onClick={reset}
            className="text-sm font-semibold text-neutral-500"
          >
            Reset
          </button>
        </header>

        {!cameraActive && !imageData && (
          <section className="mt-28 flex flex-col items-center text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
              English × 繁體中文
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight">
              Discover a word
            </h2>

            <div className="mt-16 flex items-center justify-center gap-16">
              <button
                type="button"
                onClick={startCamera}
                disabled={cameraStarting}
                aria-label="Open Camera"
                className="flex flex-col items-center gap-3 disabled:opacity-40"
              >
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-900 text-white transition-transform active:scale-95">
                  {cameraStarting ? (
                    <svg
                      className="h-7 w-7 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
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
                  ) : (
                    <svg
                      className="h-7 w-7"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 8.5A1.5 1.5 0 015.5 7h2l1-1.5h7L16.5 7h2A1.5 1.5 0 0120 8.5V17a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17V8.5z"
                      />
                      <circle cx="12" cy="12.5" r="3.2" />
                    </svg>
                  )}
                </span>
                <span className="text-xs font-semibold text-neutral-500">
                  Camera
                </span>
              </button>

              <button
                type="button"
                onClick={() => chooseImageInputRef.current?.click()}
                aria-label="Choose Image"
                className="flex flex-col items-center gap-3"
              >
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm transition-transform active:scale-95">
                  <svg
                    className="h-7 w-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
                    <circle cx="8.5" cy="9.5" r="1.5" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16l4.5-4.5a2 2 0 012.8 0L15 15l1-1a2 2 0 012.8 0L20 15.5"
                    />
                  </svg>
                </span>
                <span className="text-xs font-semibold text-neutral-500">
                  Choose Image
                </span>
              </button>
            </div>

            {!cameraSupported && (
              <p className="mt-10 max-w-xs text-xs text-neutral-400">
                Camera access isn&apos;t supported in this browser — tap
                Camera to take a photo instead.
              </p>
            )}
          </section>
        )}

        {cameraActive && !imageData && (
          <section className="mt-6">
            <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-black">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                webkit-playsinline="true"
                className="h-full w-full object-cover"
              />

              {/* TEMP DEBUG — remove after diagnosing */}
              <div className="absolute inset-x-0 top-0 z-10 bg-black/70 p-2 text-[10px] leading-tight text-lime-400">
                <DebugInfo videoRef={videoRef} streamRef={streamRef} />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-8">
              <button
                type="button"
                onClick={stopCamera}
                className="text-sm font-semibold text-neutral-500"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={capturePhoto}
                aria-label="Capture photo"
                className="h-20 w-20 rounded-full border-[6px] border-white bg-neutral-900 shadow-md"
              />
            </div>
          </section>
        )}

        {imageData && (
          <section className="mt-6">
            <div className="overflow-hidden rounded-3xl bg-neutral-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageData}
                alt="Selected object"
                className="max-h-[52vh] w-full object-contain"
              />
            </div>

            {fileName && (
              <p className="mt-3 truncate text-center text-xs text-neutral-400">
                {fileName}
              </p>
            )}

            {!result && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-2xl bg-white px-4 py-4 font-semibold shadow-sm"
                >
                  Choose another
                </button>

                <button
                  type="button"
                  onClick={identifyImage}
                  disabled={analyzing}
                  className="rounded-2xl bg-neutral-900 px-4 py-4 font-semibold text-white disabled:opacity-40"
                >
                  {analyzing ? "Identifying..." : "Identify"}
                </button>
              </div>
            )}
          </section>
        )}

        {error && (
          <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}

        {result && (
          <section className="mt-5 rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
                Identified
              </span>

              <span className="text-xs text-neutral-400">
                {result.confidence}
              </span>
            </div>

            <h2 className="mt-4 text-4xl font-bold tracking-tight">
              {result.englishName}
            </h2>

            <p className="mt-2 text-2xl">{result.chineseName}</p>

            <p className="mt-2 text-sm text-neutral-400">
              {result.partOfSpeech}
            </p>

            <div className="mt-6 border-t border-neutral-100 pt-5">
              <p className="leading-7">{result.englishExample}</p>

              <p className="mt-2 leading-7 text-neutral-500">
                {result.chineseExample}
              </p>
            </div>

            <div className="mt-7 space-y-3">
              <button
                type="button"
                onClick={saveToVocabulary}
                disabled={saving || saved}
                className="w-full rounded-2xl bg-neutral-900 px-5 py-4 font-semibold text-white"
              >
                {saving ? "Saving..." : saved ? "Saved" : "Save to Vocabulary"}
              </button>

              <button
                type="button"
                onClick={sendToPartner}
                className="w-full rounded-2xl bg-[#f1eee7] px-5 py-4 font-semibold"
              >
                Send to Partner
              </button>
            </div>
          </section>
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
