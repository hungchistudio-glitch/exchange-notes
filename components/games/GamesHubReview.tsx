"use client";

import GamesHub from "./GamesHub";

const loadToday = async () => 120;
const loadBalance = async () => 240;

/** The hub without an account, leading to the two games' review screens. */
export default function GamesHubReview() {
  return (
    <GamesHub
      loadToday={loadToday}
      loadBalance={loadBalance}
      hrefs={{ hangyumi: "/hangyumi-review", wordvault: "/hangyumi-review?game=wordvault" }}
      backHref="/games-review"
    />
  );
}
