"use client";

import type { CSSProperties } from "react";

import { ACTIVE_LAUNCH } from "@/components/launch/activeLaunch";
import SplashGate from "@/components/ui/SplashGate";

const controlStyle: CSSProperties = {
  display: "inline-flex",
  minHeight: 48,
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 20px",
  border: "1px solid #b8d3e6",
  borderRadius: 14,
  background: "#ffffff",
  color: "#123b56",
  fontSize: 15,
  fontWeight: 600,
  textDecoration: "none",
  cursor: "pointer",
};

/** Isolated, guarded harness for actual document-load and keyboard checks. */
export default function LaunchSessionReview() {
  function resetAndReplay() {
    try {
      window.sessionStorage.removeItem(
        `exchange-notes:launch:${ACTIVE_LAUNCH.id}`,
      );
    } catch {
      // The real gate also falls back to playing when storage is unavailable.
    }
    window.location.reload();
  }

  return (
    <>
      <SplashGate />
      <main
        data-app-viewport
        style={{
          position: "relative",
          display: "grid",
          minHeight: "100svh",
          placeItems: "center",
          padding: 24,
          background: "linear-gradient(145deg, #f7fbff, #e7f2fa)",
          color: "#123448",
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: 540,
            padding: "clamp(24px, 6vw, 44px)",
            border: "1px solid #ffffff",
            borderRadius: 28,
            background: "rgba(255, 255, 255, 0.8)",
            boxShadow: "0 24px 72px rgba(57, 110, 144, 0.09)",
          }}
        >
          <p
            style={{
              color: "#4c7088",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.12em",
            }}
          >
            REVIEW ONLY · 開場工作階段檢查
          </p>
          <h1 style={{ marginTop: 14, fontSize: 32, fontWeight: 600 }}>
            主畫面已就緒
          </h1>
          <p style={{ marginTop: 16, color: "#4c6576", lineHeight: 1.8 }}>
            開場播放時，下方操作會暫停接收鍵盤焦點。完成後，在同一分頁重新載入應直接顯示這個畫面。
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 28,
            }}
          >
            {/* A real document load is the behavior under review here. */}
            <a href="/launch-review/session" style={controlStyle}>
              重新載入頁面
            </a>
            <button
              type="button"
              onClick={resetAndReplay}
              style={{
                ...controlStyle,
                background: "#163e59",
                borderColor: "#163e59",
                color: "#ffffff",
              }}
            >
              重設本版開場並重播
            </button>
          </div>
          <p style={{ marginTop: 20, color: "#57758a", fontSize: 12 }}>
            僅供開發與預覽驗證 · {ACTIVE_LAUNCH.id}
          </p>
        </section>
      </main>
    </>
  );
}
