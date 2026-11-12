/* =========================================================
   The voice, as the screen's liquid hears it (Chi, 2026-11-12)

   While the reader speaks, the sea at the bottom of the screen
   (components/voice/VoiceSea.tsx) follows what the microphone hears:
   - level: how loud, 0–1, as the voice search's own meter reads it;
   - low:   the low voice (about 90–400 Hz), which swells the sea slowly;
   - high:  the hiss and bite of consonants (about 2–7 kHz), which sets off
            fine, quick ripples.

   Whoever is metering writes here every frame; the sea reads it on its
   own frame. One plain object rather than React state or events: sixty
   updates a second through React would be the least smooth thing on the
   screen, and only one microphone is ever open at a time.
   ========================================================= */

export type VoiceSignal = {
  level: number;
  low: number;
  high: number;
};

export const voiceSignal: VoiceSignal = { level: 0, low: 0, high: 0 };

/** Silence: the sea calms once nothing is metering. */
export function resetVoiceSignal() {
  voiceSignal.level = 0;
  voiceSignal.low = 0;
  voiceSignal.high = 0;
}

/**
 * Decibels onto 0–1, quick to rise and slow to fall, like a VU needle: the
 * voice search's meter, shared so the two microphones read alike.
 */
export function levelFromRms(rms: number, previous: number) {
  const db = 20 * Math.log10(Math.max(rms, 1e-5));
  const target = Math.min(1, Math.max(0, (db + 58) / 40));
  return target > previous ? previous + (target - previous) * 0.55 : previous * 0.9 + target * 0.1;
}

/*
 * A band's share of the analyser's spectrum, 0–1. getByteFrequencyData maps
 * -100 dB to 0 and -30 dB to 255; a quiet room sits near a third of that,
 * so the bottom of the range is cut away and the rest stretched.
 */
const FLOOR = 0.32;
const SPAN = 0.42;

/** Reads the low and high bands off one analyser, each frame, into voiceSignal. */
export function createBandReader(analyser: AnalyserNode) {
  /* A meter that cannot read a spectrum still gives the sea its loudness. */
  if (typeof analyser.getByteFrequencyData !== "function") {
    return { read(level: number) { voiceSignal.level = level; } };
  }
  const bins = new Uint8Array(analyser.frequencyBinCount || analyser.fftSize / 2);
  const hz = (analyser.context?.sampleRate || 48000) / analyser.fftSize;
  const bin = (frequency: number) => Math.min(bins.length - 1, Math.max(1, Math.round(frequency / hz)));
  const low = [bin(90), bin(400)] as const;
  const high = [bin(2000), bin(7000)] as const;
  const share = ([from, to]: readonly [number, number]) => {
    let sum = 0;
    for (let i = from; i <= to; i += 1) sum += bins[i];
    const mean = sum / ((to - from + 1) * 255);
    return Math.min(1, Math.max(0, (mean - FLOOR) / SPAN));
  };
  /* Bands rise as fast as the level does and fall a little slower, so a
     consonant's ripple outlives the frame it was heard in. */
  const follow = (now: number, target: number) => (target > now ? now + (target - now) * 0.5 : now * 0.86 + target * 0.14);

  return {
    read(level: number) {
      analyser.getByteFrequencyData(bins);
      voiceSignal.level = level;
      voiceSignal.low = follow(voiceSignal.low, share(low));
      voiceSignal.high = follow(voiceSignal.high, share(high));
    },
  };
}

/**
 * A meter of its own, for a recorder that has none (the Pronunciation Lab's
 * Speak): an analyser on the stream, read every frame into voiceSignal until
 * stopped. Never throws; where the browser will not meter, the sea just
 * breathes on its own.
 */
export function meterStream(context: AudioContext, stream: MediaStream): () => void {
  let frame = 0;
  let source: MediaStreamAudioSourceNode | null = null;
  try {
    source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const bands = createBandReader(analyser);
    let level = 0;
    const tick = () => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
      level = levelFromRms(Math.sqrt(sum / samples.length), level);
      bands.read(level);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  } catch {
    /* No meter: the sea breathes without one. */
  }
  return () => {
    cancelAnimationFrame(frame);
    try { source?.disconnect(); } catch { /* Already gone. */ }
    resetVoiceSignal();
  };
}
