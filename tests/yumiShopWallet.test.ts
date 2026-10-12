import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ShopClosedError, createPreviewWallet, createSupabaseWallet } from "@/lib/shop/wallet";

/* =========================================================
   Energy cookies: earned by feeding, spent once, never below zero

   The database enforces this (supabase/migrations/*_yumi_shop.sql); the
   preview wallet follows the same rules in memory so the review screen
   behaves like the real shop, and the client reads the database's answers
   without trusting anything the browser could invent.
   ========================================================= */

describe("the preview wallet", () => {
  it("charges once, refuses what it cannot afford, and wears only what is owned", async () => {
    const wallet = createPreviewWallet(100);
    expect((await wallet.load()).balance).toBe(100);

    expect((await wallet.buy("jade")).status).toBe("insufficient");

    const bought = await wallet.buy("monocle");
    expect(bought.status).toBe("bought");
    expect(bought.state.balance).toBe(40);

    const again = await wallet.buy("monocle");
    expect(again.status).toBe("owned");
    expect(again.state.balance).toBe(40);

    const worn = await wallet.wear({ eyewear: "monocle", material: "jade" });
    expect(worn.outfit).toEqual({ eyewear: "monocle" });
  });
});

describe("the database wallet", () => {
  function client(rpc: ReturnType<typeof vi.fn>) {
    return { rpc } as unknown as SupabaseClient;
  }

  it("says the shop is closed when its functions are not there yet", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST202", message: "not found" } });
    await expect(createSupabaseWallet(client(rpc)).load()).rejects.toBeInstanceOf(ShopClosedError);
  });

  it("reads only real pieces and whole cookies from the answer", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        status: "bought",
        state: { earned: "12", spent: 3.7, balance: -2, owned: ["beret", "made-up", 7], outfit: { head: "beret", mouth: "made-up" } },
      },
      error: null,
    });
    const result = await createSupabaseWallet(client(rpc)).buy("beret");
    expect(rpc).toHaveBeenCalledWith("buy_yumi_item", { p_item_id: "beret" });
    expect(result.status).toBe("bought");
    expect(result.state).toEqual({ earned: 12, spent: 3, balance: 0, owned: ["beret"], outfit: { head: "beret" } });
  });
});
