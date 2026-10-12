"use client";

import { useEffect, useSyncExternalStore } from "react";

import type { ShopSlot, YumiOutfit } from "./catalog";

/* =========================================================
   What Yumi has on, everywhere she appears

   The shop writes it; the homes' Yumi reads it. Kept here, outside either
   screen, so buying a scarf and going home shows her in it without a second
   request, and so the home screen does not wait on the shop's database to
   draw her.

   A copy is kept on the device, so a reader who dressed her yesterday sees
   her dressed from the first frame today rather than changing clothes once
   the network answers. The server copy wins as soon as it arrives.

   This sits on the home screen's first render, so it carries nothing it
   does not need there: not the catalogue (the 3D chunk checks each piece
   when it puts it on, lib/yumi3d/outfit.ts) and not the database client,
   which arrives with the request that needs it.
   ========================================================= */

const STORAGE_KEY = "exchange-notes:yumi-outfit";

const SLOTS: readonly ShopSlot[] = ["material", "pupil", "eyewear", "head", "neck", "pin", "mouth", "charm"];

let outfit: YumiOutfit = {};
let hydrated = false;
let fetched = false;
const listeners = new Set<() => void>();

/** Slots and strings only; whether a piece exists is the 3D chunk's to check. */
function readOutfit(value: unknown): YumiOutfit {
  const next: YumiOutfit = {};
  if (!value || typeof value !== "object") return next;
  for (const slot of SLOTS) {
    const id = (value as Record<string, unknown>)[slot];
    if (typeof id === "string" && id) next[slot] = id;
  }
  return next;
}

function same(a: YumiOutfit, b: YumiOutfit) {
  return SLOTS.every(slot => (a[slot] ?? null) === (b[slot] ?? null));
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    outfit = raw ? readOutfit(JSON.parse(raw)) : {};
  } catch {
    outfit = {};
  }
}

export function getWornOutfit(): YumiOutfit {
  hydrate();
  return outfit;
}

const NOTHING: YumiOutfit = {};
function getServerWornOutfit(): YumiOutfit {
  return NOTHING;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function setWornOutfit(next: YumiOutfit) {
  hydrate();
  const clean = readOutfit(next);
  if (same(clean, outfit)) return;
  outfit = clean;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // Private browsing or a full disk: the server copy still holds it.
  }
  for (const listener of listeners) listener();
}

/** Once per session, ask the server what she is wearing. Failures change nothing. */
function refreshWornOutfit() {
  if (fetched || typeof window === "undefined") return;
  fetched = true;
  void Promise.all([import("./wallet"), import("@/lib/supabase/client")])
    .then(([{ createSupabaseWallet }, { createClient }]) => createSupabaseWallet(createClient()).load())
    .then(state => setWornOutfit(state.outfit))
    .catch(() => {
      // The shop is not open yet, the network is away, or there is no
      // session (a review screen, a test): she wears what the device kept.
    });
}

/**
 * What Yumi has on, for a screen that draws her. The identity only changes
 * when the outfit does, so a frame loop can compare it cheaply and dress her
 * only when something changed.
 */
export function useWornOutfit(): YumiOutfit {
  const worn = useSyncExternalStore(subscribe, getWornOutfit, getServerWornOutfit);
  useEffect(() => { refreshWornOutfit(); }, []);
  return worn;
}
