"use client";

import { useState } from "react";
import useTranslation from "@/hooks/i18n/useTranslation";
import { createClient } from "@/lib/supabase/client";

export default function GoogleLoginButton() {
  const { t } = useTranslation();
  const copy = t.auth.login;

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleGoogleLogin() {
    setLoading(true);
    setErrorMessage("");

    const supabase = createClient();

    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      // Never show the raw OAuth/network error to the user.
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
        className="flex min-h-12 w-full items-center justify-center rounded-full bg-black px-5 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? copy.googleSubmitting : copy.googleSubmit}
      </button>

      {errorMessage ? (
        <p className="mt-3 text-center text-sm text-red-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}