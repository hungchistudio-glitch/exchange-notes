"use client";

import Link from "next/link";
import { useState } from "react";

import { FIXTURE_LIBRARY, FIXTURE_LONG_PHRASE, FIXTURE_STAR_COSMIC } from "@/lib/hello/fixtures";
import type { LanguageCode } from "@/lib/languages";

import HelloActions, { type FriendState, type HelloViewer } from "./HelloActions";
import HelloInvitation, { senderName } from "./HelloInvitation";
import HelloShareReview from "./HelloShareReview";

/* =========================================================
   The hello, with fixtures (app/hello-review)

   A banner on top says what this is, so a sample is never taken for a
   reader's invitation. The friend button changes state in memory only, so
   each state can be looked at; the missing language's retry pretends to
   fail after a moment rather than reaching anything.
   ========================================================= */

const VIEWER_STATES: readonly string[] = ["guest", "own", "none", "sent", "incoming", "friends", "failed"];

export default function HelloReview({
  fixture,
  viewer,
  view,
}: {
  fixture: "library" | "star" | "long";
  viewer: string;
  view: "page" | "share";
}) {
  const hello = fixture === "star" ? FIXTURE_STAR_COSMIC : fixture === "long" ? FIXTURE_LONG_PHRASE : FIXTURE_LIBRARY;
  const [friend, setFriend] = useState<FriendState>(
    (["none", "sent", "incoming", "friends", "failed"].includes(viewer) ? viewer : "none") as FriendState,
  );
  const [retrying, setRetrying] = useState<ReadonlySet<LanguageCode>>(new Set());

  const viewerState: HelloViewer =
    viewer === "guest" || !VIEWER_STATES.includes(viewer)
      ? { kind: "guest", startHref: "/hello-review", meetHref: "/hello-review" }
      : viewer === "own"
        ? { kind: "own", manageHref: "/hello-review" }
        : {
            kind: "member",
            friend,
            onRequest: () => {
              setFriend("sending");
              window.setTimeout(() => setFriend("sent"), 700);
            },
            chatHref: "/hello-review",
            friendsHref: "/hello-review",
          };

  const banner = (
    <div
      style={{
        marginBottom: "0.75rem",
        padding: "0.625rem 0.875rem",
        borderRadius: "0.875rem",
        background: "#fff4d6",
        color: "#3d2f0e",
        fontSize: "0.8125rem",
        lineHeight: 1.5,
      }}
    >
      <strong>Fixture · 範例資料</strong> — not a real reader or invitation. Sample:{" "}
      <Link href="/hello-review?fixture=library">library</Link> ·{" "}
      <Link href="/hello-review?fixture=star">star (Cosmic, Italian missing)</Link> ·{" "}
      <Link href="/hello-review?fixture=long">long phrase</Link>. Visitor:{" "}
      {VIEWER_STATES.map((state, index) => (
        <span key={state}>
          {index ? " · " : ""}
          <Link href={`/hello-review?fixture=${fixture}&viewer=${state}`}>{state}</Link>
        </span>
      ))}
      . Sharer: <Link href={`/hello-review?fixture=${fixture}&view=share`}>share step</Link> ·{" "}
      <a href={`/hello-review/og?fixture=${fixture}`}>link preview</a>
    </div>
  );

  if (view === "share") return <HelloShareReview key={fixture} hello={hello} banner={banner} />;

  return (
    <HelloInvitation
      key={`${fixture}-${viewer}`}
      hello={hello}
      banner={banner}
      test
      actions={<HelloActions viewer={viewerState} name={senderName(hello)} />}
      retrying={retrying}
      onRetryMissing={(language) => {
        setRetrying(new Set([language]));
        window.setTimeout(() => setRetrying(new Set()), 900);
      }}
    />
  );
}
