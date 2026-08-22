import { redirect } from "next/navigation";

import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, exchange_id, avatar_url, native_language, learning_language, onboarding_completed, onboarding_step",
    )
    .eq("id", user.id)
    .maybeSingle();

  // Already finished onboarding (or an old account, backfilled to
  // completed) — this route has nothing left to do for them.
  if (profile?.onboarding_completed) {
    redirect("/");
  }

  // Google OAuth metadata carries the user's real name/photo, but the
  // handle_new_user trigger doesn't read it into profiles.display_name
  // (that column stays empty for OAuth sign-ins) — so the Name step falls
  // back to metadata directly rather than an empty profile field.
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metadataName =
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    "";
  const metadataAvatarUrl =
    (typeof metadata.avatar_url === "string" && metadata.avatar_url) ||
    (typeof metadata.picture === "string" && metadata.picture) ||
    null;

  return (
    <OnboardingFlow
      userId={user.id}
      initialDisplayName={profile?.display_name?.trim() || metadataName}
      initialExchangeId={profile?.exchange_id ?? ""}
      initialAvatarUrl={profile?.avatar_url ?? metadataAvatarUrl}
      initialNativeLanguage={profile?.native_language ?? null}
      initialLearningLanguage={profile?.learning_language ?? null}
      initialStep={profile?.onboarding_step ?? null}
    />
  );
}
