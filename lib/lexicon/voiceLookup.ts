"use client";

import type { VoiceAudioOutcome } from "@/hooks/useVoiceInput";

/*
 * A recording, turned into the text that was said.
 *
 * One function for the three search surfaces, which used to carry three
 * copies of this fetch and three opinions about what a failure meant. The
 * answer is text and nothing more: what it means is the lookup's job, the
 * same lookup a typed sentence gets, so speaking and typing a sentence
 * produce the same card.
 */

export type TranscribedSpeech =
  | { outcome: "handled"; text: string }
  | { outcome: Exclude<VoiceAudioOutcome, "handled"> };

function fileNameFor(audio: Blob) {
  const type = audio.type.split(";")[0];
  if (type === "audio/mp4" || type === "audio/x-m4a") return "speech.m4a";
  if (type === "audio/ogg") return "speech.ogg";
  if (type === "audio/wav") return "speech.wav";
  return "speech.webm";
}

/* The route's own ceiling is 45 seconds; past that nothing is coming. */
const CLIENT_TIMEOUT_MS = 46_000;

export async function transcribeSpeech(audio: Blob): Promise<TranscribedSpeech> {
  const body = new FormData();
  body.append("audio", audio, fileNameFor(audio));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const response = await fetch("/api/voice-lookup", {
      method: "POST",
      body,
      signal: controller.signal,
    });

    if (response.status === 429) return { outcome: "limit" };
    if (!response.ok) return { outcome: "unavailable" };

    const heard = (await response.json()) as {
      heard?: boolean;
      text?: string;
      failed?: boolean;
    };

    // An unconfident answer comes back as heard: false, and nothing is put
    // in the field. A word invented from silence would be looked up, saved
    // and studied, and it would be nobody's word.
    if (heard.heard && heard.text?.trim()) {
      return { outcome: "handled", text: heard.text.trim() };
    }

    return { outcome: heard.failed ? "unavailable" : "unheard" };
  } catch {
    // No connection, or no answer in time. The caller falls back to
    // whatever the browser heard.
    return { outcome: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}
