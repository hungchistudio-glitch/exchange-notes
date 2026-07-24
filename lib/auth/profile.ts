import type {
    SupabaseClient,
    User,
  } from "@supabase/supabase-js";
  
  function getMetadataString(
    user: User,
    keys: string[],
  ) {
    for (const key of keys) {
      const value = user.user_metadata?.[key];
  
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  
    return "";
  }
  
  export function generateDisplayName(
    user: User,
  ) {
    const metadataName = getMetadataString(user, [
      "display_name",
      "full_name",
      "name",
    ]);
  
    if (metadataName) {
      return metadataName;
    }
  
    return (
      user.email?.split("@")[0] ??
      "Exchange Notes User"
    );
  }
  
  export function generateExchangeId(
    user: User,
  ) {
    const prefix =
      (user.email ?? "user")
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 18) || "user";
  
    return `${prefix}_${user.id.replace(/-/g, "").slice(0, 6)}`;
  }
  
  export async function ensureProfile(
    supabase: SupabaseClient,
    user: User,
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
  
    if (error) {
      throw error;
    }
  
    if (data) {
      return;
    }
  
    const email =
      user.email?.trim().toLowerCase();
  
    if (!email) {
      throw new Error("Missing user email.");
    }
  
    const avatarUrl =
      getMetadataString(user, [
        "avatar_url",
        "picture",
      ]) || null;
  
    const {
      error: insertError,
    } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email,
        display_name:
          generateDisplayName(user),
        exchange_id:
          generateExchangeId(user),
        avatar_url: avatarUrl,
      });
  
    if (insertError) {
      throw insertError;
    }
  }