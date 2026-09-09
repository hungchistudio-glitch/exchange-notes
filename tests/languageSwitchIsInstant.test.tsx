import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";

import {
  LearningLanguageProvider,
  useLearningLanguageContext,
} from "@/contexts/LearningLanguageContext";

/* =========================================================
   Changing the setting changes the screen, now

   Settings used to save and then refresh the shared context, which is
   three requests deep — the update, getUser(), and the profile read —
   before a single word card noticed. The value was never in doubt: the
   reader had just picked it. Persisting it and displaying it are different
   jobs and only one of them has to wait for the network.
   ========================================================= */

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => {
    throw new Error("no network in this test — and none should be needed");
  },
}));

function Card() {
  const { learningLanguage } = useLearningLanguageContext();
  return <span data-testid="card">{learningLanguage}</span>;
}

function Settings() {
  const { apply } = useLearningLanguageContext();
  const [, force] = useState(0);

  return (
    <button
      type="button"
      onClick={() => {
        apply("it", "en");
        force((n) => n + 1);
      }}
    >
      pick Italian
    </button>
  );
}

describe("changing the learning language", () => {
  it("reaches every card without asking the network", async () => {
    render(
      <LearningLanguageProvider
        initialLearningLanguage="fr"
        initialNativeLanguage="en"
      >
        <Settings />
        <Card />
      </LearningLanguageProvider>,
    );

    expect(screen.getByTestId("card").textContent).toBe("fr");

    await act(async () => {
      screen.getByText("pick Italian").click();
    });

    // Synchronously, in the same commit as the click. The mocked client
    // throws, so any request at all would have failed this test.
    expect(screen.getByTestId("card").textContent).toBe("it");
  });

  it("can be put back when the save fails", async () => {
    function Revert() {
      const { apply, learningLanguage } = useLearningLanguageContext();

      return (
        <button
          type="button"
          onClick={() => apply(learningLanguage === "fr" ? "it" : "fr", "en")}
        >
          toggle
        </button>
      );
    }

    render(
      <LearningLanguageProvider
        initialLearningLanguage="fr"
        initialNativeLanguage="en"
      >
        <Revert />
        <Card />
      </LearningLanguageProvider>,
    );

    await act(async () => screen.getByText("toggle").click());
    expect(screen.getByTestId("card").textContent).toBe("it");

    // Cards were changed on the promise that the change would be saved.
    // When it is not, they go back.
    await act(async () => screen.getByText("toggle").click());
    expect(screen.getByTestId("card").textContent).toBe("fr");
  });

  it("never lets the two languages collapse into one", async () => {
    function Collide() {
      const { apply } = useLearningLanguageContext();
      return (
        <button type="button" onClick={() => apply("it", "it")}>
          collide
        </button>
      );
    }

    function Pair() {
      const { learningLanguage, nativeLanguage } = useLearningLanguageContext();
      return <span data-testid="pair">{`${learningLanguage}/${nativeLanguage}`}</span>;
    }

    render(
      <LearningLanguageProvider
        initialLearningLanguage="fr"
        initialNativeLanguage="en"
      >
        <Collide />
        <Pair />
      </LearningLanguageProvider>,
    );

    await act(async () => screen.getByText("collide").click());

    const [learning, native] = screen.getByTestId("pair").textContent!.split("/");
    expect(learning).toBe("it");
    expect(native).not.toBe("it");
  });
});
