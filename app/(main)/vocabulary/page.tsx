"use client";

import Link from "next/link";
import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

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

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

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
      setError(
        "This browser does not support camera access. Try Take Photo or Choose Image instead."
      );
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
          ? "Camera permission was denied. Enable camera access in your browser settings, or try Take Photo or Choose Image instead."
          : "Camera access is unavailable. Try Take Photo or Choose Image instead."
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
        setError(
          "Could not start the camera preview. Try Take Photo instead."
        );
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
          <section className="mt-24 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
              English × 繁體中文
            </p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight">
              Discover a word
            </h2>

            <p className="mx-auto mt-4 max-w-sm leading-7 text-neutral-500">
              Photograph an object or choose an image to learn its name in
              English and Traditional Chinese.
            </p>

            <div className="mt-10 space-y-3">
              <button
                type="button"
                onClick={startCamera}
                disabled={cameraStarting}
                className="w-full rounded-2xl bg-neutral-900 px-5 py-4 font-semibold text-white disabled:opacity-40"
              >
                {cameraStarting ? "Starting Camera..." : "Open Camera"}
              </button>

              <button
                type="button"
                onClick={() => takePhotoInputRef.current?.click()}
                className="w-full rounded-2xl bg-white px-5 py-4 font-semibold shadow-sm"
              >
                Take Photo
              </button>

              <button
                type="button"
                onClick={() => chooseImageInputRef.current?.click()}
                className="w-full rounded-2xl bg-white px-5 py-4 font-semibold shadow-sm"
              >
                Choose Image
              </button>
            </div>
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
                className="h-full w-full object-cover"
              />
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
