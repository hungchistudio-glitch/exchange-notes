"use client";

import { readGamesProgress } from "@/lib/games/progress";

import GamesHub from "./GamesHub";

const loadToday = async () => 120;
const loadBalance = async () => 240;
/* A reader part of the way into each: two wins of three and 5 pieces, a
   streak of three (the next word holds the medium chest), four voyages of
   seven and 2 relics. */
const loadProgress = async () => readGamesProgress({
  hangyumi: { cycleProgress: 2, cycleLength: 3, collectedCount: 5, collectionSize: 24 },
  starweaver: { cycleProgress: 4, cycleLength: 7, collectedCount: 2, collectionSize: 17 },
  wordvault: { streak: 3, streakLength: 7 },
});

/** The hub without an account, leading to the two games' review screens. */
export default function GamesHubReview() {
  return (
    <GamesHub
      loadToday={loadToday}
      loadBalance={loadBalance}
      loadProgress={loadProgress}
      hrefs={{ hangyumi: "/hangyumi-review", wordvault: "/hangyumi-review?game=wordvault", starweaver: "/hangyumi-review?game=starweaver" }}
      backHref="/games-review"
    />
  );
}
