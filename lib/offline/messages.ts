"use client";

import { STORES, readRecord, writeRecord } from "@/lib/offline/db";

/* =========================================================
   The last messages seen, kept to read without a network

   Chi, 2026-11-10: with no signal, Messages shows the conversations already
   seen, and nothing is sent ("只看不傳"). So this keeps what the list and each
   conversation last showed — no more than the screen had, never anything
   new — and the screens read it first, then replace it with the server's
   answer when there is one.

   In the same kv store as the rest of the device's copies, so sign-out
   deletes it with them (lib/offline/forgetDevice.ts). Keyed by reader as
   well as conversation: a copy is only ever handed back to the account it
   was kept for.
   ========================================================= */

const LIST_KEY = "messages:list";
const ROOM_KEY = "messages:room";

/* A conversation keeps its newest page, the one it opens on. */
export const KEPT_MESSAGES = 100;

type Kept<T> = { key: string; userId: string; savedAt: string; value: T };

async function read<T>(key: string, userId: string): Promise<T | null> {
  try {
    const record = await readRecord<Kept<T>>(STORES.kv, key);
    return record && record.userId === userId ? record.value : null;
  } catch {
    return null;
  }
}

async function write<T>(key: string, userId: string, value: T): Promise<void> {
  try {
    await writeRecord(STORES.kv, { key, userId, savedAt: new Date().toISOString(), value });
  } catch {
    // A full or refused store only costs the offline copy.
  }
}

export function readConversationList<T>(userId: string): Promise<T | null> {
  return read<T>(`${LIST_KEY}:${userId}`, userId);
}

export function keepConversationList<T>(userId: string, list: T): Promise<void> {
  return write(`${LIST_KEY}:${userId}`, userId, list);
}

export function readConversation<T>(userId: string, conversationId: string): Promise<T | null> {
  return read<T>(`${ROOM_KEY}:${userId}:${conversationId}`, userId);
}

export function keepConversation<T>(userId: string, conversationId: string, room: T): Promise<void> {
  return write(`${ROOM_KEY}:${userId}:${conversationId}`, userId, room);
}
