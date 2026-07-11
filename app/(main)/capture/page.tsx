"use client";

import Link from "next/link";
import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type IdentificationResult = {
  englishName: string;
  chineseName: string;
  partOfSpeech: string;
  englishExample: string;
  chineseExample: string;
  confidence: "high" | "medium" | "low";
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function CameraPage() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const takePhotoInputRef =
    useRef<HTMLInputElement | null>(null);

  const chooseImageInputRef =
    useRef<HTMLInputElement | null>(null);

  const [cameraActive, setCameraActive] =
    useState(false);

  const [imageData, setImageData] =
    useState<string | null>(null);

  const [fileName, setFileName] = useState("");

  const [result, setResult] =
    useState<IdentificationResult | null>(null);

  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  function stopCamera() {
    streamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    streamRef.current = null;
    setCameraActive(false);
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function startCamera() {
    setError("");
    setResult(null);
    setImageData(null);

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: "environment",
            },
          },
          audio: false,
        });

      streamRef.current = stream;
      setCameraActive(true);

      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      }, 0);
    } catch {
      setError(
        "Camera access is unavailable. Try Take Photo or Choose Image instead."
      );
    }
  }

  function compressImage(
    file: File
  ): Promise<string> {
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
          const maxDimension = 1600;
          const scale = Math.min(
            1,
            maxDimension /
              Math.max(image.width, image.height)
          );

          const width = Math.round(image.width * scale);
          const height = Math.round(image.height * scale);

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const context = canvas.getContext("2d");

          if (!context) {
            reject(
              new Error("Could not process this image.")
            );
            return;
          }

          context.drawImage(
            image,
            0,
            0,
            width,
            height
          );

          resolve(
            canvas.toDataURL("image/jpeg", 0.82)
          );
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

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(
        "Please choose an image smaller than 10 MB."
      );
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
    const canvas = canvasRef.current;

    if (
      !video ||
      !canvas ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      setError("The camera is not ready yet.");
      return;
    }

    const maxDimension = 1600;
    const scale = Math.min(
      1,
      maxDimension /
        Math.max(video.videoWidth, video.videoHeight)
    );

    canvas.width = Math.round(
      video.videoWidth * scale
    );

    canvas.height = Math.round(
      video.videoHeight * scale
    );

    const context = canvas.getContext("2d");

    if (!context) {
      setError("Could not capture the image.");
      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    setImageData(
      canvas.toDataURL("image/jpeg", 0.82)
    );

    setFileName("camera-photo.jpg");
    setResult(null);
    stopCamera();
  }

  async function identifyImage() {
    if (!imageData || analyzing) return;

    setAnalyzing(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        "/api/identify-object",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: imageData,
          }),
        }
      );

      const data = (await response.json()) as
        | IdentificationResult
        | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error(
          "error" in data
            ? data.error
            : "Could not identify this image."
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

  function saveToNotes() {
    if (!result) return;

    const storageKey = "exchange-notes";
    const saved = localStorage.getItem(storageKey);

    let currentNotes: unknown[] = [];

    try {
      currentNotes = saved
        ? (JSON.parse(saved) as unknown[])
        : [];
    } catch {
      currentNotes = [];
    }

    const newNote = {
      id: Date.now(),
      language: "english",
      text: createShareText(),
      time: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
      replies: 0,
    };

    localStorage.setItem(
      storageKey,
      JSON.stringify([newNote, ...currentNotes])
    );

    router.push("/");
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
  }

  return (
      <main className="min-h-screen bg-[#f5f3ee] px-4 py-6 text-neutral-900">
        <div className="mx-auto max-w-xl">
          <header className="flex items-center justify-between">
            <Link
              href="/"
              className="text-sm font-semibold text-neutral-500"
            >
              Cancel
            </Link>

            <h1 className="font-semibold">
              Discover
            </h1>

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
                Photograph an object or choose an image
                to learn its name in English and
                Traditional Chinese.
              </p>

              <div className="mt-10 space-y-3">
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full rounded-2xl bg-neutral-900 px-5 py-4 font-semibold text-white"
                >
                  Open Camera
                </button>

                <button
                  type="button"
                  onClick={() =>
                    takePhotoInputRef.current?.click()
                  }
                  className="w-full rounded-2xl bg-white px-5 py-4 font-semibold shadow-sm"
                >
                  Take Photo
                </button>

                <button
                  type="button"
                  onClick={() =>
                    chooseImageInputRef.current?.click()
                  }
                  className="w-full rounded-2xl bg-white px-5 py-4 font-semibold shadow-sm"
                >
                  Choose Image
                </button>
              </div>
            </section>
          )}

          {cameraActive && !imageData && (
            <section className="mt-6">
              <div className="aspect-[3/4] overflow-hidden rounded-3xl bg-black">
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
                    {analyzing
                      ? "Identifying..."
                      : "Identify"}
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

              <p className="mt-2 text-2xl">
                {result.chineseName}
              </p>

              <p className="mt-2 text-sm text-neutral-400">
                {result.partOfSpeech}
              </p>

              <div className="mt-6 border-t border-neutral-100 pt-5">
                <p className="leading-7">
                  {result.englishExample}
                </p>

                <p className="mt-2 leading-7 text-neutral-500">
                  {result.chineseExample}
                </p>
              </div>

              <div className="mt-7 space-y-3">
                <button
                  type="button"
                  onClick={saveToNotes}
                  className="w-full rounded-2xl bg-neutral-900 px-5 py-4 font-semibold text-white"
                >
                  Save to Notes
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

          <canvas
            ref={canvasRef}
            className="hidden"
          />

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
