"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import AppSplash from "@/components/ui/AppSplash";
import { createClient } from "@/lib/supabase/client";

export default function LaunchPage() {
  const router = useRouter();
  const destinationRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    async function resolveDestination() {
      const supabase = createClient();
      let session = await supabase.auth.getSession();

      console.log("[Launch] first session check", {
        hasSession: Boolean(session.data.session),
        userId: session.data.session?.user.id ?? null,
        errorMessage: session.error?.message ?? null,
      });

      if (!session.data.session) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        session = await supabase.auth.getSession();

        console.log("[Launch] second session check", {
          hasSession: Boolean(session.data.session),
          userId: session.data.session?.user.id ?? null,
          errorMessage: session.error?.message ?? null,
        });
      }

      if (!active) return;

      destinationRef.current = session.data.session ? "/home" : "/login";
    }

    void resolveDestination();

    return () => {
      active = false;
    };
  }, []);

  return (
    <AppSplash
      onComplete={() => {
        const go = () => router.replace(destinationRef.current as string);

        if (destinationRef.current) {
          go();
          return;
        }

        const poll = setInterval(() => {
          if (destinationRef.current) {
            clearInterval(poll);
            go();
          }
        }, 50);
      }}
    />
  );
}
