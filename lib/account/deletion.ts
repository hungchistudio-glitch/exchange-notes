/*
 * The confirmation the account-deletion route requires in its body.
 *
 * Not a secret and not a security boundary — the session decides whose
 * account it is. It is what makes a request to that route a deliberate
 * deletion rather than a stray call that happened to have a session.
 */
export const ACCOUNT_DELETE_CONFIRMATION = "delete-my-account";

export type AccountDeletionResult =
  | { ok: true }
  | { ok: false; reason: "signed-out" | "failed" };

/**
 * Asks the server to delete the signed-in reader's account.
 *
 * Only the server step. What this device holds — offline copies, the push
 * registration — is cleared by the caller once this succeeds, the same way
 * signing out clears it.
 */
export async function requestAccountDeletion(): Promise<AccountDeletionResult> {
  try {
    const response = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: ACCOUNT_DELETE_CONFIRMATION }),
      cache: "no-store",
    });

    if (response.ok) return { ok: true };
    return { ok: false, reason: response.status === 401 ? "signed-out" : "failed" };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
