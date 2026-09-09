"use client";

import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import useTranslation from "@/hooks/i18n/useTranslation";
import { setTutorialPending } from "@/lib/appPreferences";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_LEARNING_PAIR,
  getLearningLanguages,
  readLanguageCode,
  type LanguageCode,
} from "@/lib/languages";

import WelcomeStep from "./steps/WelcomeStep";
import NameStep from "./steps/NameStep";
import AppLanguageStep from "./steps/AppLanguageStep";
import LanguagesStep from "./steps/LanguagesStep";
import ConfirmStep from "./steps/ConfirmStep";

type Step = "welcome" | "name" | "app-language" | "languages" | "confirm";

// Language choice comes before the introduction, and Welcome is the
// introduction itself. Neither is part of the profile form, so progress
// starts only once the reader reaches their name.
const PROGRESS_STEPS: Step[] = ["name", "languages", "confirm"];

type OnboardingFlowProps = {
  userId: string;
  initialDisplayName: string;
  initialExchangeId: string;
  initialAvatarUrl: string | null;
  initialNativeLanguage: unknown;
  initialLearningLanguage: unknown;
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

  /*
   * Language is deliberately first, before even Welcome. Every option names
   * itself (Español, Français, Italiano…), so a reader does not need to
   * understand the default language before choosing their own; the welcome
   * and every step after it then arrive in that choice.
   *
   * A profile that already saved Name still gets this language gate once,
   * then returns directly to Languages instead of being asked for the name
   * again.
   */
  const resumingAfterName = initialStep === "languages";
  const [step, setStep] = useState<Step>("app-language");

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [exchangeId, setExchangeId] = useState(initialExchangeId);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  /*
   * Read through the normaliser: a half-finished profile from before the
   * migration carries the prose values, a newer one carries codes, and this
   * screen is exactly where someone returns to a half-finished profile.
   */
  const [nativeLanguage, setNativeLanguage] = useState<LanguageCode>(
    () => readLanguageCode(initialNativeLanguage) ?? DEFAULT_LEARNING_PAIR[0],
  );
  const [learningLanguage, setLearningLanguage] = useState<LanguageCode>(() => {
    const stored = readLanguageCode(initialLearningLanguage);
    if (stored) return stored;

    const native = readLanguageCode(initialNativeLanguage);
    return (
      getLearningLanguages().find((meta) => meta.code !== native)?.code ??
      DEFAULT_LEARNING_PAIR[1]
    );
  });

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

    router.replace("/home");
    router.refresh();
  }

  function goBack() {
    if (step === "welcome") setStep("app-language");
    else if (step === "name") setStep("welcome");
    else if (step === "languages") {
      setStep(resumingAfterName ? "app-language" : "name");
    }
    else if (step === "confirm") setStep("languages");
  }

  const progressIndex = PROGRESS_STEPS.indexOf(step);

  return (
    <main className="flex min-h-[100dvh] flex-col bg-surface text-black">
      <div
        className="flex shrink-0 items-center justify-between px-5"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        {step !== "app-language" ? (
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
        {step === "welcome" && (
          <WelcomeStep onContinue={() => setStep("name")} />
        )}

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
          <AppLanguageStep
            onContinue={() =>
              setStep(resumingAfterName ? "languages" : "welcome")
            }
          />
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
