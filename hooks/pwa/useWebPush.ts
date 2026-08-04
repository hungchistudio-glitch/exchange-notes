"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  disableWebPush,
  enableWebPush,
  getWebPushStatus,
  type DisableWebPushResult,
  type EnableWebPushResult,
  type WebPushFailureCode,
  type WebPushStatus,
} from "@/lib/push/client";

export type WebPushAction =
  | "idle"
  | "enabling"
  | "disabling";

export type WebPushHookError = {
  code: WebPushFailureCode | "status-failed";
  message: string;
};

export type UseWebPushResult = {
  status: WebPushStatus | null;
  loading: boolean;
  action: WebPushAction;
  error: WebPushHookError | null;
  isAvailable: boolean;
  isSubscribed: boolean;
  isEnabling: boolean;
  isDisabling: boolean;
  refresh: () => Promise<WebPushStatus | null>;
  enable: (
    deviceName?: string | null
  ) => Promise<EnableWebPushResult>;
  disable: () => Promise<DisableWebPushResult>;
  clearError: () => void;
};

const ACTION_IN_PROGRESS_MESSAGE =
  "A notification setting change is already in progress.";

export default function useWebPush(): UseWebPushResult {
  const [status, setStatus] =
    useState<WebPushStatus | null>(null);

  const [loading, setLoading] = useState(true);

  const [action, setAction] =
    useState<WebPushAction>("idle");

  const [error, setError] =
    useState<WebPushHookError | null>(null);

  const mountedRef = useRef(false);
  const actionInProgressRef = useRef(false);
  const statusRequestIdRef = useRef(0);

  const applyStatus = useCallback(
    (
      nextStatus: WebPushStatus,
      requestId?: number
    ) => {
      if (!mountedRef.current) {
        return;
      }

      if (
        requestId !== undefined &&
        requestId !== statusRequestIdRef.current
      ) {
        return;
      }

      setStatus(nextStatus);
      setLoading(false);
    },
    []
  );

  const refresh = useCallback(async () => {
    const requestId =
      statusRequestIdRef.current + 1;

    statusRequestIdRef.current = requestId;

    if (mountedRef.current) {
      setLoading(true);
    }

    try {
      const nextStatus = await getWebPushStatus();

      applyStatus(nextStatus, requestId);

      return nextStatus;
    } catch (statusError) {
      if (
        mountedRef.current &&
        requestId === statusRequestIdRef.current
      ) {
        setLoading(false);
        setError({
          code: "status-failed",
          message:
            statusError instanceof Error &&
            statusError.message
              ? statusError.message
              : "Notification status could not be checked.",
        });
      }

      return null;
    }
  }, [applyStatus]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const enable = useCallback(
    async (
      deviceName?: string | null
    ): Promise<EnableWebPushResult> => {
      if (actionInProgressRef.current) {
        return {
          ok: false,
          code: "subscription-failed",
          message: ACTION_IN_PROGRESS_MESSAGE,
        };
      }

      actionInProgressRef.current = true;

      if (mountedRef.current) {
        setAction("enabling");
        setError(null);
      }

      try {
        const result = await enableWebPush(deviceName);

        if (!result.ok) {
          if (mountedRef.current) {
            setError({
              code: result.code,
              message: result.message,
            });
          }

          return result;
        }

        const nextStatus = await getWebPushStatus();

        applyStatus(nextStatus);

        return result;
      } finally {
        actionInProgressRef.current = false;

        if (mountedRef.current) {
          setAction("idle");
        }
      }
    },
    [applyStatus]
  );

  const disable = useCallback(
    async (): Promise<DisableWebPushResult> => {
      if (actionInProgressRef.current) {
        return {
          ok: false,
          code: "unsubscribe-failed",
          message: ACTION_IN_PROGRESS_MESSAGE,
        };
      }

      actionInProgressRef.current = true;

      if (mountedRef.current) {
        setAction("disabling");
        setError(null);
      }

      try {
        const result = await disableWebPush();

        if (!result.ok) {
          if (mountedRef.current) {
            setError({
              code: result.code,
              message: result.message,
            });
          }

          return result;
        }

        const nextStatus = await getWebPushStatus();

        applyStatus(nextStatus);

        return result;
      } finally {
        actionInProgressRef.current = false;

        if (mountedRef.current) {
          setAction("idle");
        }
      }
    },
    [applyStatus]
  );

  useEffect(() => {
    mountedRef.current = true;

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    function refreshWhenFocused() {
      void refresh();
    }

    function refreshAfterControllerChange() {
      void refresh();
    }

    queueMicrotask(() => {
      void refresh();
    });

    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible
    );

    window.addEventListener(
      "focus",
      refreshWhenFocused
    );

    window.addEventListener(
      "pageshow",
      refreshWhenFocused
    );

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        refreshAfterControllerChange
      );
    }

    return () => {
      mountedRef.current = false;
      statusRequestIdRef.current += 1;

      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible
      );

      window.removeEventListener(
        "focus",
        refreshWhenFocused
      );

      window.removeEventListener(
        "pageshow",
        refreshWhenFocused
      );

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          refreshAfterControllerChange
        );
      }
    };
  }, [refresh]);

  return {
    status,
    loading,
    action,
    error,
    isAvailable: status?.available === true,
    isSubscribed: status?.subscribed === true,
    isEnabling: action === "enabling",
    isDisabling: action === "disabling",
    refresh,
    enable,
    disable,
    clearError,
  };
}
