"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type FormStatus =
  | { type: "idle"; message: "" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

const EXCHANGE_ID_PATTERN = /^[a-z0-9_]{3,24}$/;
const MINIMUM_PASSWORD_LENGTH = 8;

function normalizeExchangeId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}

function normalizeName(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
}

function getFriendlyAuthError(message: string): string {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("already registered") ||
    normalizedMessage.includes("already exists")
  ) {
    return "An account may already exist for this email. Try logging in or resetting your password.";
  }

  if (
    normalizedMessage.includes("invalid email")
  ) {
    return "Please enter a valid email address.";
  }

  if (
    normalizedMessage.includes("password") &&
    normalizedMessage.includes("weak")
  ) {
    return "Please choose a stronger password with at least 8 characters.";
  }

  if (
    normalizedMessage.includes("rate") ||
    normalizedMessage.includes("too many")
  ) {
    return "Too many attempts were made. Please wait a moment and try again.";
  }

  return "We could not create your account. Please review your details and try again.";
}

function EyeIcon({
  visible,
}: {
  visible: boolean;
}) {
  return visible ? (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="M4 4l16 16"
        strokeLinecap="round"
      />
      <path
        d="M10.6 6.2A9.8 9.8 0 0112 6c5.5 0 9 6 9 6a15.6 15.6 0 01-2.1 2.9M6.2 6.2C4.2 7.6 3 9.5 3 12c0 0 3.5 6 9 6a8.8 8.8 0 004.1-1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.9 9.9a3 3 0 004.2 4.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"
    />
  );
}

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [exchangeId, setExchangeId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmedPassword, setConfirmedPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [acceptedTerms, setAcceptedTerms] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [status, setStatus] =
    useState<FormStatus>({
      type: "idle",
      message: "",
    });

  const normalizedExchangeId =
    useMemo(
      () => normalizeExchangeId(exchangeId),
      [exchangeId]
    );

  const exchangeIdIsValid =
    EXCHANGE_ID_PATTERN.test(
      normalizedExchangeId
    );

  const passwordsMatch =
    password === confirmedPassword;

  const passwordIsLongEnough =
    password.length >=
    MINIMUM_PASSWORD_LENGTH;

  const formIsValid =
    normalizeName(name).length >= 2 &&
    exchangeIdIsValid &&
    email.trim().length > 0 &&
    passwordIsLongEnough &&
    passwordsMatch &&
    acceptedTerms;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    const cleanName =
      normalizeName(name);

    const cleanExchangeId =
      normalizeExchangeId(exchangeId);

    const cleanEmail =
      email.trim().toLowerCase();

    if (cleanName.length < 2) {
      setStatus({
        type: "error",
        message:
          "Please enter a name with at least 2 characters.",
      });
      return;
    }

    if (
      !EXCHANGE_ID_PATTERN.test(
        cleanExchangeId
      )
    ) {
      setStatus({
        type: "error",
        message:
          "Exchange ID must contain 3–24 lowercase letters, numbers, or underscores.",
      });
      return;
    }

    if (!passwordIsLongEnough) {
      setStatus({
        type: "error",
        message:
          "Password must contain at least 8 characters.",
      });
      return;
    }

    if (!passwordsMatch) {
      setStatus({
        type: "error",
        message:
          "The passwords do not match.",
      });
      return;
    }

    if (!acceptedTerms) {
      setStatus({
        type: "error",
        message:
          "Please accept the Terms and Privacy Policy.",
      });
      return;
    }

    setLoading(true);
    setStatus({
      type: "idle",
      message: "",
    });

    try {
      const supabase =
        createClient();

      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/login?verified=true`
          : undefined;

      const {
        data,
        error,
      } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo:
            redirectUrl,
          data: {
            display_name: cleanName,
            exchange_id:
              cleanExchangeId,
          },
        },
      });

      if (error) {
        throw error;
      }

      /*
       * When email confirmation is disabled,
       * an authenticated session may already exist.
       * In that case, this upsert provides an immediate
       * fallback in addition to the recommended DB trigger.
       */
      if (
        data.user &&
        data.session
      ) {
        const {
          error: profileError,
        } = await supabase
          .from("profiles")
          .upsert(
            {
              id: data.user.id,
              display_name:
                cleanName,
              exchange_id:
                cleanExchangeId,
              email: cleanEmail,
            },
            {
              onConflict: "id",
            }
          );

        if (profileError) {
          console.warn(
            "Profile upsert failed:",
            profileError.message
          );
        }
      }

      setStatus({
        type: "success",
        message:
          "Account created. Check your inbox and confirm your email before logging in.",
      });

      setPassword("");
      setConfirmedPassword("");
    } catch (error) {
      const message =
        error instanceof Error
          ? getFriendlyAuthError(
              error.message
            )
          : "We could not create your account. Please try again.";

      setStatus({
        type: "error",
        message,
      });
    } finally {
      setLoading(false);
    }
  }

  if (status.type === "success") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f0e8] px-5 py-10 text-neutral-950">
        <section className="w-full max-w-md rounded-[32px] border border-black/[0.06] bg-white px-7 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.08)] sm:px-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-7 w-7"
              aria-hidden="true"
            >
              <path
                d="m5 12 4 4L19 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Almost there
          </p>

          <h1 className="mt-2 text-[34px] font-bold leading-tight tracking-[-0.04em]">
            Check your inbox
          </h1>

          <p
            role="status"
            className="mt-4 text-[15px] leading-7 text-neutral-600"
          >
            {status.message}
          </p>

          <div className="mt-8 rounded-2xl bg-[#f7f5f0] px-4 py-4 text-sm leading-6 text-neutral-600">
            We sent a confirmation link to{" "}
            <span className="font-semibold text-neutral-900">
              {email.trim().toLowerCase()}
            </span>
            .
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/login")
            }
            className="mt-7 flex h-13 w-full items-center justify-center rounded-2xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 active:scale-[0.99]"
          >
            Continue to Log In
          </button>

          <button
            type="button"
            onClick={() =>
              setStatus({
                type: "idle",
                message: "",
              })
            }
            className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900"
          >
            Use another email
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f3f0e8] px-5 py-8 text-neutral-950 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-140px] top-[-160px] h-[360px] w-[360px] rounded-full bg-orange-200/35 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-160px] right-[-130px] h-[340px] w-[340px] rounded-full bg-sky-200/30 blur-3xl"
      />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center gap-8 lg:grid-cols-[0.86fr_1.14fr]">
        <section className="hidden px-5 lg:block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            English × Traditional Chinese
          </p>

          <h1 className="mt-5 max-w-md text-[58px] font-bold leading-[0.98] tracking-[-0.055em]">
            Learn a language through real life.
          </h1>

          <p className="mt-6 max-w-sm text-[17px] leading-8 text-neutral-600">
            Capture new words, exchange notes, and grow with a learning partner.
          </p>

          <div className="mt-10 flex items-center gap-3 text-sm text-neutral-500">
            <span className="h-px w-10 bg-neutral-300" />
            Private by design
          </div>
        </section>

        <section className="w-full rounded-[32px] border border-black/[0.06] bg-white/95 px-6 py-8 shadow-[0_28px_90px_rgba(0,0,0,0.09)] backdrop-blur-xl sm:px-10 sm:py-10">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 transition hover:text-neutral-950"
            >
              <span aria-hidden="true">
                ←
              </span>
              Exchange Notes
            </Link>

            <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400 lg:hidden">
              English × Traditional Chinese
            </p>

            <h2 className="mt-2 text-[36px] font-bold tracking-[-0.045em]">
              Create your account
            </h2>

            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Start learning and exchanging ideas together.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
            noValidate
          >
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold"
              >
                Your name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                maxLength={50}
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                placeholder="How should we call you?"
                className="h-13 w-full rounded-2xl border border-black/[0.09] bg-[#faf9f6] px-4 text-[15px] outline-none transition placeholder:text-neutral-400 focus:border-neutral-950 focus:bg-white focus:ring-4 focus:ring-black/[0.04]"
              />
            </div>

            <div>
              <label
                htmlFor="exchange-id"
                className="mb-2 block text-sm font-semibold"
              >
                Exchange ID
              </label>

              <div
                className={`flex h-13 items-center rounded-2xl border bg-[#faf9f6] transition focus-within:bg-white focus-within:ring-4 focus-within:ring-black/[0.04] ${
                  exchangeId.length > 0 &&
                  !exchangeIdIsValid
                    ? "border-red-300"
                    : "border-black/[0.09] focus-within:border-neutral-950"
                }`}
              >
                <span className="pl-4 text-lg font-semibold text-neutral-400">
                  @
                </span>

                <input
                  id="exchange-id"
                  name="exchangeId"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  minLength={3}
                  maxLength={24}
                  value={exchangeId}
                  onChange={(event) =>
                    setExchangeId(
                      normalizeExchangeId(
                        event.target.value
                      )
                    )
                  }
                  placeholder="yourname"
                  className="h-full min-w-0 flex-1 bg-transparent px-2 pr-4 text-[15px] outline-none placeholder:text-neutral-400"
                />
              </div>

              <div className="mt-2 flex items-center justify-between gap-3">
                <p
                  className={`text-xs ${
                    exchangeId.length > 0 &&
                    !exchangeIdIsValid
                      ? "text-red-600"
                      : "text-neutral-400"
                  }`}
                >
                  3–24 lowercase letters, numbers, or underscores.
                </p>

                <span className="shrink-0 text-[11px] text-neutral-400">
                  {normalizedExchangeId.length}/24
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold"
              >
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="you@example.com"
                className="h-13 w-full rounded-2xl border border-black/[0.09] bg-[#faf9f6] px-4 text-[15px] outline-none transition placeholder:text-neutral-400 focus:border-neutral-950 focus:bg-white focus:ring-4 focus:ring-black/[0.04]"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="new-password"
                  required
                  minLength={
                    MINIMUM_PASSWORD_LENGTH
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="At least 8 characters"
                  className="h-13 w-full rounded-2xl border border-black/[0.09] bg-[#faf9f6] px-4 pr-12 text-[15px] outline-none transition placeholder:text-neutral-400 focus:border-neutral-950 focus:bg-white focus:ring-4 focus:ring-black/[0.04]"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  aria-pressed={
                    showPassword
                  }
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-neutral-400 transition hover:text-neutral-900"
                >
                  <EyeIcon
                    visible={
                      showPassword
                    }
                  />
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-semibold"
              >
                Confirm password
              </label>

              <input
                id="confirm-password"
                name="confirmPassword"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                autoComplete="new-password"
                required
                minLength={
                  MINIMUM_PASSWORD_LENGTH
                }
                value={
                  confirmedPassword
                }
                onChange={(event) =>
                  setConfirmedPassword(
                    event.target.value
                  )
                }
                placeholder="Enter your password again"
                className={`h-13 w-full rounded-2xl border bg-[#faf9f6] px-4 text-[15px] outline-none transition placeholder:text-neutral-400 focus:bg-white focus:ring-4 focus:ring-black/[0.04] ${
                  confirmedPassword &&
                  !passwordsMatch
                    ? "border-red-300 focus:border-red-400"
                    : "border-black/[0.09] focus:border-neutral-950"
                }`}
              />

              {confirmedPassword &&
                !passwordsMatch && (
                  <p className="mt-2 text-xs text-red-600">
                    The passwords do not match.
                  </p>
                )}
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-[#faf9f6] px-4 py-3.5">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) =>
                  setAcceptedTerms(
                    event.target.checked
                  )
                }
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-neutral-950"
              />

              <span className="text-xs leading-5 text-neutral-500">
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="font-semibold text-neutral-800 underline-offset-4 hover:underline"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="font-semibold text-neutral-800 underline-offset-4 hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            {status.type === "error" && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              >
                {status.message}
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                !formIsValid
              }
              className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading && <Spinner />}

              <span>
                {loading
                  ? "Creating account"
                  : "Create account"}
              </span>
            </button>

            <p className="text-center text-sm text-neutral-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-neutral-950 underline-offset-4 hover:underline"
              >
                Log in
              </Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}