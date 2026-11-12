"use client";

import { useEffect, type ReactNode } from "react";

import RouteStage from "@/components/foundation/layout/RouteStage";
import { InterfaceModeProvider } from "@/contexts/InterfaceModeContext";
import { LearningLanguageProvider } from "@/contexts/LearningLanguageContext";
import type { InterfaceMode } from "@/lib/appPreferences";
import { setLaunching } from "@/lib/launchState";

/** The review's shell: the real RouteStage, the stored mode, no opening. */
export default function VocabularyYumiReviewShell({
  storedMode,
  children,
}: {
  storedMode: InterfaceMode;
  children: ReactNode;
}) {
  useEffect(() => setLaunching(false), []);
  return (
    <InterfaceModeProvider initialMode={storedMode} preview>
      <LearningLanguageProvider initialLearningLanguage="en" initialNativeLanguage="zh-TW">
        <div className="min-h-[100dvh] bg-surface">
          <RouteStage>{children}</RouteStage>
        </div>
      </LearningLanguageProvider>
    </InterfaceModeProvider>
  );
}
