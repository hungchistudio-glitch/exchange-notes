import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import ProtectedNav from "@/components/foundation/layout/ProtectedNav";
import { createClient } from "@/lib/supabase/server";

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedLayout({
  children,
}: ProtectedLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      {children}
      <ProtectedNav />
    </>
  );
}
