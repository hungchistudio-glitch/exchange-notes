import type { SupabaseClient } from "@supabase/supabase-js";

import { cleanOutfit, shopItem, type YumiOutfit } from "./catalog";

/* =========================================================
   Energy cookies, and what they have bought

   Cookies come from one ledger on the server (lib/shop/energy.ts for the
   rules, supabase/migrations/*_yumi_energy_ledger.sql for the ledger): the
   first save of a word, a review round passed in full, Hangyumi's letters
   (lib/hangyumi), and one day paid supply. Nothing in the browser can write to it, so a balance cannot be
   raised by writing a number, and nothing earned is taken back when a word
   is deleted. A purchase never touches a word, a review or Yumi's feeding.

   Every write goes through a database function that locks the reader's row
   (supabase/migrations/*_yumi_shop.sql): two taps, two tabs or two devices
   buying at once cannot charge twice or go below zero, and a piece already
   owned is never charged again. The browser is never trusted with a price.
   ========================================================= */

export type WardrobeState = {
  /** From saving and reviewing words, including what was there before the ledger. */
  earned: number;
  /** From paid energy supply; kept apart so it can never pass for learning. */
  paid: number;
  /** From Hangyumi; a game, so it is not learning either. */
  game: number;
  spent: number;
  balance: number;
  owned: string[];
  outfit: YumiOutfit;
};

export type BuyStatus = "bought" | "owned" | "insufficient";

export type BuyResult = { status: BuyStatus; state: WardrobeState };

export type ShopWallet = {
  load(): Promise<WardrobeState>;
  buy(itemId: string): Promise<BuyResult>;
  wear(outfit: YumiOutfit): Promise<WardrobeState>;
};

/** The database functions are not there yet: try-on works, buying waits. */
export class ShopClosedError extends Error {
  constructor() {
    super("The shop's database functions are not available.");
    this.name = "ShopClosedError";
  }
}

function readState(value: unknown): WardrobeState {
  const row = (value ?? {}) as Record<string, unknown>;
  const number = (key: string) => {
    const n = Number(row[key]);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  };
  const owned = Array.isArray(row.owned)
    ? row.owned.filter((id): id is string => typeof id === "string" && !!shopItem(id))
    : [];
  return {
    earned: number("earned"),
    paid: number("paid"),
    game: number("game"),
    spent: number("spent"),
    balance: number("balance"),
    owned,
    outfit: cleanOutfit(row.outfit),
  };
}

/** PostgREST answers PGRST202 for a function it does not know. */
function isMissingFunction(error: { code?: string } | null) {
  return error?.code === "PGRST202" || error?.code === "42883";
}

export function createSupabaseWallet(supabase: SupabaseClient): ShopWallet {
  async function call(name: string, args?: Record<string, unknown>) {
    const { data, error } = await supabase.rpc(name, args);
    if (isMissingFunction(error)) throw new ShopClosedError();
    if (error) throw new Error(error.message);
    return data;
  }

  return {
    async load() {
      return readState(await call("get_yumi_wardrobe"));
    },
    async buy(itemId) {
      const data = (await call("buy_yumi_item", { p_item_id: itemId })) as Record<string, unknown> | null;
      const status = data?.status;
      if (status !== "bought" && status !== "owned" && status !== "insufficient") {
        throw new Error("Invalid shop purchase result.");
      }
      return {
        status: status === "owned" || status === "insufficient" ? status : "bought",
        state: readState(data?.state),
      };
    },
    async wear(outfit) {
      return readState(await call("wear_yumi_outfit", { p_outfit: cleanOutfit(outfit) }));
    },
  };
}

/**
 * The review screen's wallet: the same rules, in memory, so the whole flow
 * can be tried without an account and without touching anyone's cookies.
 */
export function createPreviewWallet(startingBalance = 240): ShopWallet {
  let state: WardrobeState = {
    earned: startingBalance, paid: 0, game: 0, spent: 0, balance: startingBalance, owned: [], outfit: {},
  };
  const settle = () => new Promise(resolve => setTimeout(resolve, 260));

  return {
    async load() {
      await settle();
      return state;
    },
    async buy(itemId) {
      await settle();
      const item = shopItem(itemId);
      if (!item) throw new Error("Unknown item.");
      if (state.owned.includes(itemId)) return { status: "owned", state };
      if (state.balance < item.price) return { status: "insufficient", state };
      state = {
        ...state,
        spent: state.spent + item.price,
        balance: state.balance - item.price,
        owned: [...state.owned, itemId],
      };
      return { status: "bought", state };
    },
    async wear(outfit) {
      await settle();
      const clean = cleanOutfit(outfit);
      const next: YumiOutfit = {};
      for (const [slot, id] of Object.entries(clean)) {
        if (id && state.owned.includes(id)) next[slot as keyof YumiOutfit] = id;
      }
      state = { ...state, outfit: next };
      return state;
    },
  };
}
