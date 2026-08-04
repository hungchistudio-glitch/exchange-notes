"use client";

import {
  Bell,
  BellOff,
  LoaderCircle,
  Smartphone,
} from "lucide-react";
import { useState } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import SettingsRow, {
  type SettingsRowTone,
} from "@/components/foundation/rows/SettingsRow";
import useTranslation from "@/hooks/i18n/useTranslation";
import useWebPush from "@/hooks/pwa/useWebPush";

type DisplayState =
  | "loading"
  | "subscribed"
  | "unsubscribed"
  | "needs-home-screen"
  | "unsupported"
  | "blocked"
  | "unavailable";

export default function WebPushSettingsButton() {
  const { t } = useTranslation();
  const copy = t.settings.webPush;

  const [open, setOpen] = useState(false);

  const {
    status,
    loading,
    error,
    isSubscribed,
    isEnabling,
    isDisabling,
    enable,
    disable,
    clearError,
  } = useWebPush();

  const busy = isEnabling || isDisabling;

  const displayState: DisplayState = loading
    ? "loading"
    : !status
      ? "unavailable"
      : isSubscribed
        ? "subscribed"
        : status.permission === "denied"
          ? "blocked"
          : status.code === "needs-home-screen"
            ? "needs-home-screen"
            : status.code === "unsupported"
              ? "unsupported"
              : status.code === "misconfigured" ||
                  status.code === "server-rendering"
                ? "unavailable"
                : "unsubscribed";

  const stateContent = (() => {
    switch (displayState) {
      case "subscribed":
        return {
          title: copy.enabledTitle,
          description: copy.enabledDescription,
        };

      case "unsubscribed":
        return {
          title: copy.disabledTitle,
          description: copy.disabledDescription,
        };

      case "needs-home-screen":
        return {
          title: copy.needsHomeScreenTitle,
          description: copy.needsHomeScreenDescription,
        };

      case "unsupported":
        return {
          title: copy.unsupportedTitle,
          description: copy.unsupportedDescription,
        };

      case "blocked":
        return {
          title: copy.blockedTitle,
          description: copy.blockedDescription,
        };

      case "unavailable":
        return {
          title: copy.unavailableTitle,
          description: copy.unavailableDescription,
        };

      default:
        return {
          title: copy.statusLoading,
          description: copy.sheetDescription,
        };
    }
  })();

  const rowValue = isEnabling
    ? copy.enabling
    : isDisabling
      ? copy.disabling
      : displayState === "subscribed"
        ? copy.statusOn
        : displayState === "unsubscribed"
          ? copy.statusOff
          : displayState === "needs-home-screen"
            ? copy.statusNeedsHomeScreen
            : displayState === "unsupported"
              ? copy.statusUnsupported
              : displayState === "blocked"
                ? copy.statusBlocked
                : displayState === "unavailable"
                  ? copy.statusUnavailable
                  : copy.statusLoading;

  const rowTone: SettingsRowTone =
    displayState === "subscribed"
      ? "emerald"
      : displayState === "blocked"
        ? "red"
        : displayState === "needs-home-screen"
          ? "amber"
          : displayState === "unsubscribed"
            ? "blue"
            : "neutral";

  const statusCardClassName =
    displayState === "subscribed"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : displayState === "blocked"
        ? "border-red-200 bg-red-50 text-red-950"
        : displayState === "needs-home-screen"
          ? "border-amber-200 bg-amber-50 text-amber-950"
          : "border-black/[0.07] bg-black/[0.03] text-black";

  const localizedError = (() => {
    if (!error) {
      return "";
    }

    switch (error.code) {
      case "needs-home-screen":
        return copy.needsHomeScreenDescription;

      case "unsupported":
        return copy.unsupportedDescription;

      case "misconfigured":
        return copy.unavailableDescription;

      case "permission-denied":
        return copy.blockedDescription;

      case "permission-dismissed":
        return copy.permissionDismissedError;

      case "authentication-required":
        return copy.authenticationError;

      case "unsubscribe-failed":
        return copy.unsubscribeError;

      case "status-failed":
        return copy.statusError;

      case "subscription-failed":
      case "server-error":
      default:
        return copy.subscriptionError;
    }
  })();

  function renderStateIcon(size: number) {
    if (loading || busy) {
      return (
        <LoaderCircle
          aria-hidden="true"
          size={size}
          className="animate-spin"
        />
      );
    }

    if (displayState === "subscribed") {
      return (
        <Bell
          aria-hidden="true"
          size={size}
          strokeWidth={2}
        />
      );
    }

    if (displayState === "needs-home-screen") {
      return (
        <Smartphone
          aria-hidden="true"
          size={size}
          strokeWidth={1.8}
        />
      );
    }

    return (
      <BellOff
        aria-hidden="true"
        size={size}
        strokeWidth={1.8}
      />
    );
  }

  function handleOpen() {
    clearError();
    setOpen(true);
  }

  function handleClose() {
    clearError();
    setOpen(false);
  }

  const canEnable = displayState === "unsubscribed";
  const canDisable = displayState === "subscribed";
  const showAction = loading || canEnable || canDisable;

  const actionLabel = loading
    ? copy.statusLoading
    : isEnabling
      ? copy.enabling
      : isDisabling
        ? copy.disabling
        : canDisable
          ? copy.disable
          : copy.enable;

  return (
    <>
      <SettingsRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        value={rowValue}
        tone={rowTone}
        icon={renderStateIcon(17)}
        disabled={busy}
        onClick={handleOpen}
      />

      <BottomSheet
        open={open}
        onClose={handleClose}
        title={copy.sheetTitle}
        description={copy.sheetDescription}
        footer={
          showAction ? (
            <button
              type="button"
              disabled={loading || busy}
              aria-busy={busy}
              onClick={() => {
                if (canDisable) {
                  void disable();
                  return;
                }

                if (canEnable) {
                  void enable();
                }
              }}
              className={[
                "flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-all active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45",
                canDisable
                  ? "bg-black/[0.06] text-black"
                  : "bg-black text-white",
              ].join(" ")}
            >
              {loading || busy ? (
                <LoaderCircle
                  aria-hidden="true"
                  size={16}
                  className="animate-spin"
                />
              ) : canDisable ? (
                <BellOff
                  aria-hidden="true"
                  size={16}
                  strokeWidth={1.9}
                />
              ) : (
                <Bell
                  aria-hidden="true"
                  size={16}
                  strokeWidth={1.9}
                />
              )}

              {actionLabel}
            </button>
          ) : undefined
        }
      >
        <div className="space-y-3">
          {localizedError ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
            >
              {localizedError}
            </div>
          ) : null}

          <div
            aria-live="polite"
            className={[
              "flex items-start gap-3 rounded-2xl border px-4 py-4",
              statusCardClassName,
            ].join(" ")}
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 shadow-sm">
              {renderStateIcon(18)}
            </span>

            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold tracking-[-0.02em]">
                {stateContent.title}
              </h3>

              <p className="mt-1 text-xs leading-5 opacity-65">
                {stateContent.description}
              </p>
            </div>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
