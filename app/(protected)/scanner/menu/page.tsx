"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import AppHeader from "@/components/foundation/layout/AppHeader";
import MenuCamera from "@/components/scanner/MenuCamera";
import MenuProcessing from "@/components/scanner/MenuProcessing";
import MenuResultViewer from "@/components/scanner/MenuResultViewer";
import useTranslation from "@/hooks/i18n/useTranslation";
import useInterfaceLanguage from "@/hooks/preferences/useInterfaceLanguage";
import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import { useScanSession, type ScanFailure } from "@/lib/scanner/scanSession";
import type { MenuAnalyzeResponse } from "@/lib/scanner/menuTypes";
import type { InterfaceLanguage } from "@/lib/appPreferences";

function failureFromResponse(
  response: MenuAnalyzeResponse | null,
  status: number,
): ScanFailure {
  const code = response?.code;

  if (code === "not_a_menu") return "not_a_menu";
  if (code === "no_items_found") return "no_items_found";
  if (code === "rate_limit") return "rate_limit";
  if (code === "daily_limit") return "daily_limit";
  if (code === "timeout") return "timeout";
  if (status === 503) return "unavailable";

  return "unknown";
}

/**
 * The Menu Translator, end to end.
 *
 * Camera, capture, read, translate, show — one screen holding one session, so
 * every stage is a view of the same state rather than five components each
 * with their own idea of where things are. The pipeline can end at any of
 * those stages, and each ending has somewhere to go from.
 */
export default function MenuTranslatorPage() {
  const { t } = useTranslation();
  const { isCosmic } = useInterfaceMode();
  const interfaceLanguage = useInterfaceLanguage();
  const router = useRouter();
  const copy = t.scanner.menu;

  const { session, dispatch } = useScanSession();

  const [targetLanguage, setTargetLanguage] =
    useState<InterfaceLanguage>(interfaceLanguage);

  useEffect(() => {
    if (!isCosmic) router.replace("/capture");
  }, [isCosmic, router]);

  // The camera is the screen. Nothing here waits for a tap to start it, so
  // pointing the phone at a menu is the only step before capturing one.
  useEffect(() => {
    if (session.state === "idle") dispatch({ type: "camera_ready" });
  }, [session.state, dispatch]);

  const analyze = useCallback(
    async (image: string) => {
      dispatch({ type: "analyze_started" });

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        dispatch({ type: "failed", failure: "offline", message: "" });
        return;
      }

      try {
        const response = await fetch("/api/scanner/menu/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({ image, targetLanguage }),
        });

        const body = (await response
          .json()
          .catch(() => null)) as MenuAnalyzeResponse | null;

        if (body?.document || body?.notMenu || body?.code === "no_items_found") {
          dispatch({ type: "analyzed", response: body });
          return;
        }

        dispatch({
          type: "failed",
          failure: failureFromResponse(body, response.status),
          message: body?.error ?? "",
        });
      } catch {
        dispatch({ type: "failed", failure: "unknown", message: "" });
      }
    },
    [dispatch, targetLanguage],
  );

  // Analysis starts from the state machine rather than from the capture
  // handler, so the one path into it also covers "continue anyway" after a
  // quality warning.
  useEffect(() => {
    if (session.state === "preprocessing" && session.image) {
      void analyze(session.image);
    }
  }, [session.state, session.image, analyze]);

  if (!isCosmic) return null;

  const showCamera =
    session.state === "camera_ready" ||
    session.state === "menu_detected" ||
    session.state === "cancelled";

  const showProcessing =
    session.state === "preprocessing" || session.state === "ocr_processing";

  const hasResult =
    session.state === "translation_ready" || session.state === "partial";

  if (showCamera) {
    return (
      <MenuCamera
        detected={session.state === "menu_detected"}
        targetLanguage={targetLanguage}
        onTargetLanguageChange={setTargetLanguage}
        onDetectionChange={(detected) =>
          dispatch({ type: "detection", detected })
        }
        onCaptured={(image, quality) =>
          dispatch({ type: "captured", image, quality })
        }
        onClose={() => router.push("/")}
      />
    );
  }

  if (session.state === "capturing" && session.image) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#000000]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={session.image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />

        <div className="relative mt-auto px-6 pb-10">
          <div className="rounded-[22px] bg-white px-5 py-5">
            <h2 className="text-[17px] font-bold tracking-[-0.02em] text-black">
              {copy.qualityTitle}
            </h2>

            <p className="mt-1.5 text-[14px] leading-[21px] text-ink-soft">
              {copy.qualityBody}
            </p>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => dispatch({ type: "camera_ready" })}
                className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-black text-sm font-semibold text-white transition-transform active:scale-[0.98]"
              >
                {copy.retake}
              </button>

              {/*
                Always offered, and never the quiet option. The warning is a
                heuristic about pixels; the person holding the phone can see
                the menu, and a scan they wanted refused is worse than a scan
                that comes back imperfect.
              */}
              <button
                type="button"
                onClick={() => dispatch({ type: "dismiss_quality" })}
                className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-black/[0.06] text-sm font-semibold text-black transition-transform active:scale-[0.98]"
              >
                {copy.continueAnyway}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showProcessing) {
    return (
      <MenuProcessing
        image={session.image}
        onCancel={() => dispatch({ type: "camera_ready" })}
      />
    );
  }

  const failureCopy = (() => {
    switch (session.failure) {
      case "not_a_menu":
        return { title: copy.notMenuTitle, body: copy.notMenuBody };
      case "no_items_found":
        return { title: copy.emptyTitle, body: copy.emptyBody };
      default:
        return {
          title: copy.errorTitle,
          body: session.errorMessage || copy.emptyBody,
        };
    }
  })();

  return (
    <main className="min-h-[100dvh] bg-surface text-black">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col pb-28">
        <AppHeader
          title={copy.title}
          backHref="/"
          backLabel={t.scanner.back}
        />

        <div className="flex-1 space-y-4 px-5 pt-5 sm:px-6">
          {hasResult && session.document && session.image ? (
            <MenuResultViewer
              image={session.image}
              document={session.document}
              partial={session.state === "partial"}
              onScanAnother={() => dispatch({ type: "camera_ready" })}
            />
          ) : (
            <div className="rounded-[18px] border border-black/[0.06] bg-white px-5 py-6">
              <h2 className="text-[17px] font-bold tracking-[-0.02em] text-black">
                {failureCopy.title}
              </h2>

              <p className="mt-1.5 text-[14px] leading-[21px] text-ink-soft">
                {failureCopy.body}
              </p>

              <button
                type="button"
                onClick={() => dispatch({ type: "camera_ready" })}
                className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white transition-transform active:scale-[0.985]"
              >
                {copy.tryAgain}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
