"use client";

import { useEffect, useState } from "react";

import { captureYumiPoster } from "@/lib/hello/poster";
import type { HelloSnapshot } from "@/lib/hello/types";
import { helloShareUrl } from "@/lib/hello/url";

import HelloShareSheet from "./HelloShareSheet";

/*
 * The share step with a fixture (app/hello-review?view=share): Yumi's
 * picture is really taken on this device, the same way making a hello
 * takes it, and the shared image is really composed — only nothing is
 * uploaded and no hello exists.
 */
export default function HelloShareReview({ hello, banner }: { hello: HelloSnapshot; banner: React.ReactNode }) {
  const [poster, setPoster] = useState<{ blob: Blob | null; ms: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const start = performance.now();
    void captureYumiPoster(hello.yumi.outfit, hello.yumi.mode).then((blob) => {
      if (!cancelled) setPoster({ blob, ms: Math.round(performance.now() - start) });
    });
    return () => {
      cancelled = true;
    };
  }, [hello]);

  const { url } = helloShareUrl(hello.id, typeof window === "undefined" ? "" : window.location.origin);

  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 py-6">
      {banner}
      {poster ? (
        <>
          <p data-poster-ms={poster.ms} className="text-[0.75rem] text-ink-faint">
            Poster: {poster.blob ? `${Math.round(poster.blob.size / 1024)} KB in ${poster.ms} ms` : "capture failed"}
          </p>
          <HelloShareSheet hello={hello} url={url} test poster={poster.blob} />
        </>
      ) : (
        <p className="text-[0.875rem] text-ink-soft">Taking Yumi’s picture…</p>
      )}
    </main>
  );
}
