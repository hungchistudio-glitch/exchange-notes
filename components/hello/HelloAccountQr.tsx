"use client";

import { QRCodeSVG } from "qrcode.react";

import useTranslation from "@/hooks/i18n/useTranslation";
import usePageOrigin from "@/hooks/usePageOrigin";
import { APP_ORIGIN } from "@/lib/auth/canonicalOrigin";
import { friendInviteUrl } from "@/lib/friends";
import { fill } from "@/lib/i18n/format";
import { isLiveOrigin } from "@/lib/hello/url";
import { normalizeExchangeId } from "@/lib/utils";

import styles from "./Hello.module.css";

/*
 * The sharer's own account code, on their hello (Chi: "加入個人帳號QR code").
 *
 * The same friend code the friends screen shows (/invite/<Exchange ID>),
 * for a hello held up on one screen and scanned with another phone. It
 * opens the friends screen with the sharer filled in, through sign-in if
 * need be — and stops there: the request is still the scanner's own button
 * to press (Chi's hello brief, §10).
 *
 * The Exchange ID is the sharer's current one (get_yumi_hello reads it
 * from their profile), so an ID they have since given up never sends
 * anyone to whoever took it. A standard code on its own white panel in
 * both looks, drawn only once the page knows its address: the live site's
 * one domain, or a test build's own.
 */
export default function HelloAccountQr({ exchangeId, name }: { exchangeId: string; name: string }) {
  const { t } = useTranslation();
  const origin = usePageOrigin();
  const id = normalizeExchangeId(exchangeId);
  if (!id || !origin) return null;

  const url = friendInviteUrl(id, isLiveOrigin(origin) ? APP_ORIGIN : origin);
  const caption = fill(t.hello.accountQr, { name });

  return (
    <section className={styles.accountQr} aria-label={caption}>
      <div className={styles.accountQrCode}>
        <QRCodeSVG value={url} size={112} marginSize={4} level="M" bgColor="#ffffff" fgColor="#111111" aria-hidden="true" />
      </div>
      <div className={styles.accountQrText}>
        <p className={styles.accountQrCaption}>{caption}</p>
        {/* Without a nickname the caption already names them by ID. */}
        {name === `@${id}` ? null : <p className={styles.accountQrId}>@{id}</p>}
      </div>
    </section>
  );
}
