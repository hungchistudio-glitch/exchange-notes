"use client";

import {
  useCallback,
  useLayoutEffect,
  useState,
} from "react";

import AppSplash from "./AppSplash";

const SESSION_KEY = "exchange-notes:splash-seen-v2";

export default function SplashGate() {
  const [showSplash, setShowSplash] = useState(true);

  useLayoutEffect(() => {
    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === "1") {
        setShowSplash(false);
      }
    } catch {
      // 某些隱私模式可能停用 sessionStorage。
    }
  }, []);

  const handleComplete = useCallback(() => {
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // 即使無法儲存狀態，也必須關閉 Splash。
    }

    setShowSplash(false);
  }, []);

  if (!showSplash) return null;

  return <AppSplash onComplete={handleComplete} />;
}
