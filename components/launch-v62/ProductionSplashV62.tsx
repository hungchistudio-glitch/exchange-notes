"use client";

import ExchangeNotesLaunchV62 from "./ExchangeNotesLaunchV62";

type Props = {
  onComplete?: () => void;
};

export default function ProductionSplashV62({
  onComplete,
}: Props) {
  return (
    <ExchangeNotesLaunchV62
      onComplete={onComplete}
    />
  );
}
