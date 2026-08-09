"use client";

import {
  Check,
  Copy,
  KeyRound,
  LoaderCircle,
  Plug,
  PlugZap,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { useEffect, useState } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import SettingsRow, {
  type SettingsRowTone,
} from "@/components/foundation/rows/SettingsRow";
import useTranslation from "@/hooks/i18n/useTranslation";

/*
 * The Scriptable widget authenticates with a bearer token that only this
 * screen can issue. /api/scriptable/token has had GET/POST/DELETE since the
 * widget shipped, and the copy for this sheet has been sitting in the
 * dictionary just as long, but nothing ever called either — so the widget
 * documented in scriptable/README.md ("Settings -> iPhone Widget and generate
 * a private token") could not actually be set up from the app.
 */
const TOKEN_ENDPOINT = "/api/scriptable/token";

type TokenStatus = {
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  active: boolean;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "active"; token: TokenStatus }
  | { kind: "revoked"; token: TokenStatus }
  | { kind: "unavailable"; authentication: boolean };

type Confirming = "rotate" | "revoke" | null;

type StatusPayload = {
  ok?: boolean;
  configured?: boolean;
  token?: unknown;
};

function readTokenStatus(value: unknown): TokenStatus | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.prefix !== "string"
    || typeof record.createdAt !== "string"
    || typeof record.active !== "boolean"
  ) {
    return null;
  }

  return {
    prefix: record.prefix,
    createdAt: record.createdAt,
    lastUsedAt:
      typeof record.lastUsedAt === "string"
        ? record.lastUsedAt
        : null,
    active: record.active,
  };
}

function stateFromStatus(payload: StatusPayload): LoadState {
  const token = readTokenStatus(payload.token);

  if (!payload.configured || !token) {
    return { kind: "empty" };
  }

  return token.active
    ? { kind: "active", token }
    : { kind: "revoked", token };
}

