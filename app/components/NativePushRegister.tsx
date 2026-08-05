"use client";

import { useEffect } from "react";

import {
  registerNativePushToken,
  setCurrentNativePushToken,
  type NativePushTokenPayload,
} from "@/lib/push/nativeClient";
import { createClient } from "@/lib/supabase/client";

type NativeMessageHandler = {
  postMessage: (
    message: Record<string, unknown>,
  ) => void;
};

type NativeBridgeWindow = Window & {
  webkit?: {
    messageHandlers?: {
      nativePushControl?: NativeMessageHandler;
    };
  };
};

function isNativePushPayload(
  value: unknown,
): value is NativePushTokenPayload {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const record =
    value as Record<string, unknown>;

  return (
    typeof record.token === "string" &&
    /^[0-9a-f]+$/i.test(record.token) &&
    typeof record.environment === "string" &&
    (
      record.environment === "development" ||
      record.environment === "production"
    ) &&
    record.bundleId ===
      "art.hungchi.exchangenotes"
  );
}

export default function NativePushRegister() {
  useEffect(() => {
    const supabase = createClient();

    let active = true;
    let authenticated = false;
    let requestPending = false;
    let resetTimer: number | null = null;

    function requestNativeRegistration() {
      if (
        !active ||
        !authenticated ||
        requestPending
      ) {
        return;
      }

      const nativeWindow =
        window as NativeBridgeWindow;

      const handler =
        nativeWindow.webkit
          ?.messageHandlers
          ?.nativePushControl;

      if (!handler) {
        return;
      }

      requestPending = true;

      handler.postMessage({
        action: "requestAuthorization",
      });

      resetTimer = window.setTimeout(
        () => {
          requestPending = false;
        },
        5_000,
      );
    }

    function handleNativeReady() {
      requestNativeRegistration();
    }

    function handleNativeToken(
      event: Event,
    ) {
      const payload =
        (
          event as CustomEvent<unknown>
        ).detail;

      if (!isNativePushPayload(payload)) {
        console.warn(
          "Native Push emitted an invalid token payload.",
        );
        return;
      }

      requestPending = false;

      if (resetTimer !== null) {
        window.clearTimeout(resetTimer);
        resetTimer = null;
      }

      setCurrentNativePushToken(payload);

      void registerNativePushToken(payload)
        .catch(() => {
          console.warn(
            "Native Push token registration failed.",
          );
        });
    }

    window.addEventListener(
      "exchange-notes-native-ready",
      handleNativeReady,
    );

    window.addEventListener(
      "exchange-notes-native-push-token",
      handleNativeToken,
    );

    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!active || error) {
          return;
        }

        authenticated = Boolean(data.user);

        if (authenticated) {
          requestNativeRegistration();
        }
      });

    const {
      data: {
        subscription,
      },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        authenticated = Boolean(
          session?.user,
        );

        if (authenticated) {
          requestNativeRegistration();
        }
      },
    );

    return () => {
      active = false;

      subscription.unsubscribe();

      window.removeEventListener(
        "exchange-notes-native-ready",
        handleNativeReady,
      );

      window.removeEventListener(
        "exchange-notes-native-push-token",
        handleNativeToken,
      );

      if (resetTimer !== null) {
        window.clearTimeout(resetTimer);
      }
    };
  }, []);

  return null;
}
