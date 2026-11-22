"use client";

import { useEffect } from "react";

import { installPressFeedback } from "@/lib/motion/pressFeedback";

/** The whole app's press ripple, installed once (lib/motion/pressFeedback.ts). */
export default function PressFeedback() {
  useEffect(() => installPressFeedback(), []);
  return null;
}
