"""
Generates real-voice audio for the 37 Zhuyin (Bopomofo) sounds in
lib/pronunciation/zhuyinSounds.ts, replacing the browser-TTS fallback that
the Pronunciation Lab currently uses for those cards.

Run this on your own machine (it needs normal internet access — it can't
run inside the sandboxed dev environment). It uses edge-tts, a free,
no-API-key wrapper around Microsoft Edge's neural text-to-speech voices —
noticeably better quality than what most phones/browsers have installed
locally, and this only needs to run once: the output files are committed
as static assets, so nothing calls out to any service at runtime.

Setup:
    pip install edge-tts

Usage:
    python3 scripts/generate-zhuyin-audio.py

Output:
    public/audio/zhuyin/<id>.mp3 — one file per sound, e.g. b.mp3, p.mp3,
    eh-final.mp3 — filenames match each ZhuyinSound's `id` exactly, which
    is what app/(protected)/pronunciation/page.tsx already expects
    (zhuyinSounds.ts now has `audio: "/audio/zhuyin/<id>.mp3"` set on every
    entry). Nothing else needs to change once these files exist — the
    Pronunciation Lab's speaker button already tries this path first and
    only falls back to speech synthesis if the file is missing.

If a word sounds off, or you'd rather use a different voice, just tweak
VOICE below and re-run — run `edge-tts --list-voices | grep zh-TW` to see
every available Taiwan Mandarin option.
"""

import asyncio
import os

import edge_tts

# zh-TW-HsiaoChenNeural (female) is a solid default for standalone
# phoneme clarity. zh-TW-YunJheNeural (male) is the other Taiwan Mandarin
# neural voice Edge ships.
VOICE = "zh-TW-HsiaoChenNeural"

# Slightly slower than natural speech reads more clearly for an isolated
# syllable someone is trying to learn, without sounding robotic.
RATE = "-15%"

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "audio", "zhuyin")

# id -> soundText, copied from lib/pronunciation/zhuyinSounds.ts. soundText
# is the real character used for pronunciation (e.g. "玻" for "ㄅ") rather
# than the bare symbol, since a bare Zhuyin glyph isn't speakable on its
# own — this is the same "呼讀音" convention used in Taiwanese elementary
# school teaching.
SOUNDS = {
    # Initials
    "b": "玻", "p": "坡", "m": "摸", "f": "佛",
    "d": "得", "t": "特", "n": "呢", "l": "勒",
    "g": "哥", "k": "科", "h": "喝",
    "j": "基", "q": "欺", "x": "希",
    "zh": "知", "ch": "蚩", "sh": "詩", "r": "日",
    "z": "資", "c": "雌", "s": "思",
    # Medials
    "yi": "衣", "wu": "烏", "yu": "迂",
    # Finals
    "a": "啊", "o": "喔", "e": "餓", "eh-final": "耶",
    "ai": "哀", "ei": "欸", "ao": "凹", "ou": "歐",
    "an": "安", "en": "恩", "ang": "昂", "eng": "鞥",
    "er": "兒",
}


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for sound_id, text in SOUNDS.items():
        out_path = os.path.join(OUTPUT_DIR, f"{sound_id}.mp3")
        communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
        await communicate.save(out_path)
        print(f"Saved {out_path}  ({text})")

    print(f"\nDone — {len(SOUNDS)} files written to {os.path.abspath(OUTPUT_DIR)}")


if __name__ == "__main__":
    asyncio.run(main())
