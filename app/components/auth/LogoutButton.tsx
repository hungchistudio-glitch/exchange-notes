"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      aria-label="Log out"
      className="flex h-11 w-11 items-center justify-center rounded-full border border-black bg-white text-black"
    >
      <LogOut size={19} />
    </button>
  );
}
