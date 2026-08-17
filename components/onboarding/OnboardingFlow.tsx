"use client";

import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import useTranslation from "@/hooks/i18n/useTranslation";
import { setTutorialPending } from "@/lib/appPreferences";
import { createClient } from "@/lib/supabase/client";
import type { AppLanguage } from "@/lib/types/app";

import WelcomeStep from "./steps/WelcomeStep";
import NameStep from "./steps/NameStep";
import AppLanguageStep from "./steps/AppLanguageStep";
import LanguagesStep from "./steps/LanguagesStep";
import ConfirmStep from "./steps/ConfirmStep";

type Step = "welcome" | "name" | "app-language" | "languages" | "confirm";

// Only the steps that show a progress indicator — Welcome is a pure
// first-impression screen with nothing to fill in, so it stays off the
// "N / total" count per the design brief.
const PROGRESS_STEPS: Step[] = ["name", "app-language", "languages", "confirm"];

type OnboardingFlowProps = {
  userId: string;
  initialDisplayName: string;
  initialExchangeId: string;
  initialAvatarUrl: string | null;
  initialNativeLanguage: AppLanguage | null;
  initialLearningLanguage: AppLanguage | null;
  initialStep: string | null;
};

export default function OnboardingFlow({
  userId,
  initialDisplayName,
  initialExchangeId,
  initialAvatarUrl,
  initialNativeLanguage,
  initialLearningLanguage,
  initialStep,
}: OnboardingFlowProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const copy = t.onboarding;

  // If the name step was already saved on a previous visit, jump straight
  // past Welcome + Name — no reason to make someone re-type their name
  // just because they closed the app mid-flow.
  const [step, setStep] = useState<Step>(
    initialStep === "languages" ? "app-language" : "welcome",
  );

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [exchangeId, setExchangeId] = useState(initialExchangeId);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [nativeLanguage, setNativeLanguage] = useState<AppLanguage>(
    initialNativeLanguage ?? "english",
  );
  const [learningLanguage, setLearningLanguage] = useState<AppLanguage>(
    initialLearningLanguage ??
      (initialNativeLanguage === "english" ? "traditional-chinese" : "english"),
  );

  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState("");

  async function handleNameContinue() {
    setSavingName(true);
    setNameError("");

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        exchange_id: exchangeId,
        onboarding_step: "languages",
      })
      .eq("id", userId);

    setSavingName(false);

    if (error) {
      console.error(error);
      // 23505 = unique_violation — someone else claimed this Exchange ID
      // in the moment between the live-availability check and save.
      setNameError(
        error.code === "23505" ? copy.name.idTaken : copy.name.saveError,
      );
      return;
    }

    setStep("app-language");
  }

  async function handleStartLearning() {
    setCompleting(true);
    setCompleteError("");

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        native_language: nativeLanguage,
        learning_language: learningLanguage,
        onboarding_completed: true,
        onboarding_step: null,
      })
      .eq("id", userId);

    if (error) {
      console.error(error);
      setCompleting(false);
      setCompleteError(
        error.code === "23514"
          ? copy.languages.sameLanguageHint
          : copy.languages.completeError,
      );
      return;
    }

    /*
     * The only place a tour is ever armed. Arming it here rather than treating
     * "this device has no record" as new is what keeps it away from accounts
     * that have been in use for months — they reach it from Home or Settings
     * instead. Cleared by the tour itself the moment it is dismissed.
     */
    setTutorialPending(true);

    router.replace("/");
    router.refresh();
  }

  function goBack() {
    if (step === "name") setStep("welcome");
    else if (step === "app-language") setStep("name");
    else if (step === "languages") setStep("app-language");
    else if (step === "confirm") setStep("languages");
  }

  const progressIndex = PROGRESS_STEPS.indexOf(step);

  return (
    <main className="flex min-h-[100dvh] flex-col bg-surface text-black">
      <div
        className="flex shrink-0 items-center justify-between px-5"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        {step !== "welcome" ? (
          <button
            type="button"
            onClick={goBack}
            aria-label={copy.back}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-black/[0.05] hover:text-black"
          >
            <ChevronLeft size={20} strokeWidth={1.8} />
          </button>
        ) : (
          <span className="h-9 w-9" />
        )}

        {progressIndex >= 0 ? (
          <div className="flex items-center gap-1.5">
            {PROGRESS_STEPS.map((progressStep, index) => (
              <span
                key={progressStep}
                className={`h-1.5 rounded-full transition-all ${
                  index === progressIndex
                    ? "w-5 bg-black"
                    : index < progressIndex
                      ? "w-1.5 bg-black/40"
                      : "w-1.5 bg-black/15"
                }`}
              />
            ))}
          </div>
        ) : (
          <span />
        )}

        <span className="h-9 w-9" />
      </div>

      <div className="flex flex-1 flex-col px-6 pb-10 pt-4 sm:px-8">
        {step === "welcome" && <WelcomeStep onContinue={() => setStep("name")} />}

        {step === "name" && (
          <NameStep
            userId={userId}
            displayName={displayName}
            exchangeId={exchangeId}
            avatarUrl={avatarUrl}
            initialExchangeId={initialExchangeId}
            saving={savingName}
            error={nameError}
            onChangeDisplayName={setDisplayName}
            onChangeExchangeId={setExchangeId}
            onChangeAvatarUrl={setAvatarUrl}
            onContinue={handleNameContinue}
          />
        )}

        {step === "app-language" && (
          <AppLanguageStep onContinue={() => setStep("languages")} />
        )}

        {step === "languages" && (
          <LanguagesStep
            nativeLanguage={nativeLanguage}
            learningLanguage={learningLanguage}
            onChangeNativeLanguage={setNativeLanguage}
            onChangeLearningLanguage={setLearningLanguage}
            onContinue={() => setStep("confirm")}
          />
        )}

        {step === "confirm" && (
          <ConfirmStep
            displayName={displayName}
            nativeLanguage={nativeLanguage}
            learningLanguage={learningLanguage}
            completing={completing}
            error={completeError}
            onStart={handleStartLearning}
          />
        )}
      </div>
    </main>
  );
}
