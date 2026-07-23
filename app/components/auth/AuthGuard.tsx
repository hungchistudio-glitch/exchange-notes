"use client";

import { ReactNode, useEffect, useState } from "react";

import AppSplash from "@/components/ui/AppSplash";
import { createClient } from "@/lib/supabase/client";

const LOGIN_SPLASH_KEY = "exchange-notes:show-login-splash";

type AuthStatus = "checking" | "authenticated" | "redirecting";

type AuthGuardProps = {
  children: ReactNode;
};

function AuthLoadingScreen({
  label,
}: {
  label: string;
}) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f4f1ea]">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-black/15 border-t-black"
          role="status"
          aria-label={label}
        />

        <p className="text-sm font-medium text-black/55">
          Exchange Notes
        </p>
      </div>
    </main>
  );
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let redirectScheduled = false;

    function redirectToLogin() {
      if (!active || redirectScheduled) return;

      redirectScheduled = true;
      setShowSplash(false);
      setStatus("redirecting");

      window.setTimeout(() => {
        window.location.replace("/login");
      }, 0);
    }

    async function checkUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (error || !user) {
          redirectToLogin();
          return;
        }

        const shouldShowSplash =
          window.sessionStorage.getItem(LOGIN_SPLASH_KEY) === "1";

        setShowSplash(shouldShowSplash);
        setStatus("authenticated");
      } catch (error) {
        console.error("Auth check failed:", error);
        redirectToLogin();
      }
    }

    void checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "SIGNED_OUT" || !session) {
        redirectToLogin();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (status !== "authenticated") {
    return (
      <AuthLoadingScreen
        label={
          status === "redirecting"
            ? "Returning to login"
            : "Checking your account"
        }
      />
    );
  }

  if (showSplash) {
    return (
      <AppSplash
        onComplete={() => {
          window.sessionStorage.removeItem(LOGIN_SPLASH_KEY);
          setShowSplash(false);
        }}
      />
    );
  }

  return children;
}
