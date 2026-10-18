"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import styles from "@/components/auth/GoogleIdentityButton.module.css";
import useTranslation from "@/hooks/i18n/useTranslation";
import { track } from "@/lib/analytics/track";
import {
  createSignInNonce,
  getGoogleClientId,
  googleButtonLocale,
  loadGoogleIdentity,
  type GoogleCredentialResponse,
  type SignInNonce,
} from "@/lib/auth/googleIdentity";
import {
  GOOGLE_LOGIN_PATH,
  isInstalledApp,
  rememberRedirectNonce,
} from "@/lib/auth/googleRedirect";
import { getInterfaceLanguageMeta } from "@/lib/languages";

/*
 * The Supabase client, fetched when it is first needed rather than shipped
 * with the login page.
 *
 * It is the largest thing this screen would otherwise load — around 220KB of
 * script, most of it realtime, storage and database code that signing in
 * never touches — and it was parsed before the page could hydrate, which is
 * to say before the Google button could even start loading. The popup flow
 * asks for it as soon as the button is up, so it is long in the cache by the
 * time anyone has picked an account. The installed app's redirect flow signs
 * in on the server and never needs it at all.
 */
function loadSupabase() {
  return import("@/lib/supabase/client");
}

/**
 * Sign in with Google, with the app's name on the consent screen.
 *
 * The redirect flow sends people to the Supabase project's own host, so the
 * name they read before handing over their identity is a random project ref.
 * This asks Google in the browser instead and gives Supabase the signed ID
 * token, which reaches the same user, session and RLS by a route nobody has
 * to read a project ref on the way through.
 *
 * Google draws its own button. All landing-page calls lead here so ordinary
 * sign-in consistently uses the app's origin. The Supabase redirect remains
 * available only as recovery when this branded flow cannot load.
 *
 * Every way this can fail ends at that same button:
 *
 *   - no client id configured (the state this ships in)
 *   - the GSI script blocked, offline, or slow past the grace below
 *   - Google reporting an error through error_callback
 *
 * Losing the branding is a bad day. Losing the only way into the app is an
 * outage, so nothing here is allowed to be the only route in.
 */

/*
 * How long to wait for Google before giving the reader the button that
 * already works. A ceiling rather than a race, for the same reason SplashGate
 * has one: a script that never arrives must not become a screen with no way
 * off it, and a blocked request can hang far longer than anyone will wait.
 */
const GSI_GRACE_MS = 4000;

/*
 * How long to wait for Google's button to settle before showing it anyway.
 *
 * renderButton draws Google's plain button into the page straight away and
 * loads a small iframe of Google's beside it, which swaps in a personalised
 * "Continue as …" when the reader is signed in to Google. Revealing on the
 * return could show one button and then replace it with the other. The
 * reveal waits for that iframe's load instead, with this as the ceiling in
 * case it never says.
 */
const BUTTON_PAINT_CEILING_MS = 1500;

/* Google clamps the rendered button; this keeps it inside the card. */
const MIN_BUTTON_WIDTH = 200;
const MAX_BUTTON_WIDTH = 400;

type Status = "pending" | "ready" | "signing-in" | "fallback";

/**
 * Resolves once the iframe Google added to `container` has loaded, or after
 * `ceiling`, whichever comes first.
 */
function buttonPainted(container: HTMLElement, ceiling: number) {
  return new Promise<void>((resolve) => {
    let done = false;
    let frame: HTMLIFrameElement | null = null;

    const finish = () => {
      if (done) return;
      done = true;
      observer.disconnect();
      frame?.removeEventListener("load", finish);
      window.clearTimeout(timer);
      resolve();
    };

    const watch = () => {
      frame = container.querySelector("iframe");
      if (!frame) return false;
      frame.addEventListener("load", finish, { once: true });
      return true;
    };

    const observer = new MutationObserver(() => {
      if (watch()) observer.disconnect();
    });

    const timer = window.setTimeout(finish, ceiling);

    if (!watch()) observer.observe(container, { childList: true, subtree: true });
  });
}

type GoogleIdentityButtonProps = {
  /** Set when the last attempt came back refused (see app/auth/google). */
  initialError?: boolean;
};

