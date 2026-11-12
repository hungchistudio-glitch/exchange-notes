import { createHash, randomBytes } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

/* =========================================================
   Yumi Pocket Lookup's share-extension keys (Chi, 2026-11-12: 專用小鑰匙)

   The share extension runs outside the app, where the app's sign-in cannot
   reach, and it must not borrow that sign-in: refreshing it from the
   extension would rotate the refresh token under the app and sign the
   reader out. So the app asks for a key of the extension's own:

   - It opens two doors and no others: a lookup (/api/classify-text) and a
     save (/api/pocket/save). Every other route still wants the sign-in.
   - It is random, long, and stored only as its SHA-256: the database
     cannot hand a usable key back, and neither can a leaked copy of it.
   - It lives on the phone in a Keychain group only Exchange Notes and its
     extension can read, and Settings can revoke it; a revoked key stops at
     once.
   - A reader holds a few at most (one per phone, give or take): issuing
     past MAX_ACTIVE_KEYS revokes the oldest.

   Only the server touches the table (public.pocket_keys has RLS on and no
   policies); this file is that server side.
   ========================================================= */

export const POCKET_KEY_PREFIX = "enpk_";
/** 32 random bytes, base64url: 43 characters after the prefix. */
const KEY_BYTES = 32;
export const MAX_ACTIVE_KEYS = 5;
/** last_used_at is written at most this often per key. */
const TOUCH_EVERY_MS = 60 * 60 * 1000;

export type PocketKeyRow = {
  id: string;
  user_id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export function generatePocketKey() {
  return POCKET_KEY_PREFIX + randomBytes(KEY_BYTES).toString("base64url");
}

export function hashPocketKey(key: string) {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

/** The key in `Authorization: Bearer enpk_…`, if that is what was sent. */
export function pocketKeyFrom(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer (enpk_[A-Za-z0-9_-]{43})$/.exec(header.trim());
  return match ? match[1] : null;
}

/** A device's name for the key, as Settings will show it. */
export function cleanLabel(value: unknown) {
  const label = typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 40) : "";
  return label || "iPhone";
}

/**
 * Whose key this is, or null for none, a malformed one or a revoked one.
 * Needs the service client: the table is closed to everyone else.
 */
export async function userForPocketKey(service: SupabaseClient, key: string): Promise<string | null> {
  const { data, error } = await service
    .from("pocket_keys")
    .select("id, user_id, last_used_at, revoked_at")
    .eq("key_hash", hashPocketKey(key))
    .maybeSingle();

  if (error || !data || data.revoked_at) return null;

  const lastUsed = data.last_used_at ? Date.parse(data.last_used_at) : 0;
  if (Date.now() - lastUsed > TOUCH_EVERY_MS) {
    // Best effort: a key that cannot be touched still works.
    await service
      .from("pocket_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id)
      .then(() => undefined, () => undefined);
  }

  return data.user_id as string;
}

/** Issues a new key for this reader; the plain key exists only in the answer. */
export async function issuePocketKey(service: SupabaseClient, userId: string, label: string) {
  const key = generatePocketKey();
  const { data, error } = await service
    .from("pocket_keys")
    .insert({ user_id: userId, key_hash: hashPocketKey(key), label })
    .select("id, created_at")
    .single();

  if (error || !data) throw error ?? new Error("Could not issue a pocket key.");

  // Past the cap, the oldest go.
  const { data: active } = await service
    .from("pocket_keys")
    .select("id")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  const surplus = (active ?? []).slice(MAX_ACTIVE_KEYS).map((row) => row.id as string);
  if (surplus.length) {
    await service
      .from("pocket_keys")
      .update({ revoked_at: new Date().toISOString() })
      .in("id", surplus);
  }

  return { id: data.id as string, key, createdAt: data.created_at as string };
}

/** This reader's keys still in force, for Settings. */
export async function listPocketKeys(service: SupabaseClient, userId: string) {
  const { data, error } = await service
    .from("pocket_keys")
    .select("id, label, created_at, last_used_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Revokes one of this reader's keys; a key that is not theirs is untouched. */
export async function revokePocketKey(service: SupabaseClient, userId: string, id: string) {
  const { error } = await service
    .from("pocket_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (error) throw error;
}
