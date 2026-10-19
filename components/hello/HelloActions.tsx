"use client";

import Link from "next/link";

import useTranslation from "@/hooks/i18n/useTranslation";
import { fill } from "@/lib/i18n/format";

import styles from "./Hello.module.css";

/* =========================================================
   What a visitor can do next

   Depends only on who is looking, and says only what is true:

     guest     make their own Yumi, or meet the sender — both through
               sign-in, which returns here; nothing is sent on the way
     own       it is theirs: open the app, or manage their invitations
     member    one explicit button sends a friend request; if one is
               already waiting either way, or they are already friends,
               it says so instead of sending another

   A friend request is never sent by opening the page, scanning a code or
   signing in — only by the button (Chi's hello brief, §10).
   ========================================================= */

/* "unavailable": the sender's account is gone or cannot be reached — no
   button, rather than one that fails. */
export type FriendState = "none" | "sending" | "sent" | "incoming" | "friends" | "failed" | "unavailable";

export type HelloViewer =
  | { kind: "guest"; startHref: string; meetHref: string }
  | { kind: "own"; manageHref: string }
  | { kind: "member"; friend: FriendState; onRequest: () => void; chatHref: string; friendsHref: string };

export default function HelloActions({ viewer, name }: { viewer: HelloViewer; name: string }) {
  const { t } = useTranslation();
  const copy = t.hello;

  if (viewer.kind === "guest") {
    return (
      <>
        <Link className={styles.primary} href={viewer.startHref}>
          {copy.createYours}
        </Link>
        <Link className={styles.secondary} href={viewer.meetHref}>
          {fill(copy.meet, { name })}
        </Link>
      </>
    );
  }

  if (viewer.kind === "own") {
    return (
      <>
        <p className={styles.status}>{copy.own}</p>
        <Link className={styles.primary} href={viewer.manageHref}>
          {copy.manageTitle}
        </Link>
        <Link className={styles.secondary} href="/home">
          {copy.openApp}
        </Link>
      </>
    );
  }

  const { friend } = viewer;

  return (
    <>
      {friend === "none" || friend === "sending" || friend === "failed" ? (
        <button
          type="button"
          className={styles.primary}
          onClick={viewer.onRequest}
          disabled={friend === "sending"}
        >
          {friend === "sending" ? copy.adding : friend === "failed" ? copy.tryAgain : copy.addFriend}
        </button>
      ) : null}

      <p className={styles.status} role="status">
        {friend === "sent"
          ? fill(copy.requestSent, { name })
          : friend === "incoming"
            ? fill(copy.requestIncoming, { name })
            : friend === "friends"
              ? copy.alreadyFriends
              : friend === "failed"
                ? copy.friendFailed
                : ""}
      </p>

      {friend === "incoming" ? (
        <Link className={styles.primary} href={viewer.friendsHref}>
          {copy.respond}
        </Link>
      ) : null}
      {friend === "friends" ? (
        <Link className={styles.primary} href={viewer.chatHref}>
          {copy.openChat}
        </Link>
      ) : null}

      <Link className={styles.secondary} href="/home">
        {copy.openApp}
      </Link>
    </>
  );
}
