"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const INTERFACE_LANGUAGE_STORAGE_KEY =
  "exchange-notes-interface-language";

function hasSelectedLanguage() {
  const savedLanguage = window.localStorage.getItem(
    INTERFACE_LANGUAGE_STORAGE_KEY,
  );

  return (
    savedLanguage === "english" ||
    savedLanguage === "traditional-chinese"
  );
}

export default function LaunchPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function resolveDestination() {
      if (!hasSelectedLanguage()) {
        router.replace("/language");
        return;
      }

      const supabase = createClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      router.replace(session ? "/home" : "/login");
    }

    void resolveDestination();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f4f1ea] px-5 text-black">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-black text-2xl font-bold text-white">
          E
        </div>

        <h1 className="mt-5 text-2xl font-bold tracking-tight">
          Exchange Notes
        </h1>

        <div
          className="mx-auto mt-5 h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black"
          aria-label="Loading"
        />
      </div>
    </main>
  );
}
