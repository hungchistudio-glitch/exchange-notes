import { ImageResponse } from "next/og";

import { getLanguage } from "@/lib/languages";

import type { HelloLookup } from "./types";

/*
 * The picture a chat app shows under a hello's link
 * (app/hello/[id]/opengraph-image.tsx): Yumi as she was shared, the
 * sender's name and the two words, each labelled in its own language's
 * name — a link preview is read by whoever receives it, whose interface
 * language this server cannot know.
 *
 * A hello that is off or never existed gets the plain card, with nothing
 * of the hello on it. Cached for a minute at most here, so turning one off
 * reaches new previews quickly; what another app has already fetched and
 * kept, the management screen says it cannot take back.
 *
 * Fonts come from Google Fonts with `text=`, so only the glyphs this card
 * draws are downloaded (the 500KB limit, and CJK families are large). A
 * font or picture that will not load leaves the card drawn without it
 * rather than failing the preview.
 */

export const HELLO_OG_ALT = "Exchange Notes · Yumi";
export const HELLO_OG_SIZE = { width: 1200, height: 630 };

const CACHE = { "cache-control": "public, max-age=60, s-maxage=60" };

async function loadFont(text: string, weight: 500 | 700): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@${weight}&text=${encodeURIComponent(text)}`,
      { signal: AbortSignal.timeout(4000) },
    ).then((response) => (response.ok ? response.text() : ""));
    const source = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!source) return null;
    const font = await fetch(source, { signal: AbortSignal.timeout(4000) });
    return font.ok ? await font.arrayBuffer() : null;
  } catch {
    return null;
  }
}

async function loadPoster(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!response.ok || response.headers.get("content-type")?.split(";")[0] !== "image/png") return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

const LOOKS = {
  standard: { page: "#efe8da", paper: "#fbf7ee", ink: "#1c1a16", soft: "rgba(28,26,22,0.62)", brass: "#a8843c" },
  "yumi-cosmic": { page: "#0a0f1f", paper: "#121a33", ink: "#f2efe8", soft: "rgba(242,239,232,0.7)", brass: "#d6b26a" },
} as const;

function fonts(medium: ArrayBuffer | null, bold: ArrayBuffer | null) {
  return [
    ...(medium ? [{ name: "Noto Sans TC", data: medium, weight: 500 as const, style: "normal" as const }] : []),
    ...(bold ? [{ name: "Noto Sans TC", data: bold, weight: 700 as const, style: "normal" as const }] : []),
  ];
}

export async function helloOgImage(lookup: HelloLookup): Promise<ImageResponse> {

  if (lookup.status !== "active") {
    const look = LOOKS.standard;
    const text = "EXCHANGE NOTES · YUMI";
    const bold = await loadFont(text, 700);
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: look.page,
            color: look.brass,
            fontFamily: "Noto Sans TC",
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: 6,
          }}
        >
          {text}
        </div>
      ),
      { ...HELLO_OG_SIZE, fonts: fonts(null, bold), headers: CACHE },
    );
  }

  const { hello } = lookup;
  const look = LOOKS[hello.yumi.mode];
  /* Who it is from, by the ID no one else can hold, beside any nickname. */
  const name = hello.sender.name ? `${hello.sender.name} · @${hello.sender.exchangeId}` : `@${hello.sender.exchangeId}`;
  const sides = hello.pair.map((language) => ({
    language,
    label: getLanguage(language).endonym,
    text: hello.sense[language]?.text ?? "—",
  }));
  const header = "EXCHANGE NOTES · YUMI";
  const mediumText = `${header}${name}${sides.map((side) => side.label).join("")}`;
  const boldText = sides.map((side) => side.text).join("");
  const [medium, bold, poster] = await Promise.all([
    loadFont(mediumText, 500),
    loadFont(boldText, 700),
    loadPoster(hello.yumi.posterUrl),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: look.page,
          padding: 32,
          fontFamily: "Noto Sans TC",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            background: look.paper,
            borderRadius: 40,
            padding: poster ? "40px 56px 40px 24px" : "40px 72px",
            gap: 24,
          }}
        >
          {/* Without her picture (it failed to take or load), the words take the card rather than an empty frame. */}
          {poster ? (
            <div style={{ width: 480, height: 480, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- satori draws it; the card's alt is the image's own */}
              <img src={poster} width={480} height={480} style={{ width: 480, height: 480 }} />
            </div>
          ) : null}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div style={{ display: "flex", color: look.brass, fontSize: 22, fontWeight: 500, letterSpacing: 4 }}>{header}</div>
            <div style={{ display: "flex", marginTop: 14, color: look.soft, fontSize: 28, fontWeight: 500, wordBreak: "break-all" }}>
              {name}
            </div>
            {sides.map((side) => (
              <div key={side.language} style={{ display: "flex", flexDirection: "column", marginTop: 30 }}>
                <div style={{ display: "flex", color: look.brass, fontSize: 22, fontWeight: 500 }}>{side.label}</div>
                <div
                  style={{
                    display: "flex",
                    color: look.ink,
                    fontSize: side.text.length > 14 ? 52 : 72,
                    fontWeight: 700,
                    lineHeight: 1.1,
                    marginTop: 4,
                  }}
                >
                  {side.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...HELLO_OG_SIZE, fonts: fonts(medium, bold), headers: CACHE },
  );
}
