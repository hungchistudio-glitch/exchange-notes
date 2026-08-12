"use client";

import {
  useCallback,
  useState,
} from "react";

import ProductionSplashV62 from "@/components/launch-v62/ProductionSplashV62";
import { POST_LOGIN_SPLASH_COOKIE } from "@/lib/postLoginSplash";

type Props = {
  initialShow: boolean;
};

function clearPostLoginSplashCookie() {
  document.cookie =
    `${POST_LOGIN_SPLASH_COOKIE}=; ` +
    "Path=/; Max-Age=0; SameSite=Lax";
}

export default function SplashGate({
  initialShow,
}: Props) {
  const [show, setShow] =
    useState(initialShow);

  const complete = useCallback(() => {
    clearPostLoginSplashCookie();
    setShow(false);
  }, []);

  if (!show) return null;

  return (
    <ProductionSplashV62
      onComplete={complete}
    />
  );
}
