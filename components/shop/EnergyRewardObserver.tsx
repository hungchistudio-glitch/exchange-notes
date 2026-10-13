"use client";

import { useEffect, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import { ENERGY_REFRESH_EVENT, announceEnergyLanded } from "@/lib/shop/energy";
import { createClient } from "@/lib/supabase/client";

import EnergyReward from "./EnergyReward";

type Kind = "save" | "review" | "paid";
type Credit = { id: string; amount: number; kind: Kind };

/**
 * Plays the cookie-landing card for credits the server has made and the
 * reader has not been shown yet, then marks them shown.
 *
 * Only committed ledger rows can start it, so a save or review that failed
 * never celebrates. It looks when something says cookies may have been
 * earned (a word saved, a review graded, the offline outbox sent), when the
 * app comes back into view, and when the network returns; it does not poll.
 * Several credits close together land as one card with their total.
 */
export default function EnergyRewardObserver({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [reward, setReward] = useState<{ amount: number; kind: Kind | "mixed"; key: string } | null>(null);

  useEffect(() => {
    const client = createClient();
    let cancelled = false;
    let busy = false;
    let again = false;
    let hide: ReturnType<typeof setTimeout> | undefined;
    const shown = new Set<string>();

    async function check() {
      if (cancelled || document.hidden || !navigator.onLine) return;
      if (busy) { again = true; return; }
      busy = true;
      try {
        const { data, error } = await client
          .from("yumi_energy_ledger")
          .select("id, amount, kind")
          .eq("user_id", userId)
          .is("notified_at", null)
          .in("kind", ["save", "review", "paid"])
          .gt("amount", 0)
          .order("created_at", { ascending: true })
          .limit(100);
        if (error || cancelled) return;
        const unread = (data ?? []) as Credit[];
        const fresh = unread.filter(credit => !shown.has(credit.id));
        if (fresh.length > 0) {
          for (const credit of fresh) shown.add(credit.id);
          const kinds = new Set(fresh.map(credit => credit.kind));
          const amount = fresh.reduce((sum, credit) => sum + credit.amount, 0);
          setReward({ amount, kind: kinds.size === 1 ? fresh[0].kind : "mixed", key: fresh[0].id });
          announceEnergyLanded(amount);
          clearTimeout(hide);
          hide = setTimeout(() => { if (!cancelled) setReward(null); }, 2600);
        }
        // A failed acknowledgement is tried again next time; `shown` keeps
        // this visit from playing the same credit twice meanwhile.
        if (unread.length > 0) await client.rpc("ack_yumi_energy", { p_ids: unread.map(credit => credit.id) });
      } catch {
        // Offline or refused: the credits wait on the server for next time.
      } finally {
        busy = false;
        if (again && !cancelled) { again = false; void check(); }
      }
    }

    const wake = () => { void check(); };
    void check();
    window.addEventListener(ENERGY_REFRESH_EVENT, wake);
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      cancelled = true;
      clearTimeout(hide);
      window.removeEventListener(ENERGY_REFRESH_EVENT, wake);
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [userId]);

  if (!reward) return null;
  const energy = t.shop.energy;
  const label = reward.kind === "save" ? energy.rewardSave
    : reward.kind === "review" ? energy.rewardReview
      : reward.kind === "paid" ? energy.rewardPaid
        : energy.rewardMixed;
  return <EnergyReward key={reward.key} amount={reward.amount} label={label} />;
}
