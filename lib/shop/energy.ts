/* =========================================================
   Energy cookies: the shop's own currency

   Chi (2026-10-13) set the rules, and they are kept on the server in one
   ledger (supabase/migrations/20261013160810_yumi_energy_ledger.sql):

     +3   the first time a word is saved (deleting it and saving it again
          does not pay twice); it was +1 until Chi raised it on 2026-10-24,
          for words saved from then on;
     +3   a review round in which every card was passed;
     +33  per US dollar of energy supply, once paid supply opens.

   The server pays these; the numbers below are only for saying so.

   Cookies are spent only in the shop, and nothing bought ever counts as
   learning: no words, no review records, no achievements.
   ========================================================= */

/** What saving a word pays, the first time (private.yumi_award_saved_word). */
export const ENERGY_PER_SAVED_WORD = 3;

/** What a review round with every card passed pays (private.grade_yumi_review_round). */
export const ENERGY_PER_REVIEW_ROUND = 3;

/** Yumi has three fingers on each hand; with both she counts to 33, her "one". */
export const ENERGY_PER_USD = 33;

/** The supply packs, in US dollars, shown once paid supply is designed in. */
export const SUPPLY_PACKS_USD = [1, 2, 3] as const;

/** Something may have just earned cookies: check the ledger. */
export const ENERGY_REFRESH_EVENT = "yumi-energy-refresh";

/** Cookies have landed: carries how many, for the balance to answer. */
export const ENERGY_LANDED_EVENT = "yumi-energy-landed";

export function refreshEnergyRewards() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(ENERGY_REFRESH_EVENT));
}

export function announceEnergyLanded(amount: number) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ENERGY_LANDED_EVENT, { detail: { amount } }));
  }
}
