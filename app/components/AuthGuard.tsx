"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import LogoLoader from "@/components/ui/LogoLoader";
import { createClient } from "@/lib/supabase/client";

type AuthGuardProps = {
  children: ReactNode;
};

export default function AuthGuard({
  children,
}: AuthGuardProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setChecking(false);
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.replace("/login");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (checking) {
    return <LogoLoader label="Checking your session" />;
  }

  return <>{children}</>;
}
