import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TranslationLanguage } from "@/lib/i18n/types";
import type { Scene } from "@/lib/shop/atmosphere";
import { QUIET_SCENE, sceneFor } from "@/lib/shop/atmosphere";
import { ENERGY_LANDED_EVENT, ENERGY_REFRESH_EVENT, refreshEnergyRewards } from "@/lib/shop/energy";
import { orbitView } from "@/components/shop/OrbitalBackdrop";

/* =========================================================
   Station 33's energy: cookies land only once, and only when credited

   Chi (2026-10-13): saving a word for the first time earns 1, a review
   round passed in full earns 3, and each earning plays a happy landing.
   The ledger itself is tested against Postgres by
   scripts/test-yumi-energy-ledger.mjs; this is the browser's half.
   ========================================================= */

const reader = vi.hoisted(() => ({ language: "english" as TranslationLanguage }));
vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({ default: () => reader.language }));

const db = vi.hoisted(() => ({
  rows: [] as { id: string; amount: number; kind: string }[],
  acked: [] as string[][],
}));

vi.mock("@/lib/supabase/client", () => {
  const query = {
    select: () => query,
    eq: () => query,
    is: () => query,
    in: () => query,
    gt: () => query,
    order: () => query,
    limit: async () => ({ data: db.rows.slice(), error: null }),
  };
  return {
    createClient: () => ({
      from: () => query,
      rpc: async (_name: string, args: { p_ids: string[] }) => {
        db.acked.push(args.p_ids);
        db.rows = db.rows.filter(row => !args.p_ids.includes(row.id));
        return { data: null, error: null };
      },
    }),
  };
});

import EnergyRewardObserver from "@/components/shop/EnergyRewardObserver";

describe("the cookie-landing card", () => {
  beforeEach(() => {
    db.rows = [];
    db.acked = [];
    reader.language = "english";
  });

  it("plays once for a credited save, says where it came from, and marks it shown", async () => {
    db.rows = [{ id: "a", amount: 1, kind: "save" }];
    const landed = vi.fn();
    window.addEventListener(ENERGY_LANDED_EVENT, landed);

    render(<EnergyRewardObserver userId="reader" />);

    expect(await screen.findByText("+1")).toBeInTheDocument();
    expect(screen.getByText("Saved-word reward")).toBeInTheDocument();
    await waitFor(() => expect(db.acked).toEqual([["a"]]));
    expect(landed).toHaveBeenCalledTimes(1);

    // Asked again with nothing new: no second card.
    await act(async () => { refreshEnergyRewards(); });
    expect(db.acked).toHaveLength(1);
    expect(landed).toHaveBeenCalledTimes(1);
    window.removeEventListener(ENERGY_LANDED_EVENT, landed);
  });

  it("adds several credits into one card", async () => {
    render(<EnergyRewardObserver userId="reader" />);
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());

    db.rows = [
      { id: "b", amount: 1, kind: "save" },
      { id: "c", amount: 3, kind: "review" },
    ];
    await act(async () => { window.dispatchEvent(new Event(ENERGY_REFRESH_EVENT)); });

    expect(await screen.findByText("+4")).toBeInTheDocument();
    expect(screen.getByText("Energy cookies received")).toBeInTheDocument();
  });

  it("speaks the display language", async () => {
    reader.language = "traditional-chinese";
    db.rows = [{ id: "d", amount: 3, kind: "review" }];
    render(<EnergyRewardObserver userId="reader" />);
    expect(await screen.findByText("整輪複習獎勵")).toBeInTheDocument();
  });

  it("shows nothing when nothing was credited", async () => {
    render(<EnergyRewardObserver userId="reader" />);
    await act(async () => { refreshEnergyRewards(); });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(db.acked).toHaveLength(0);
  });
});

describe("the window of Station 33", () => {
  const at = (hour: number) => new Date(2026, 9, 13, hour, 0);

  it("shows the weather where the reader is as the weather on Earth below", () => {
    const storm = sceneFor("auto", { condition: "storm", isDay: true, temperature: 21, latitude: 25 }, at(14));
    expect(orbitView(storm)).toEqual({ time: "day", cloud: 3, weather: "storm" });

    const snow = sceneFor("snow", null, at(14));
    expect(orbitView(snow).weather).toBe("snow");

    const night = sceneFor("auto", { condition: "clear", isDay: false, temperature: 12, latitude: 25 }, at(23));
    expect(orbitView(night).time).toBe("night");
  });

  it("turns morning and dusk into a sunrise along the rim", () => {
    const dusk: Scene = { ...QUIET_SCENE, sky: "dusk" };
    expect(orbitView(dusk).time).toBe("twilight");
    expect(orbitView(QUIET_SCENE)).toEqual({ time: "day", cloud: 1, weather: "fine" });
  });
});
