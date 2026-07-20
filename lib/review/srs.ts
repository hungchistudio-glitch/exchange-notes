export type ReviewGrade = 0 | 1 | 2 | 3;

export type ReviewState = {
  interval: number;
  ease: number;
  repetitions: number;
};

export const INITIAL_STATE: ReviewState = {
  interval: 0,
  ease: 2.5,
  repetitions: 0,
};

export function nextReview(
  state: ReviewState,
  grade: ReviewGrade,
): ReviewState {
  let { interval, ease, repetitions } = state;

  if (grade < 2) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions++;

    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 3;
    } else {
      interval = Math.round(interval * ease);
    }

    ease =
      Math.max(
        1.3,
        ease + (
          0.1 -
          (3 - grade) *
          (
            0.08 +
            (3 - grade) * 0.02
          )
        ),
      );
  }

  return {
    interval,
    ease,
    repetitions,
  };
}
