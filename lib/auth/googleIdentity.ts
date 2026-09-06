"use client";

/* =========================================================
   Signing in with Google without going through Supabase's front door

   The redirect flow sent people to
   `https://<project-ref>.supabase.co/auth/v1/authorize`, so the name on
   Google's consent screen — the thing a person actually reads before handing
   over their identity — was a twenty-character random string. Renaming that
   host needs a paid Supabase plan.

   Google Identity Services answers the same question a different way: the
   browser asks Google directly, Google hands back a signed ID token, and
   Supabase verifies it with `signInWithIdToken`. Same Supabase user, same
   session, same RLS — the project ref never appears in front of anyone.

   ── What is deliberately not here ──────────────────────────────────────

   Nothing that pretends to be a domain it is not. No proxy in front of
   Supabase, no iframe around Google, no rewriting of address bars. The two
   official SDKs, used the way they are documented.
   ========================================================= */

const GSI_SRC = "https://accounts.google.com/gsi/client";

/** Every attempt gets its own. 16 bytes is well past what a nonce needs. */
const NONCE_BYTES = 16;

export type GoogleCredentialResponse = {
  credential?: string;
  select_by?: string;
};

/**
 * The slice of Google Identity Services this app uses.
 *
 * Hand-written rather than pulled from `@types/google.accounts`: one more
 * dependency for four call signatures, and the package lags the SDK — the
 * FedCM and error-callback fields below arrived in the SDK first.
 */
export type GoogleIdentityApi = {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        nonce?: string;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
        ux_mode?: "popup" | "redirect";
        use_fedcm_for_prompt?: boolean;
        itp_support?: boolean;
        error_callback?: (error: { type?: string; message?: string }) => void;
      }): void;
      renderButton(
        parent: HTMLElement,
        options: {
          type?: "standard" | "icon";
          theme?: "outline" | "filled_blue" | "filled_black";
          size?: "small" | "medium" | "large";
          text?: "signin_with" | "signup_with" | "continue_with" | "signin";
          shape?: "rectangular" | "pill" | "circle" | "square";
          logo_alignment?: "left" | "center";
          width?: number;
          locale?: string;
        },
      ): void;
      disableAutoSelect(): void;
      cancel(): void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

/**
 * The public OAuth client id, or null when nobody has configured one.
 *
 * Null is a supported state, not a crash: the sign-in button falls back to
 * the redirect flow, so an unconfigured deployment can still be signed into.
 * Losing the branding is a bad day; losing the only way into the app is an
 * outage.
 */
export function getGoogleClientId(): string | null {
  const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

  if (id) return id;

  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[auth] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set, so Google sign-in is " +
        "falling back to the Supabase redirect flow. Add the OAuth client id " +
        "from Google Cloud Console to .env.local to use the branded flow.",
    );
  }

  return null;
}

let scriptPromise: Promise<GoogleIdentityApi> | null = null;

/**
 * Loads the Google Identity Services script, once.
 *
 * The promise is cached rather than the boolean, so two components mounting
 * together wait on one network request instead of racing two `<script>` tags
 * into the head. A failed load clears the cache so a later attempt — after
 * the reader reconnects — can try again rather than inheriting the failure
 * forever.
 */
export function loadGoogleIdentity(): Promise<GoogleIdentityApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Identity Services needs a browser."));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<GoogleIdentityApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GSI_SRC}"]`,
    );

    const script = existing ?? document.createElement("script");

    function handleLoad() {
      if (window.google?.accounts?.id) {
        resolve(window.google);
        return;
      }

      reject(new Error("Google Identity Services loaded without an API."));
    }

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Google Identity Services could not be loaded.")),
      { once: true },
    );

    if (!existing) {
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  scriptPromise = scriptPromise.catch((error) => {
    // A blocked or offline load must not poison every later attempt.
    scriptPromise = null;
    throw error;
  });

  return scriptPromise;
}

export type SignInNonce = {
  /** Handed to Supabase, which hashes it and compares. Never leaves this app. */
  raw: string;
  /** Handed to Google, which copies it into the signed token. */
  hashed: string;
};

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * A fresh nonce pair for one sign-in attempt.
 *
 * Google signs the *hashed* value into the token; Supabase hashes the raw one
 * and checks the two match. That is what stops a token minted for somebody
 * else's session from being replayed into this one: an attacker holding a
 * valid Google token still cannot produce the raw string it was bound to.
 *
 * SHA-256 because that is what Supabase's verifier computes. Base64url
 * because the value travels inside a JWT claim, where padding and `+/` are
 * not welcome.
 */
export async function createSignInNonce(): Promise<SignInNonce> {
  const bytes = new Uint8Array(NONCE_BYTES);
  crypto.getRandomValues(bytes);

  const raw = toBase64Url(bytes);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );

  return { raw, hashed: toBase64Url(new Uint8Array(digest)) };
}

/**
 * The BCP-47 tag Google should render its own button in.
 *
 * Google localises the button's label itself, and it is the one piece of this
 * screen the app cannot translate — so it is told which language the reader
 * has chosen rather than being left to guess from the browser.
 */
export function googleButtonLocale(htmlLang: string): string {
  return htmlLang;
}
