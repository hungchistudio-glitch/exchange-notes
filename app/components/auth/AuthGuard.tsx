"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppSplash from "@/components/ui/AppSplash";
import { createClient } from "@/lib/supabase/client";

type AuthGuardProps = {
  children: ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        setAuthenticated(false);
        router.replace("/login");
        return;
      }

      setAuthenticated(true);
      setChecking(false);
    }

    void checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      if (!session) {
        setAuthenticated(false);
        router.replace("/login");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1ea]">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-black/15 border-t-black"
          role="status"
          aria-label="Checking your account"
        />
      </main>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <>
      <AppSplash />
      {children}
    </>
  );
}
