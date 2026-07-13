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

function SpeakerIcon({ speaking }: { speaking: boolean }) {
  return (
    <svg
      className={speaking ? "h-3.5 w-3.5 animate-pulse" : "h-3.5 w-3.5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speakingLang, setSpeakingLang] = useState<"en" | "zh" | null>(null);

  useEffect(() => {
    setCameraSupported(Boolean(navigator.mediaDevices?.getUserMedia));
    setSpeechSupported(
      typeof window !== "undefined" && "speechSynthesis" in window
    );
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [result]);

  // 相機全螢幕時，鎖住背景頁面捲動，避免 iOS Safari 的地址列跳動影響版面
  useEffect(() => {
    if (cameraActive) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [cameraActive]);

  function speak(text: string, lang: "en" | "zh") {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (!text.trim()) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "en" ? "en-US" : "zh-TW";
    utterance.rate = 0.95;

    utterance.onstart = () => setSpeakingLang(lang);
    utterance.onend = () => setSpeakingLang(null);
    utterance.onerror = () => setSpeakingLang(null);

    window.speechSynthesis.speak(utterance);
  }

  function speakEnglish() {
    if (!result) return;
    const text = [result.englishName, result.englishExample]
      .filter(Boolean)
      .join(". ");
    speak(text, "en");
  }

  function speakChinese() {
    if (!result) return;
    const text = [result.chineseName, result.chineseExample]
      .filter(Boolean)
      .join("。");
    speak(text, "zh");
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  }

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
          const dataUrl = drawToDataUrl(image, image.width, image.height);

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

    const dataUrl = drawToDataUrl(video, video.videoWidth, video.videoHeight);

    if (!dataUrl) {
      setError("Could not capture the image.");
      return;
    }

    setImageData(dataUrl);
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

    sessionStorage.setItem("exchange-notes-draft-message", createShareText());

    router.push("/messages");
  }

  function reset() {
    stopCamera();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setImageData(null);
    setFileName("");
    setResult(null);
    setError("");
    setSaved(false);
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#f5f3ee] px-4 text-neutral-900">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
        {/* 相機全螢幕時隱藏這個 header，因為全螢幕相機有自己的關閉按鈕 */}
        {!cameraActive && (
          <header className="flex h-11 shrink-0 items-center justify-between">
            <Link href="/" className="text-xs font-semibold text-neutral-500">
              Cancel
            </Link>

            <h1 className="text-sm font-semibold">Discover</h1>

            <button
              type="button"
              onClick={reset}
              className="text-xs font-semibold text-neutral-500"
            >
              Reset
            </button>
          </header>
        )}

        {!cameraActive && !imageData && (
          <section className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
              English × 繁體中文
            </p>

            <h2 className="mt-2 text-xl font-bold tracking-tight">
              Discover a word
            </h2>

            <div className="mt-8 flex items-center justify-center gap-10">
              <button
                type="button"
                onClick={startCamera}
                disabled={cameraStarting}
                aria-label="Open Camera"
                className="flex flex-col items-center gap-2 disabled:opacity-40"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white transition-transform active:scale-95">
                  {cameraStarting ? (
                    <svg
                      className="h-5 w-5 animate-spin"
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
                      className="h-5 w-5"
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
                <span className="text-[11px] font-semibold text-neutral-500">
                  Camera
                </span>
              </button>

              <button
                type="button"
                onClick={() => chooseImageInputRef.current?.click()}
                aria-label="Choose Image"
                className="flex flex-col items-center gap-2"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-neutral-200 bg-white transition-transform active:scale-95">
                  <svg
                    className="h-5 w-5"
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
                <span className="text-[11px] font-semibold text-neutral-500">
                  Choose Image
                </span>
              </button>
            </div>

            {!cameraSupported && (
              <p className="mt-6 max-w-xs text-[11px] text-neutral-400">
                Camera access isn&apos;t supported in this browser — tap
                Camera to take a photo instead.
              </p>
            )}
          </section>
        )}

        {/* ── 全螢幕相機浮層 ── */}
        {cameraActive && !imageData && (
          <section className="fixed inset-0 z-50 flex flex-col bg-black">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              webkit-playsinline="true"
              className="h-full w-full object-cover"
            />

            {/* 上方浮動關閉按鈕 */}
            <div
              className="absolute inset-x-0 top-0 flex items-center justify-between p-4"
              style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
            >
              <button
                type="button"
                onClick={stopCamera}
                aria-label="Close camera"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-transform active:scale-90"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* 下方浮動拍照按鈕，永遠貼齊畫面安全區域底部 */}
            <div
              className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-black/70 to-transparent pt-10"
              style={{
                paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
              }}
            >
              <button
                type="button"
                onClick={capturePhoto}
                aria-label="Capture photo"
                className="h-16 w-16 rounded-full border-[4px] border-white bg-white/10 shadow-lg transition-transform active:scale-95"
              />
            </div>
          </section>
        )}

        {imageData && (
          <section className="mt-4 flex flex-1 flex-col">
            <div className="overflow-hidden rounded-[20px] bg-neutral-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageData}
                alt="Selected object"
                className="max-h-[42vh] w-full object-contain"
              />
            </div>

            {fileName && !result && (
              <p className="mt-2 truncate text-center text-[11px] text-neutral-400">
                {fileName}
              </p>
            )}

            {!result && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className="h-11 rounded-[14px] border border-neutral-200 bg-white text-sm font-semibold transition-all duration-150 active:scale-[0.98]"
                >
                  Choose another
                </button>

                <button
                  type="button"
                  onClick={identifyImage}
                  disabled={analyzing}
                  className="h-11 rounded-[14px] bg-neutral-900 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98] disabled:opacity-40"
                >
                  {analyzing ? "Identifying..." : "Identify"}
                </button>
              </div>
            )}
          </section>
        )}

        {error && (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">
            {error}
          </p>
        )}

        {result && (
          <section className="mt-4 flex flex-1 flex-col">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                Identified
              </span>

              <span className="text-[10px] text-neutral-400">
                {result.confidence}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <h2 className="text-[30px] font-bold tracking-[-0.02em]">
                {result.englishName}
              </h2>

              {speechSupported && (
                <button
                  type="button"
                  onClick={speakEnglish}
                  aria-label="Play English pronunciation"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition-transform active:scale-90"
                >
                  <SpeakerIcon speaking={speakingLang === "en"} />
                </button>
              )}
            </div>

            <div className="mt-1 flex items-center gap-2">
              <p className="text-lg font-medium text-neutral-700">
                {result.chineseName}
              </p>

              {speechSupported && (
                <button
                  type="button"
                  onClick={speakChinese}
                  aria-label="播放中文發音"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition-transform active:scale-90"
                >
                  <SpeakerIcon speaking={speakingLang === "zh"} />
                </button>
              )}
            </div>

            <p className="mt-1 text-xs text-neutral-400">
              {result.partOfSpeech}
            </p>

            <div className="mt-4 border-t border-neutral-200 pt-4">
              <p className="line-clamp-2 text-sm leading-6">
                {result.englishExample}
              </p>

              <p className="mt-1 line-clamp-2 text-sm leading-6 text-neutral-500">
                {result.chineseExample}
              </p>
            </div>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={saveToVocabulary}
                disabled={saving || saved}
                className="h-11 w-full rounded-[14px] bg-neutral-900 text-sm font-semibold text-white transition-all duration-150 hover:bg-black active:scale-[0.98] disabled:opacity-40"
              >
                {saving ? "Saving..." : saved ? "Saved" : "Save to Vocabulary"}
              </button>

              <button
                type="button"
                onClick={sendToPartner}
                className="h-11 w-full rounded-[14px] border border-neutral-200 bg-white text-sm font-semibold transition-all duration-150 active:scale-[0.98]"
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