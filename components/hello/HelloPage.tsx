"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import { findProfileByExchangeId } from "@/lib/friends";
import { friendStanding, requestFriendship } from "@/lib/hello/friendState";
import { rememberRecentHello } from "@/lib/hello/recent";
import type { HelloLookup, HelloSense, HelloSide } from "@/lib/hello/types";
import { helloJoinPath } from "@/lib/hello/url";
import type { LanguageCode } from "@/lib/languages";
import { createClient } from "@/lib/supabase/client";

import HelloActions, { type FriendState, type HelloViewer } from "./HelloActions";
import HelloInvitation, { HelloGone, senderName } from "./HelloInvitation";
import styles from "./Hello.module.css";

/* =========================================================
   /hello/<id>, in the browser

   The hello itself arrives from the server, already readable. What this
   adds is who is looking, worked out here because it is the visitor's own
   session that may say:

     signed out       → make your own Yumi / meet the sender, via sign-in
     the sender       → it is theirs
     anyone else      → their standing with the sender, and the one button

   Until that is known the actions are left out, rather than showing a
   signed-in reader the buttons for a guest. And a signed-out visitor's
   visit is remembered on this device (lib/hello/recent.ts), so one who
   takes longer to sign up than the sign-in can carry it still finds the
   way back.
   ========================================================= */

type Resolved =
  | { kind: "guest" }
  | { kind: "own" }
  | { kind: "member"; me: string; them: string | null; friend: FriendState };

export default function HelloPage({ lookup, test }: { lookup: HelloLookup; test: boolean }) {
  const { t } = useTranslation();
  const copy = t.hello;

  if (lookup.status !== "active") {
    return (
      <HelloGone
        status={lookup.status}
        action={
          <Link className={styles.primary} href="/">
            {copy.openApp}
          </Link>
        }
      />
    );
  }

  return <ActiveHello hello={lookup.hello} test={test} />;
}

function ActiveHello({ hello, test }: { hello: Extract<HelloLookup, { status: "active" }>["hello"]; test: boolean }) {
  const [viewer, setViewer] = useState<Resolved | null>(null);
  const [sense, setSense] = useState<HelloSense>(hello.sense);
  const [retrying, setRetrying] = useState<ReadonlySet<LanguageCode>>(new Set());
  const name = senderName(hello);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          rememberRecentHello({ id: hello.id, name });
          if (!cancelled) setViewer({ kind: "guest" });
          return;
        }
        const me = session.user.id;
        const { data: mine } = await supabase.from("public_profiles").select("exchange_id").eq("id", me).maybeSingle();
        if ((mine?.exchange_id ?? "").toLowerCase() === hello.sender.exchangeId.toLowerCase()) {
          if (!cancelled) setViewer({ kind: "own" });
          return;
        }
        const them = await findProfileByExchangeId(supabase, hello.sender.exchangeId);
        if (!them) {
          if (!cancelled) setViewer({ kind: "member", me, them: null, friend: "unavailable" });
          return;
        }
        const standing = await friendStanding(supabase, me, them.id);
        if (!cancelled) setViewer({ kind: "member", me, them: them.id, friend: standing });
      } catch {
        /* Unknown is safest as a guest: nothing is sent from there. */
        if (!cancelled) setViewer({ kind: "guest" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hello.id, hello.sender.exchangeId, name]);

  const request = useCallback(async () => {
    if (viewer?.kind !== "member" || !viewer.them) return;
    const { me, them } = viewer;
    setViewer({ ...viewer, friend: "sending" });
    try {
      const standing = await requestFriendship(createClient(), me, them);
      setViewer({ kind: "member", me, them, friend: standing });
    } catch {
      setViewer({ kind: "member", me, them, friend: "failed" });
    }
  }, [viewer]);

  /* A language a visitor asked for that did not come: this time, or for good. */
  const [missingStatus, setMissingStatus] = useState<Partial<Record<LanguageCode, "failed" | "exhausted">>>({});

  const retryMissing = useCallback(
    async (language: LanguageCode) => {
      setRetrying(new Set([language]));
      let outcome: "filled" | "failed" | "exhausted" = "failed";
      try {
        const response = await fetch(`/api/hello/${encodeURIComponent(hello.id)}/fill`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ language }),
        });
        if (response.ok || response.status === 409) {
          const { side } = (await response.json()) as { side?: HelloSide };
          if (side?.text) {
            outcome = "filled";
            /* Only into the language asked for, and only if it is still the
               one missing: a late answer cannot overwrite anything. */
            setSense((current) => (current[language] ? current : { ...current, [language]: side }));
          }
        } else if (response.status === 410) {
          outcome = "exhausted";
        }
      } catch {
        /* Still missing; the button stays. */
      } finally {
        setRetrying(new Set());
        setMissingStatus((current) => {
          const next = { ...current };
          if (outcome === "filled") delete next[language];
          else next[language] = outcome;
          return next;
        });
      }
    },
    [hello.id],
  );

  const joinHref = helloJoinPath(hello.id);
  const actionsFor = (resolved: Resolved): HelloViewer => {
    /* Making their own Yumi is the app's own way in — sign-in, then Home,
       where a new reader is set up — not a trip back to this page. Meeting
       the sender returns here, where the friend button is theirs to press. */
    if (resolved.kind === "guest") return { kind: "guest", startHref: "/login", meetHref: joinHref };
    if (resolved.kind === "own") return { kind: "own", manageHref: "/invitations" };
    return {
      kind: "member",
      friend: resolved.friend,
      onRequest: () => void request(),
      chatHref: resolved.them ? `/messages/new?friend=${encodeURIComponent(resolved.them)}` : "/friends",
      friendsHref: "/friends",
    };
  };

  return (
    <HelloInvitation
      hello={{ ...hello, sense }}
      test={test}
      actions={viewer ? <HelloActions viewer={actionsFor(viewer)} name={name} /> : null}
      onRetryMissing={retryMissing}
      retrying={retrying}
      missingStatus={missingStatus}
    />
  );
}
