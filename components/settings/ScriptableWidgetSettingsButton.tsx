"use client";

import {
  Check,
  Copy,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import SettingsRow, {
  type SettingsRowTone,
} from "@/components/foundation/rows/SettingsRow";
import StatusMessage from "@/components/foundation/feedback/StatusMessage";
import useTranslation from "@/hooks/i18n/useTranslation";

type UnknownRecord =
  Record<string, unknown>;

type TokenStatus = {
  prefix: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  active: boolean;
};

type Feedback = {
  tone: "success" | "danger";
  message: string;
};

type Action =
  | "issuing"
  | "revoking"
  | "refreshing"
  | null;

type Confirmation =
  | "rotate"
  | "revoke"
  | null;

function isRecord(
  value: unknown,
): value is UnknownRecord {
  return (
    typeof value === "object"
    && value !== null
    && !Array.isArray(value)
  );
}

function parseNullableTimestamp(
  value: unknown,
): string | null | undefined {
  if (value === null) {
    return null;
  }

  if (
    typeof value !== "string"
    || Number.isNaN(Date.parse(value))
  ) {
    return undefined;
  }

  return value;
}

function parseTokenStatus(
  value: unknown,
): TokenStatus | null {
  if (!isRecord(value)) {
    return null;
  }

  const prefix =
    typeof value.prefix === "string"
      ? value.prefix.trim()
      : "";

  const createdAt =
    typeof value.createdAt === "string"
      ? value.createdAt
      : "";

  const updatedAt =
    typeof value.updatedAt === "string"
      ? value.updatedAt
      : "";

  const lastUsedAt =
    parseNullableTimestamp(
      value.lastUsedAt,
    );

  const revokedAt =
    parseNullableTimestamp(
      value.revokedAt,
    );

  if (
    prefix.length < 8
    || Number.isNaN(Date.parse(createdAt))
    || Number.isNaN(Date.parse(updatedAt))
    || lastUsedAt === undefined
    || revokedAt === undefined
    || typeof value.active !== "boolean"
  ) {
    return null;
  }

  return {
    prefix,
    createdAt,
    updatedAt,
    lastUsedAt,
    revokedAt,
    active: value.active,
  };
}

async function readResponseJson(
  response: Response,
): Promise<unknown> {
  return response
    .json()
    .catch(() => null);
}

function formatTimestamp(
  value: string | null,
  fallback: string,
): string {
  if (!value) {
    return fallback;
  }

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

export default function ScriptableWidgetSettingsButton() {
  const { t } = useTranslation();
  const copy =
    t.settings.scriptableWidget;

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [loadFailed, setLoadFailed] =
    useState(false);

  const [status, setStatus] =
    useState<TokenStatus | null>(null);

  const [issuedToken, setIssuedToken] =
    useState<string | null>(null);

  const [action, setAction] =
    useState<Action>(null);

  const [
    confirmation,
    setConfirmation,
  ] = useState<Confirmation>(null);

  const [copied, setCopied] =
    useState(false);

  const [feedback, setFeedback] =
    useState<Feedback | null>(null);

  const busy =
    action !== null;

  const loadStatus =
    useCallback(
      async (
        signal?: AbortSignal,
        refreshing = false,
      ) => {
        if (refreshing) {
          setAction("refreshing");
        } else {
          setLoading(true);
        }

        setLoadFailed(false);

        try {
          const response = await fetch(
            "/api/scriptable/token",
            {
              method: "GET",
              credentials: "same-origin",
              cache: "no-store",
              headers: {
                Accept: "application/json",
              },
              signal,
            },
          );

          const payload =
            await readResponseJson(response);

          if (response.status === 401) {
            setLoadFailed(true);
            setFeedback({
              tone: "danger",
              message:
                copy.authenticationError,
            });
            return;
          }

          if (
            !response.ok
            || !isRecord(payload)
            || payload.ok !== true
            || typeof payload.configured
              !== "boolean"
          ) {
            throw new Error(
              "Invalid token status response.",
            );
          }

          if (!payload.configured) {
            setStatus(null);
            setFeedback(null);
            return;
          }

          const parsedStatus =
            parseTokenStatus(payload.token);

          if (!parsedStatus) {
            throw new Error(
              "Invalid token status.",
            );
          }

          setStatus(parsedStatus);
          setFeedback(null);
        } catch (error) {
          if (
            error instanceof DOMException
            && error.name === "AbortError"
          ) {
            return;
          }

          setLoadFailed(true);
          setFeedback({
            tone: "danger",
            message: copy.loadError,
          });
        } finally {
          setLoading(false);
          setAction(null);
        }
      },
      [
        copy.authenticationError,
        copy.loadError,
      ],
    );

  useEffect(() => {
    const controller =
      new AbortController();

    /*
     * Schedule initial loading outside the synchronous effect body.
     * This avoids a cascading render while preserving cancellation.
     */
    const timeoutId =
      window.setTimeout(() => {
        void loadStatus(
          controller.signal,
        );
      }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [loadStatus]);

  function handleOpen() {
    setIssuedToken(null);
    setCopied(false);
    setConfirmation(null);
    setOpen(true);
  }

  function handleClose() {
    /*
     * Never retain the one-time plaintext token after the sheet closes.
     * PostgreSQL stores only its SHA-256 hash.
     */
    setIssuedToken(null);
    setCopied(false);
    setConfirmation(null);
    setFeedback(null);
    setOpen(false);
  }

  async function handleIssueToken() {
    if (
      status?.active
      && confirmation !== "rotate"
    ) {
      setConfirmation("rotate");
      return;
    }

    setAction("issuing");
    setConfirmation(null);
    setFeedback(null);
    setIssuedToken(null);
    setCopied(false);

    try {
      const response = await fetch(
        "/api/scriptable/token",
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const payload =
        await readResponseJson(response);

      if (response.status === 401) {
        setFeedback({
          tone: "danger",
          message:
            copy.authenticationError,
        });
        return;
      }

      if (
        !response.ok
        || !isRecord(payload)
        || payload.ok !== true
        || typeof payload.token
          !== "string"
        || typeof payload.tokenPrefix
          !== "string"
        || typeof payload.createdAt
          !== "string"
      ) {
        throw new Error(
          "Invalid token issue response.",
        );
      }

      const token =
        payload.token.trim();

      if (
        !token.startsWith("ensw_")
        || token.length < 40
      ) {
        throw new Error(
          "Invalid token value.",
        );
      }

      setIssuedToken(token);

      setStatus({
        prefix:
          payload.tokenPrefix,
        createdAt:
          payload.createdAt,
        updatedAt:
          payload.createdAt,
        lastUsedAt: null,
        revokedAt: null,
        active: true,
      });

      setLoadFailed(false);
      setFeedback({
        tone: "success",
        message:
          copy.generateSuccess,
      });
    } catch {
      setFeedback({
        tone: "danger",
        message: copy.actionError,
      });
    } finally {
      setAction(null);
    }
  }

  async function handleRevokeToken() {
    if (
      confirmation !== "revoke"
    ) {
      setConfirmation("revoke");
      return;
    }

    setAction("revoking");
    setConfirmation(null);
    setFeedback(null);

    try {
      const response = await fetch(
        "/api/scriptable/token",
        {
          method: "DELETE",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const payload =
        await readResponseJson(response);

      if (response.status === 401) {
        setFeedback({
          tone: "danger",
          message:
            copy.authenticationError,
        });
        return;
      }

      if (
        !response.ok
        || !isRecord(payload)
        || payload.ok !== true
        || typeof payload.revoked
          !== "boolean"
      ) {
        throw new Error(
          "Invalid token revoke response.",
        );
      }

      const now =
        new Date().toISOString();

      setStatus((current) =>
        current
          ? {
              ...current,
              active: false,
              revokedAt: now,
              updatedAt: now,
            }
          : null,
      );

      setIssuedToken(null);
      setCopied(false);

      setFeedback({
        tone: "success",
        message:
          copy.revokeSuccess,
      });
    } catch {
      setFeedback({
        tone: "danger",
        message: copy.actionError,
      });
    } finally {
      setAction(null);
    }
  }

  async function handleCopyToken() {
    if (!issuedToken) {
      return;
    }

    try {
      await navigator.clipboard
        .writeText(issuedToken);

      setCopied(true);

      window.setTimeout(
        () => setCopied(false),
        1_500,
      );
    } catch {
      setFeedback({
        tone: "danger",
        message: copy.copyError,
      });
    }
  }

  const active =
    status?.active === true;

  const rowValue = loading
    ? copy.statusLoading
    : loadFailed
      ? copy.statusUnavailable
      : active
        ? copy.statusReady
        : status
          ? copy.statusRevoked
          : copy.statusNotConfigured;

  const rowTone: SettingsRowTone =
    active
      ? "emerald"
      : loadFailed
        ? "red"
        : "neutral";

  const statusTitle = loadFailed
    ? copy.unavailableTitle
    : active
      ? copy.activeTitle
      : status
        ? copy.revokedTitle
        : copy.emptyTitle;

  const statusDescription =
    loadFailed
      ? copy.unavailableDescription
      : active
        ? copy.activeDescription
        : status
          ? copy.revokedDescription
          : copy.emptyDescription;

  return (
    <>
      <SettingsRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        value={rowValue}
        icon={
          active ? (
            <ShieldCheck
              size={16}
              strokeWidth={1.9}
            />
          ) : (
            <Smartphone
              size={16}
              strokeWidth={1.8}
            />
          )
        }
        tone={rowTone}
        onClick={handleOpen}
      />

      <BottomSheet
        open={open}
        onClose={handleClose}
        title={copy.sheetTitle}
        description={
          copy.sheetDescription
        }
        footer={
          <button
            type="button"
            onClick={handleClose}
            className="flex min-h-12 w-full items-center justify-center rounded-full bg-black text-sm font-semibold text-white transition-all active:scale-[0.98]"
          >
            {copy.close}
          </button>
        }
      >
        <div className="space-y-4">
          {feedback ? (
            <StatusMessage
              tone={feedback.tone}
            >
              {feedback.message}
            </StatusMessage>
          ) : null}

          <section className="rounded-3xl border border-black/[0.07] bg-black/[0.025] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-sm">
                {loading
                  || action === "refreshing" ? (
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                  />
                ) : active ? (
                  <ShieldCheck
                    size={18}
                    strokeWidth={2}
                  />
                ) : (
                  <KeyRound
                    size={18}
                    strokeWidth={1.8}
                  />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-black">
                  {statusTitle}
                </h3>

                <p className="mt-1 text-sm leading-6 text-black/50">
                  {statusDescription}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  void loadStatus(
                    undefined,
                    true,
                  )
                }
                disabled={busy || loading}
                aria-label={copy.refresh}
                title={copy.refresh}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black/60 shadow-sm transition-transform active:scale-90 disabled:opacity-40"
              >
                <RefreshCw
                  size={16}
                  className={
                    action === "refreshing"
                      ? "animate-spin"
                      : undefined
                  }
                />
              </button>
            </div>

            {status ? (
              <dl className="mt-4 grid gap-3 border-t border-black/[0.06] pt-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-black/45">
                    {copy.tokenPrefixLabel}
                  </dt>
                  <dd className="font-mono font-semibold text-black/75">
                    {status.prefix}…
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <dt className="text-black/45">
                    {copy.createdLabel}
                  </dt>
                  <dd className="text-right font-medium text-black/70">
                    {formatTimestamp(
                      status.createdAt,
                      copy.notAvailable,
                    )}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <dt className="text-black/45">
                    {copy.lastUsedLabel}
                  </dt>
                  <dd className="text-right font-medium text-black/70">
                    {formatTimestamp(
                      status.lastUsedAt,
                      copy.neverUsed,
                    )}
                  </dd>
                </div>
              </dl>
            ) : null}
          </section>

          {issuedToken ? (
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-[15px] font-semibold text-amber-950">
                {copy.oneTimeTitle}
              </h3>

              <p className="mt-1 text-sm leading-6 text-amber-900/70">
                {copy.oneTimeDescription}
              </p>

              <div className="mt-3 rounded-2xl border border-amber-200 bg-white p-3">
                <p className="break-all font-mono text-xs leading-5 text-black/75">
                  {issuedToken}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  void handleCopyToken()
                }
                className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-amber-950 text-sm font-semibold text-white transition-all active:scale-[0.98]"
              >
                {copied ? (
                  <Check
                    size={16}
                    strokeWidth={2.4}
                  />
                ) : (
                  <Copy
                    size={16}
                    strokeWidth={1.9}
                  />
                )}

                {copied
                  ? copy.copied
                  : copy.copy}
              </button>
            </section>
          ) : null}

          {confirmation ? (
            <section className="rounded-3xl border border-red-200 bg-red-50 p-4">
              <h3 className="text-[15px] font-semibold text-red-950">
                {confirmation === "rotate"
                  ? copy.rotateConfirmTitle
                  : copy.revokeConfirmTitle}
              </h3>

              <p className="mt-1 text-sm leading-6 text-red-900/70">
                {confirmation === "rotate"
                  ? copy.rotateConfirmDescription
                  : copy.revokeConfirmDescription}
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setConfirmation(null)
                  }
                  disabled={busy}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-white text-sm font-semibold text-black shadow-sm active:scale-[0.98] disabled:opacity-50"
                >
                  {copy.cancel}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirmation
                      === "rotate"
                    ) {
                      void handleIssueToken();
                    } else {
                      void handleRevokeToken();
                    }
                  }}
                  disabled={busy}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-red-600 text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-50"
                >
                  {confirmation === "rotate"
                    ? copy.confirmRotate
                    : copy.confirmRevoke}
                </button>
              </div>
            </section>
          ) : null}

          {!loadFailed ? (
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() =>
                  void handleIssueToken()
                }
                disabled={
                  busy
                  || loading
                  || confirmation !== null
                }
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-45"
              >
                {action === "issuing" ? (
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                  />
                ) : active ? (
                  <RotateCw
                    size={16}
                    strokeWidth={1.9}
                  />
                ) : (
                  <KeyRound
                    size={16}
                    strokeWidth={1.9}
                  />
                )}

                {action === "issuing"
                  ? active
                    ? copy.rotating
                    : copy.generating
                  : active
                    ? copy.rotate
                    : copy.generate}
              </button>

              {active ? (
                <button
                  type="button"
                  onClick={() =>
                    void handleRevokeToken()
                  }
                  disabled={
                    busy
                    || confirmation !== null
                  }
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-red-50 text-sm font-semibold text-red-700 transition-all active:scale-[0.98] disabled:opacity-45"
                >
                  {action === "revoking" ? (
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Trash2
                      size={16}
                      strokeWidth={1.9}
                    />
                  )}

                  {action === "revoking"
                    ? copy.revoking
                    : copy.revoke}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </BottomSheet>
    </>
  );
}