export default function ScriptableWidgetSettingsButton() {
  const { t, language } = useTranslation();
  const copy = t.settings.scriptableWidget;

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"issue" | "revoke" | null>(null);
  const [confirming, setConfirming] = useState<Confirming>(null);
  // Returned by POST and never retrievable again — the server keeps only a
  // SHA-256 hash — so it lives in component state until the sheet closes.
  const [issuedToken, setIssuedToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function loadStatus(): Promise<LoadState> {
    const response = await fetch(TOKEN_ENDPOINT, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    });

    if (response.status === 401) {
      return { kind: "unavailable", authentication: true };
    }

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok || typeof payload !== "object" || payload === null) {
      return { kind: "unavailable", authentication: false };
    }

    return stateFromStatus(payload as StatusPayload);
  }

  /*
   * The row shows the connection state before anything is tapped, so the
   * status has to load on mount. Nothing is assigned synchronously here — the
   * initial "loading" comes from useState — because a synchronous setState in
   * an effect is an error under this project's lint rules.
   */
  useEffect(() => {
    let active = true;

    async function run() {
      try {
        const next = await loadStatus();

        if (active) {
          setState(next);
        }
      } catch {
        if (active) {
          setState({ kind: "unavailable", authentication: false });
        }
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, []);

  async function refreshStatus() {
    try {
      setState(await loadStatus());
    } catch {
      setState({ kind: "unavailable", authentication: false });
    }
  }

  function resetFeedback() {
    setNotice("");
    setError("");
    setCopied(false);
    setConfirming(null);
  }

  async function handleIssue() {
    if (busy) {
      return;
    }

    resetFeedback();
    setBusy("issue");

    try {
      const response = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });

      const payload: unknown = await response.json().catch(() => null);

      if (response.status === 401) {
        setError(copy.authenticationError);
        return;
      }

      const token =
        typeof payload === "object"
        && payload !== null
        && typeof (payload as Record<string, unknown>).token === "string"
          ? ((payload as Record<string, unknown>).token as string)
          : "";

      if (!response.ok || !token) {
        setError(copy.actionError);
        return;
      }

      setIssuedToken(token);
      setNotice(copy.generateSuccess);
      await refreshStatus();
    } catch {
      setError(copy.actionError);
    } finally {
      setBusy(null);
    }
  }

  async function handleRevoke() {
    if (busy) {
      return;
    }

    resetFeedback();
    setBusy("revoke");

    try {
      const response = await fetch(TOKEN_ENDPOINT, {
        method: "DELETE",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });

      if (response.status === 401) {
        setError(copy.authenticationError);
        return;
      }

      if (!response.ok) {
        setError(copy.actionError);
        return;
      }

      // A revoked token is dead, so leaving it on screen would invite pasting
      // something that can no longer authenticate.
      setIssuedToken("");
      setNotice(copy.revokeSuccess);
      await refreshStatus();
    } catch {
      setError(copy.actionError);
    } finally {
      setBusy(null);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(issuedToken);
      setCopied(true);
      setError("");
    } catch {
      setError(copy.copyError);
    }
  }

  function handleOpen() {
    resetFeedback();
    setOpen(true);
    void refreshStatus();
  }

  function handleClose() {
    resetFeedback();
    setIssuedToken("");
    setOpen(false);
  }

  function formatMoment(value: string | null) {
    if (!value) {
      return copy.neverUsed;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return copy.notAvailable;
    }

    return parsed.toLocaleDateString(
      language === "traditional-chinese" ? "zh-TW" : "en-US",
      { year: "numeric", month: "short", day: "numeric" },
    );
  }

  const token =
    state.kind === "active" || state.kind === "revoked"
      ? state.token
      : null;

  const rowValue =
    state.kind === "loading"
      ? copy.statusLoading
      : state.kind === "active"
        ? copy.statusReady
        : state.kind === "revoked"
          ? copy.statusRevoked
          : state.kind === "empty"
            ? copy.statusNotConfigured
            : copy.statusUnavailable;

  const rowTone: SettingsRowTone =
    state.kind === "active"
      ? "emerald"
      : state.kind === "revoked"
        ? "amber"
        : state.kind === "empty"
          ? "blue"
          : "neutral";

  const stateContent =
    state.kind === "active"
      ? { title: copy.activeTitle, description: copy.activeDescription }
      : state.kind === "revoked"
        ? { title: copy.revokedTitle, description: copy.revokedDescription }
        : state.kind === "empty"
          ? { title: copy.emptyTitle, description: copy.emptyDescription }
          : state.kind === "unavailable"
            ? {
                title: copy.unavailableTitle,
                description: state.authentication
                  ? copy.authenticationError
                  : copy.unavailableDescription,
              }
            : { title: copy.statusLoading, description: copy.sheetDescription };

  const statusCardClassName =
    state.kind === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : state.kind === "revoked"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-black/[0.07] bg-black/[0.03] text-black";

  function renderStateIcon(size: number) {
    if (state.kind === "loading" || busy) {
      return (
        <LoaderCircle
          aria-hidden="true"
          size={size}
          className="animate-spin"
        />
      );
    }

    if (state.kind === "active") {
      return <PlugZap aria-hidden="true" size={size} strokeWidth={1.9} />;
    }

    if (state.kind === "revoked") {
      return <Unplug aria-hidden="true" size={size} strokeWidth={1.8} />;
    }

    return <Plug aria-hidden="true" size={size} strokeWidth={1.8} />;
  }

  const canIssue = state.kind === "empty" || state.kind === "revoked";
  const canManage = state.kind === "active";

  return (
    <>
      <SettingsRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        value={rowValue}
        tone={rowTone}
        icon={renderStateIcon(17)}
        disabled={Boolean(busy)}
        onClick={handleOpen}
      />

      <BottomSheet
        open={open}
        onClose={handleClose}
        title={copy.sheetTitle}
        description={copy.sheetDescription}
        footer={
          <div className="space-y-2">
            {canIssue && (
              <button
                type="button"
                disabled={Boolean(busy)}
                aria-busy={busy === "issue"}
                onClick={() => void handleIssue()}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white transition-all active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busy === "issue" ? (
                  <LoaderCircle
                    aria-hidden="true"
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <KeyRound aria-hidden="true" size={16} strokeWidth={1.9} />
                )}

                {busy === "issue" ? copy.generating : copy.generate}
              </button>
            )}

            {canManage && (
              <>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  aria-busy={busy === "issue"}
                  onClick={() => setConfirming("rotate")}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white transition-all active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {busy === "issue" ? (
                    <LoaderCircle
                      aria-hidden="true"
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <RefreshCw
                      aria-hidden="true"
                      size={16}
                      strokeWidth={1.9}
                    />
                  )}

                  {busy === "issue" ? copy.rotating : copy.rotate}
                </button>

                <button
                  type="button"
                  disabled={Boolean(busy)}
                  aria-busy={busy === "revoke"}
                  onClick={() => setConfirming("revoke")}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-black/[0.06] px-5 text-sm font-semibold text-black transition-all active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {busy === "revoke" ? (
                    <LoaderCircle
                      aria-hidden="true"
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Unplug aria-hidden="true" size={16} strokeWidth={1.9} />
                  )}

                  {busy === "revoke" ? copy.revoking : copy.revoke}
                </button>
              </>
            )}

            {state.kind === "unavailable" && (
              <button
                type="button"
                onClick={() => void refreshStatus()}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white transition-all active:scale-[0.985]"
              >
                <RefreshCw aria-hidden="true" size={16} strokeWidth={1.9} />
                {copy.refresh}
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="flex min-h-12 w-full items-center justify-center rounded-full px-5 text-sm font-semibold text-black/50 transition-all active:scale-[0.985]"
            >
              {copy.close}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
            >
              {error}
            </div>
          )}

          {notice && !error && (
            <div
              role="status"
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-700"
            >
              {notice}
            </div>
          )}

          {/*
            Shown once, right after issuing. There is no way to recover it
            later, so it is deliberately loud and sits above the status card.
          */}
          {issuedToken && (
            <div className="rounded-2xl border border-black/[0.08] bg-black/[0.03] px-4 py-4">
              <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-black">
                {copy.oneTimeTitle}
              </h3>

              <p className="mt-1 text-xs leading-5 text-black/55">
                {copy.oneTimeDescription}
              </p>

              <p className="mt-3 break-all rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 font-mono text-[13px] leading-5 text-black">
                {issuedToken}
              </p>

              <button
                type="button"
                onClick={() => void handleCopy()}
                className="mt-2.5 flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white transition-all active:scale-[0.985]"
              >
                {copied ? (
                  <Check aria-hidden="true" size={15} strokeWidth={2.2} />
                ) : (
                  <Copy aria-hidden="true" size={15} strokeWidth={1.9} />
                )}

                {copied ? copy.copied : copy.copy}
              </button>
            </div>
          )}

          {confirming && (
            <div
              role="alertdialog"
              aria-label={
                confirming === "rotate"
                  ? copy.rotateConfirmTitle
                  : copy.revokeConfirmTitle
              }
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4"
            >
              <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-amber-950">
                {confirming === "rotate"
                  ? copy.rotateConfirmTitle
                  : copy.revokeConfirmTitle}
              </h3>

              <p className="mt-1 text-xs leading-5 text-amber-950/70">
                {confirming === "rotate"
                  ? copy.rotateConfirmDescription
                  : copy.revokeConfirmDescription}
              </p>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="min-h-10 flex-1 rounded-full bg-white px-4 text-sm font-semibold text-black transition-all active:scale-[0.985]"
                >
                  {copy.cancel}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const action = confirming;
                    setConfirming(null);

                    if (action === "rotate") {
                      void handleIssue();
                      return;
                    }

                    void handleRevoke();
                  }}
                  className="min-h-10 flex-1 rounded-full bg-black px-4 text-sm font-semibold text-white transition-all active:scale-[0.985]"
                >
                  {confirming === "rotate"
                    ? copy.confirmRotate
                    : copy.confirmRevoke}
                </button>
              </div>
            </div>
          )}

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

          {token && (
            <dl className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white text-sm">
              <div className="flex items-center justify-between border-b border-black/[0.05] px-4 py-3">
                <dt className="text-black/50">{copy.tokenPrefixLabel}</dt>
                <dd className="font-mono text-[13px] text-black">
                  {token.prefix}…
                </dd>
              </div>

              <div className="flex items-center justify-between border-b border-black/[0.05] px-4 py-3">
                <dt className="text-black/50">{copy.createdLabel}</dt>
                <dd className="text-black">
                  {formatMoment(token.createdAt)}
                </dd>
              </div>

              <div className="flex items-center justify-between px-4 py-3">
                <dt className="text-black/50">{copy.lastUsedLabel}</dt>
                <dd className="text-black">
                  {formatMoment(token.lastUsedAt)}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
