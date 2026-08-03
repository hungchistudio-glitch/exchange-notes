import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

// A maskable variant of app/api/icon/route.tsx's artwork: the background
// fills the canvas edge-to-edge with no pre-rounded corners (a maskable
// icon must be opaque all the way to the edge — the OS applies its own
// circle/squircle/rounded-square crop on top, and any transparency or
// self-rounding shows through as a visible seam). The logo strokes
// themselves already sit within the recommended safe zone (an ~80%-
// diameter centered circle), so no extra scaling is needed — only the
// background treatment changes.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const size = Number(searchParams.get("size")) || 512;

  return new ImageResponse(
    (
      <svg width={size} height={size} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="400" height="400" fill="#f0efec" />
        <path d="M 300,70 Q 110,70 100,180" fill="none" stroke="#111111" strokeWidth="52" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 100,180 Q 110,320 300,320" fill="none" stroke="#111111" strokeWidth="52" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 100,180 L 250,180" fill="none" stroke="#111111" strokeWidth="52" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="285" cy="180" r="40" fill="#f0efec" stroke="#111111" strokeWidth="12" />
        <circle cx="294" cy="172" r="14" fill="#111111" />
        <circle cx="300" cy="166" r="5" fill="#f0efec" />
      </svg>
    ),
    { width: size, height: size }
  );
}