export default function GoogleIdentityButton({
  initialError = false,
}: GoogleIdentityButtonProps) {
  const { t, language } = useTranslation();
  const copy = t.auth.login;

  /*
   * The BCP-47 tag, not the interface language's own name for itself.
   * googleButtonLocale takes what goes in <html lang>, which is what the root
   * layout renders from this same metadata — handing Google
   * "traditional-chinese" would just have it fall back to guessing.
   */
  const htmlLang = getInterfaceLanguageMeta(language).htmlLang;

  /*
   * Read once, during render, rather than discovered in the effect. It comes
   * from an inlined build-time constant, so it is the same on the server and
   * the client — which means a deployment with nothing configured renders the
   * working button on its very first pass, with no flash of a placeholder for
   * a button that was never going to arrive.
   */
  const clientId = useMemo(() => getGoogleClientId(), []);

  const [status, setStatus] = useState<Status>(
    clientId ? "pending" : "fallback",
  );
  const [errorMessage, setErrorMessage] = useState(
    initialError ? copy.genericError : "",
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const nonceRef = useRef<SignInNonce | null>(null);
  /* Set once the component is gone, so no late callback touches state. */
  const goneRef = useRef(false);

  const handleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      const credential = response.credential;
      const nonce = nonceRef.current;

      if (!credential || !nonce) {
        setErrorMessage(copy.genericError);
        return;
      }

      setStatus("signing-in");
      setErrorMessage("");

      try {
        const { createClient } = await loadSupabase();
        const supabase = createClient();

        /*
         * The raw nonce, not the hashed one. Google signed the hash into the
         * token; Supabase hashes this and checks the two match, which is what
         * stops a token minted for another session being replayed into this
         * one.
         */
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: credential,
          nonce: nonce.raw,
        });

        if (error) throw error;

        track("google_auth_success");

        /*
         * Handed to the same route the redirect flow lands on, with no code
         * in the query — it has no exchange to do, and everything else it
         * does is exactly what should happen next: the Exchange ID parked by
         * a QR code scanned while signed out, clearing that cookie, and
         * choosing between the invite and /home. That cookie is httpOnly, so
         * this is not a decision the browser could make for itself.
         *
         * A whole navigation rather than a router push, so the server reads
         * the session cookies the browser client has just written.
         */
        /*
         * The lint rule below is right about pages, and this is not one.
         * /auth/callback is a Route Handler that answers with a redirect,
         * which the client router cannot drive: it expects an RSC payload and
         * would be handed a 302. The whole navigation is also the point — it
         * is what gives the server the cookies the browser client has just
         * written.
         */
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/auth/callback");
      } catch (error) {
        // Never show the raw auth error; it names infrastructure.
        console.error(error);
        if (goneRef.current) return;
        setErrorMessage(copy.genericError);
        setStatus("ready");
      }
    },
    [copy],
  );

  useEffect(() => {
    goneRef.current = false;

    if (!clientId) return;

    /*
     * This run's own flag, alongside the component's. goneRef is reset by the
     * next run, so a run that was superseded while it waited for Google — the
     * development double-mount, or a language change mid-load — used to read
     * it as false and initialize Google a second time. In redirect mode that
     * matters: the nonce cookie and the nonce Google signs have to come from
     * the same run.
     */
    let superseded = false;

    /* The ceiling. Cleared the moment the button is actually up. */
    const grace = window.setTimeout(() => {
      if (goneRef.current) return;
      setStatus((current) => (current === "pending" ? "fallback" : current));
    }, GSI_GRACE_MS);

    void (async () => {
      try {
        const [identity, nonce] = await Promise.all([
          loadGoogleIdentity(),
          createSignInNonce(),
        ]);

        const container = containerRef.current;
        if (superseded || goneRef.current || !container) return;

        nonceRef.current = nonce;

        /*
         * An installed app goes to Google and back in its own window, where a
         * popup in a Home Screen web app opens a separate browser that does
         * not reliably hand the account back. See lib/auth/googleRedirect.
         */
        const redirect = isInstalledApp();

        if (redirect) rememberRedirectNonce(nonce.raw);

        identity.accounts.id.initialize({
          client_id: clientId,
          ...(redirect
            ? {
                ux_mode: "redirect" as const,
                login_uri: `${window.location.origin}${GOOGLE_LOGIN_PATH}`,
              }
            : { ux_mode: "popup" as const, callback: handleCredential }),
          nonce: nonce.hashed,
          /*
           * Never sign somebody in without asking, which is the same property
           * the redirect flow buys with prompt=select_account. Silently
           * approving a returning Google account is how signing out reads as
           * having done nothing, and how a shared device lets whoever picks
           * it up next straight back in.
           */
          auto_select: false,
          cancel_on_tap_outside: true,
          /* Safari partitions third-party storage; this is Google's opt-in. */
          itp_support: true,
          error_callback: (error) => {
            console.error("[auth] Google Identity Services:", error);
            if (goneRef.current) return;
            setStatus((current) =>
              current === "signing-in" ? current : "fallback",
            );
          },
        });

        const width = Math.min(
          MAX_BUTTON_WIDTH,
          Math.max(MIN_BUTTON_WIDTH, Math.round(container.clientWidth)),
        );

        identity.accounts.id.renderButton(container, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          width,
          /* Google localises its own label; this is the only say we get. */
          locale: googleButtonLocale(htmlLang),
        });

        /* The button exists, so the fallback is no longer needed. */
        window.clearTimeout(grace);

        if (!redirect) void loadSupabase();

        await buttonPainted(container, BUTTON_PAINT_CEILING_MS);
        if (!superseded && !goneRef.current) setStatus("ready");
      } catch (error) {
        console.error(error);
        window.clearTimeout(grace);
        if (!superseded && !goneRef.current) setStatus("fallback");
      }
    })();

    return () => {
      superseded = true;
      goneRef.current = true;
      window.clearTimeout(grace);
      window.google?.accounts.id.cancel();
    };
  }, [clientId, handleCredential, htmlLang]);

  const error = errorMessage ? (
    <p className="mt-3 text-center text-sm text-red-600" role="alert">
      {errorMessage}
    </p>
  ) : null;

  if (status === "fallback") {
    return (
      <div className="w-full">
        <GoogleLoginButton />
        {error}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/*
        The placeholder and the button share one slot of the button's own
        height, so nothing below moves when Google's arrives; the two cross
        over once it has actually drawn (see buttonPainted above).
      */}
      <div className={styles.slot} data-status={status}>
        <div className={styles.placeholder} aria-hidden="true" />

        {/*
          Always mounted and always laid out. Google renders into it and
          cannot be handed a node that does not exist yet — and it must not be
          `hidden` either: the width handed to renderButton is measured from
          this element, and a hidden element measures zero, which silently
          drew every button at the minimum width instead of the width of the
          card. Transparent until drawn, which measures the same.
        */}
        <div
          ref={containerRef}
          className={`${styles.button} flex w-full justify-center`}
          aria-busy={status === "signing-in"}
        />
      </div>

      {status === "signing-in" && (
        <p className="mt-3 text-center text-sm text-ink-soft" role="status">
          {copy.googleSubmitting}
        </p>
      )}

      {error}
    </div>
  );
}
