"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import { isHelloId } from "@/lib/hello/url";
import { createClient } from "@/lib/supabase/client";

import { HelloGone } from "./HelloInvitation";
import styles from "./Hello.module.css";

/*
 * The 404 for a hello (app/a-word-to-invite-you/[id]/not-found.tsx): one
 * that was turned off, or one that was never there.
 *
 * A not-found file is given no props, so the server cannot say which; the
 * id is in the address, and get_yumi_hello answers anyone with only
 * "revoked" for one that is off — nothing more of it. Until it answers,
 * the sheet says it is loading rather than guessing one and switching.
 */
export default function HelloNotFound() {
  const { t } = useTranslation();
  const copy = t.hello;
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [status, setStatus] = useState<"checking" | "revoked" | "missing">(() =>
    isHelloId(id) ? "checking" : "missing",
  );

  useEffect(() => {
    if (!isHelloId(id)) return;
    let cancelled = false;
    createClient()
      .rpc("get_yumi_hello", { p_id: id })
      .then(
        ({ data }) => {
          if (!cancelled) setStatus((data as { status?: string } | null)?.status === "revoked" ? "revoked" : "missing");
        },
        () => {
          if (!cancelled) setStatus("missing");
        },
      );
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (status !== "checking") document.title = status === "revoked" ? copy.revokedTitle : copy.missingTitle;
  }, [copy.missingTitle, copy.revokedTitle, status]);

  return (
    <HelloGone
      status={status}
      action={
        <Link className={styles.primary} href="/">
          {copy.openApp}
        </Link>
      }
    />
  );
}
