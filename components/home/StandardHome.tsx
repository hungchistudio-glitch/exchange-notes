"use client";

import { useRef } from "react";

import Screen from "@/components/foundation/layout/Screen";
import YumiHomeStage from "@/components/home/yumi/YumiHomeStage";
import YumiRingOverlay from "@/components/home/yumi/YumiRingOverlay";
import TutorialLauncher from "@/components/tutorial/TutorialLauncher";

import { useVocabulary } from "@/contexts/VocabularyContext";
import useVocabularyStats from "@/hooks/useVocabularyStats";
import useUnreadMessageCount from "@/hooks/messages/useUnreadMessageCount";

import styles from "./StandardHome.module.css";

/*
 * The home screen is Yumi, and nothing else.
 *
 * It used to carry ten modules under her — search, notes, today's focus,
 * today's word, quick start, the progress tiles, the learning partner, the
 * tour. Every one of them had a door on the ring she opens, so the page was
 * offering a second way to somewhere the ring already goes, which is a screen
 * teaching its reader that its own layout does not mean anything.
 *
 * Two things did not have a door, and both are handled rather than dropped:
 *
 *   Review had no spoke at all. It lives on her now — a long press goes
 *   straight there, and the count sits under her as a key while any word is
 *   waiting. See YumiRingOverlay.
 *
 *   The tour opens itself once, when onboarding has just finished. That is
 *   why TutorialLauncher is still mounted here with no button: its button was
 *   one of the ten, and Settings › Help has carried the same tour for as long
 *   as it has existed, but the unprompted first opening only ever happened on
 *   this screen.
 *
 * Everything else that went was reachable elsewhere before this change and
 * still is: install from Settings › Devices, friends from Messages, the
 * camera from inside the search sheet.
 */
export default function StandardHome() {
  /*
   * The app-wide library, not a second fetch of it — a word saved from the
   * search sheet has to change the count under her without a reload.
   */
  const { items, loading: itemsLoading } = useVocabulary();
  const { reviewStats } = useVocabularyStats(items);
  /* The dock is gone on this screen, so its unread count comes with it. */
  const { unreadCount } = useUnreadMessageCount();
  const stageRef = useRef<HTMLDivElement>(null);

  return (
    <Screen contentClassName={styles.surface}>
      {/*
        The 2D stage is what positions her: the canvas reads
        `[data-yumi-figure]` out of it every frame, and keeps doing so while
        the stage is hidden behind the live scene. So centring her is centring
        this block, not the canvas.
      */}
      <div ref={stageRef} className={styles.centre}>
        <YumiRingOverlay
          stageRef={stageRef}
          unreadCount={unreadCount}
          reviewDue={itemsLoading ? 0 : reviewStats.due}
        >
          <YumiHomeStage items={items} />
        </YumiRingOverlay>
      </div>

      <TutorialLauncher showButton={false} />
    </Screen>
  );
}
