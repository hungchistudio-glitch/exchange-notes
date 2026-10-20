"use client";

/* =========================================================
   Speech through an iPhone's silent switch, on the hello page

   With the ringer switched to silent, iOS mutes Safari's speech synthesis:
   the speaker on a hello turns, finishes, and nothing is heard (Chi,
   2026-10-19, on an iPhone opened from Messages; switching silent off
   brought the sound back). The page cannot tell that it was muted.

   Two things are tried in the tap itself, before the word is spoken, both
   of which ask WebKit to treat this page's sound as playback — which the
   silent switch does not mute — rather than as ambient sound, which it does:

     - the Audio Session API (Safari 17 and later): navigator.audioSession
       .type = "playback";
     - a twentieth of a second of silence through an <audio> element, which
       older versions put into the playback category.

   Whether speech synthesis follows either is not documented, so this is
   an experiment, kept to the hello page until a real iPhone has shown it
   works; the page also says, once, to check the silent switch. Only on
   Apple touch devices: a Mac would show the silent clip in Now Playing.
   ========================================================= */

/** An iPhone or iPad, including an iPad that reports itself as a Mac. */
export function isAppleTouchDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const agent = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1);
}

/** 400 samples of 8-bit silence at 8 kHz, as a WAV file. */
function silentWav(): Blob {
  const samples = 400;
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) bytes[offset + index] = value.charCodeAt(index);
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); /* PCM */
  view.setUint16(22, 1, true); /* mono */
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, "data");
  view.setUint32(40, samples, true);
  bytes.fill(0x80, 44);
  return new Blob([bytes], { type: "audio/wav" });
}

let silence: HTMLAudioElement | null = null;

/**
 * Ask for playback audio. Call inside the tap, before speaking: an <audio>
 * element may only start from a user gesture. Never throws; at worst it
 * changes nothing.
 */
export function preferPlaybackAudio(): void {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session && session.type !== "playback") session.type = "playback";
  } catch {
    /* An older Safari: the clip below is the other way in. */
  }
  try {
    if (!silence) {
      silence = new Audio(URL.createObjectURL(silentWav()));
      silence.setAttribute("playsinline", "");
      silence.preload = "auto";
    }
    try {
      silence.currentTime = 0;
    } catch {
      /* Not seekable yet: it plays from the start anyway. */
    }
    void silence.play()?.catch(() => undefined);
  } catch {
    /* No media playback here: nothing to change. */
  }
}
