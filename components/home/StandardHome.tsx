"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import Screen from "@/components/foundation/layout/Screen";
import YumiHomeStage, {
  type YumiLines,
} from "@/components/home/yumi/YumiHomeStage";
import YumiRingOverlay from "@/components/home/yumi/YumiRingOverlay";
import UniversalSearchField from "@/components/lexicon/UniversalSearchField";
import HomeInstallPrompt from "@/components/pwa/HomeInstallPrompt";
import TutorialLauncher from "@/components/tutorial/TutorialLauncher";

import { useVocabulary } from "@/contexts/VocabularyContext";
import useLocalClock from "@/hooks/home/useLocalClock";
import useTranslation from "@/hooks/i18n/useTranslation";
import useVocabularyStats from "@/hooks/useVocabularyStats";
import useIncomingFriendRequestCount from "@/hooks/friends/useIncomingFriendRequestCount";
import useUnreadMessageCount from "@/hooks/messages/useUnreadMessageCount";
import { getLocalCity } from "@/lib/home/localPlace";
import {
  COACH_FINISHED,
  getCoachStep,
  getServerCoachStep,
  subscribeToCoach,
} from "@/lib/home/tutorialCoach";
import { INTERFACE_LANGUAGE_CODE } from "@/lib/languages";

import styles from "./StandardHome.module.css";

/*
 * The home screen is Yumi, and what she has to say.
 *
 * It used to carry ten modules under her — search, notes, today's focus,
 * today's word, quick start, the progress tiles, the learning partner, the
 * tour. Every one of them had a door on the ring she opens, so the page was
 * offering a second way to somewhere the ring already goes, which is a screen
 * teaching its reader that its own layout does not mean anything.
 *
 * What is left is her, and four lines placed around her:
 *
 *   Above: the greeting, the reader's city, today's date and the time. All
 *   of it is the browser's answer and none of it is the server's, so it is
 *   null through the first render on both sides rather than guessed at.
 *
 *   Below: her own status line, the review key, and the one gesture the
 *   screen cannot show you. The status line is not new copy — eleven moods
 *   of it were already written and translated, and the 3D scene was hiding
 *   the stage that said them. She says them here instead.
 *
 * Two things that went had no door of their own, and both are handled rather
 * than dropped: review lives on her (a long press, plus the key), and the
 * tour still opens itself once after onboarding, which is why
 * TutorialLauncher is mounted here with no button. Everything else was
 * reachable elsewhere before this change and still is — install from
 * Settings › Devices, friends from Messages, the camera inside the search
 * sheet.
 */
export default function StandardHome() {
  const { t, language } = useTranslation();

  /*
   * The app-wide library, not a second fetch of it — a word saved from the
   * search sheet has to change the count under her without a reload.
   */
  const { items, loading: itemsLoading } = useVocabulary();
  const { reviewStats } = useVocabularyStats(items);
  /*
   * The dock is gone on this screen, so everything it used to badge has to
   * be carried here instead. The friend-request count in particular used to
   * ride on the dock's Home key, and hiding the dock took it off the home
   * screen entirely — a request could sit unanswered with nothing anywhere
   * saying so.
   */
  const { unreadCount } = useUnreadMessageCount();
  const { count: friendRequestCount } = useIncomingFriendRequestCount();
  const stageRef = useRef<HTMLDivElement>(null);

  const [lines, setLines] = useState<YumiLines | null>(null);
  const handleLines = useCallback((next: YumiLines) => setLines(next), []);

  /*
   * Whether a tour is running, for the layout rather than for the tour.
   *
   * The coach stands at the top of the screen and the greeting stands just
   * above Yumi, and on a 320px phone with Chinese copy the two meet: the
   * card wraps to four lines, reaches 174px, and the greeting starts at 129.
   * Measured, not guessed — and at 375 they clear by seventeen pixels, which
   * a reader who has turned their text size up does not have.
   *
   * So the greeting steps aside while there is a step to do, the same way it
   * does while she is answering. A date and a hello are what the screen says
   * when nobody has asked it for anything; a tour asking you to photograph
   * something is not that.
   */
  const coaching =
    useSyncExternalStore(
      subscribeToCoach,
      getCoachStep,
      getServerCoachStep,
    ) !== COACH_FINISHED;

  const now = useLocalClock();
  const locale = INTERFACE_LANGUAGE_CODE[language];

  const meta = useMemo(() => {
    if (!now) return null;

    const hour = now.getHours();

    return {
      /* The same three-way split the greeting has always used. */
      greeting:
        hour < 12
          ? t.home.greeting.morning
          : hour < 18
            ? t.home.greeting.afternoon
            : t.home.greeting.evening,
      place: getLocalCity(locale),
      /*
       * Intl decides the shape, not a template: the order of day, month and
       * weekday is not the same in five languages, and neither is whether
       * the clock runs to twelve or twenty-four.
       */
      date: new Intl.DateTimeFormat(locale, {
        weekday: "short",
        month: "long",
        day: "numeric",
      }).format(now),
      time: new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        minute: "2-digit",
      }).format(now),
    };
  }, [
    now,
    locale,
    t.home.greeting.morning,
    t.home.greeting.afternoon,
    t.home.greeting.evening,
  ]);

  return (
    <Screen contentClassName={styles.surface}>
      {/*
        The 2D stage is what positions her: the canvas reads
        `[data-yumi-figure]` out of it every frame, and keeps doing so while
        the stage is hidden behind the live scene. So centring her is centring
        this block, not the canvas.
      */}
      <div
        ref={stageRef}
        className={styles.centre}
        data-coach={coaching ? "on" : undefined}
      >
        <YumiRingOverlay
          stageRef={stageRef}
          unreadCount={unreadCount}
          lines={lines}
          meta={meta}
          /* Null, not zeroes, until the library is in: a confident "nothing
             waiting" is the one wrong answer here. */
          notices={
            itemsLoading
              ? null
              : {
                  unread: unreadCount,
                  friendRequests: friendRequestCount,
                  reviewDue: reviewStats.due,
                }
          }
          field={({ onAnswerChange }) => (
            <UniversalSearchField onAnswerChange={onAnswerChange} />
          )}
        >
          <YumiHomeStage items={items} onLinesChange={handleLines} />
        </YumiRingOverlay>

        {/*
          The doing half of the tour is mounted by the protected layout now,
          so it can follow the reader to every main screen. It still steps
          aside when the ring opens here; see TutorialCoach.module.css.
        */}
      </div>

      {/*
        Two things that draw nothing until they decide to.

        The tour opens itself once, when onboarding has just finished. The
        install prompt offers itself once per snooze window, a moment after
        the opening film ends — and it is the app's ONLY unprompted offer to
        install. Settings › Devices has a button, but a button is not an
        offer: a reader who never opens Settings would never be asked.

        Emptying this screen took the prompt off it, and the commit that did
        so recorded install as "still reachable from Settings", which was true
        and beside the point. Both of these mount here and render an overlay
        that is closed until it isn't, so neither costs the screen a pixel.
      */}
      <TutorialLauncher showButton={false} />
      <HomeInstallPrompt />
    </Screen>
  );
}
