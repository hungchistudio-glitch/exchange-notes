"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type AuthStatus =
  | "checking"
  | "authenticated"
  | "redirecting";

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

export default function AuthGuard({
  children,
}: AuthGuardProps) {
  const [status, setStatus] =
    useState<AuthStatus>("checking");

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let redirecting = false;

    function redirectToLogin() {
      if (!active || redirecting) return;

      redirecting = true;
      setStatus("redirecting");
      window.location.replace("/login");
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

        setStatus("authenticated");
      } catch (error) {
        console.error("Auth check failed:", error);
        redirectToLogin();
      }
    }

    void checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
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

  return children;
}
