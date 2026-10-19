/**
 * The hello a visitor was on when they went to sign in (app/hello/[id]/join).
 *
 * httpOnly, so no script can read which hello someone came from, and Lax
 * because the browser returns from Google's sign-in as a top-level
 * navigation. Cleared by the first sign-in that reads it, whoever signs in,
 * so it cannot carry one person's hello to the next account on the device.
 */
export const PENDING_HELLO_COOKIE = "exchange-notes-pending-hello";
export const PENDING_HELLO_MAX_AGE_SECONDS = 24 * 60 * 60;
