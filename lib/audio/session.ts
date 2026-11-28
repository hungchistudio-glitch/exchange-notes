/* =========================================================
   The page's audio session, and the microphone (Chi, 2026-11-27)

   Safari 17+ lets a page say what its sound is for: navigator.audioSession
   .type. Two parts of the app set it, each for a good reason:
     - the interface's ticks and the games' notes say "ambient", so they
       keep to the silent switch and mix with music (lib/sound/);
     - a speaker says "playback", so a word is heard through the silent
       switch (preferPlaybackAudio in lib/speech.ts).

   Neither is a session a microphone can open in. On an iPhone the session
   becomes the system's audio category, and in ambient or playback there is
   no input at all: getUserMedia fails at once with NotAllowedError ("No
   AVAudioSessionCaptureDevice"), however the website's microphone is set.
   And the interface ticks on every press, the microphone key's own press
   included, so a reader with sounds on could never be heard: Chi set
   Safari's microphone to Allow and it still said "access is off".

   So every capture asks for "play-and-record" in the tap, before
   getUserMedia, and holds it until the capture ends; while one is open,
   the sounds and speakers leave the session alone. Afterwards it goes back
   to "auto", and the next sound asks for its own again.
   ========================================================= */

type AudioSessionType = "auto" | "playback" | "transient" | "transient-solo" | "ambient" | "play-and-record";

function session(): { type: string } | null {
  if (typeof navigator === "undefined") return null;
  return (navigator as Navigator & { audioSession?: { type: string } }).audioSession ?? null;
}

function setType(type: AudioSessionType) {
  const current = session();
  if (!current || current.type === type) return;
  try {
    current.type = type;
  } catch {
    /* A Safari that refuses this type: it keeps the one it has. */
  }
}

let captures = 0;

/** The session's type now, or null where the browser has none. */
export function audioSessionType(): string | null {
  return session()?.type ?? null;
}

/** For the sounds and speakers: ask for a type, unless a microphone is open. */
export function preferAudioSession(type: "ambient" | "playback") {
  if (captures > 0) return;
  setType(type);
}

/**
 * Call in the tap, before getUserMedia or a recogniser's start. Returns the
 * end of it; calling that more than once is harmless.
 */
export function beginCapture(): () => void {
  captures += 1;
  setType("play-and-record");
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    captures = Math.max(0, captures - 1);
    if (captures === 0) setType("auto");
  };
}

/** Ask again for the record session, for a capture already begun. */
export function reassertCapture() {
  if (captures > 0) setType("play-and-record");
}

/** Whether a capture holds the session (tests and the check-up). */
export function capturing() {
  return captures > 0;
}
