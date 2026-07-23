"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
      setLoggingOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={loggingOut}
      aria-label={loggingOut ? "Logging out" : "Log out"}
      aria-busy={loggingOut}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-black bg-white text-black disabled:cursor-not-allowed disabled:opacity-50"
    >
      <LogOut size={19} />
    </button>
  );
}
