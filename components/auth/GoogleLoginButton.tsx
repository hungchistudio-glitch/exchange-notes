"use client";

import { useState, type ReactNode } from "react";
import useTranslation from "@/hooks/i18n/useTranslation";
import { track, type AnalyticsEvent } from "@/lib/analytics/track";
import { createClient } from "@/lib/supabase/client";

type LandingCtaEvent = Extract<
  AnalyticsEvent,
  "landing_primary_cta_click" | "landing_final_cta_click"
>;

type GoogleLoginButtonProps = {
  label?: ReactNode;
  submittingLabel?: ReactNode;
  analyticsEvent?: LandingCtaEvent;
  analyticsSource?: string;
  className?: string;
};

export default function GoogleLoginButton({
  label,
  submittingLabel,
  analyticsEvent,
  analyticsSource = "login",
  className = "",
}: GoogleLoginButtonProps) {
  const { t } = useTranslation();
  const copy = t.auth.login;

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleGoogleLogin() {
    setLoading(true);
    setErrorMessage("");

    if (analyticsEvent) {
      track(analyticsEvent, { source: analyticsSource });
    }
    track("google_auth_start", { source: analyticsSource });

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          /*
           * Always show the account chooser.
           *
           * Without this, Google decides whether to prompt — and when there is
           * one signed-in Google account that has already granted consent, it
           * approves silently and redirects straight back. Signing out of
           * Exchange Notes and tapping sign-in then returned the user to the
           * app without a single screen in between, which reads as "logging out
           * did nothing" and means a shared device can be re-entered by whoever
           * picks it up next.
           *
           * `select_account` puts that decision back in the user's hands every
           * time. It does not re-prompt for consent to the scopes, so returning
           * users still just tap their account.
           */
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) throw error;
    } catch (error) {
      // Never show the raw OAuth/configuration error to the user.
      console.error(error);
      setErrorMessage(copy.genericError);
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className={`flex min-h-12 w-full items-center justify-center rounded-full bg-black px-5 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        {loading
          ? (submittingLabel ?? copy.googleSubmitting)
          : (label ?? copy.googleSubmit)}
      </button>

      {errorMessage ? (
        <p className="mt-3 text-center text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
