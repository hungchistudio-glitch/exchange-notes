/* =========================================================
   Energy cookies: the shop's own currency

   Chi (2026-10-13) set the rules, and they are kept on the server in one
   ledger (supabase/migrations/20261013151005_yumi_energy_ledger.sql):

     +1   the first time a word is saved (deleting it and saving it again
          does not pay twice);
     +3   a review round in which every card was passed;
     +33  per US dollar of energy supply, once paid supply opens.

   Cookies are spent only in the shop, and nothing bought ever counts as
   learning: no words, no review records, no achievements.
   ========================================================= */

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
