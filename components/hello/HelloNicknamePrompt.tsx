"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import { fill } from "@/lib/i18n/format";
import { cleanSenderName, HELLO_NAME_MAX } from "@/lib/hello/text";
import { createClient } from "@/lib/supabase/client";

/*
 * Before a hello goes out under an Exchange ID nobody would recognise.
 *
 * A reader with no nickname — or one a hello will not show, with a link or
 * a phone number in it (lib/hello/text.ts) — would send their invitation as
 * "@user_f0614…", which reads like nobody, or like a scam (Chi, 2026-10-19).
 * This says so above the create button and lets them choose a nickname
 * there. It never blocks creating: sending as their ID stays their choice.
 *
 * The nickname is their profile's, the one Settings edits, saved through
 * their own session the way Settings saves it. The server takes the name
 * from the profile when the hello is made, so it is saved before then.
 */
export default function HelloNicknamePrompt({
  userId,
  exchangeId,
  onSaved,
}: {
  userId: string;
  exchangeId: string;
  onSaved: (name: string) => void;
}) {
  const { t } = useTranslation();
  const copy = t.hello;
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "invalid" | "failed">("idle");

  const save = async () => {
    const name = value.normalize("NFC").replace(/\s+/g, " ").trim();
    if (!name) return;
    if (cleanSenderName(name) !== name) {
      setState("invalid");
      return;
    }
    setState("saving");
    const { error } = await createClient().from("profiles").update({ display_name: name }).eq("id", userId);
    if (error) {
      setState("failed");
      return;
    }
    setState("idle");
    onSaved(name);
  };

  return (
    <section
      aria-labelledby="hello-nickname"
      className="space-y-3 rounded-3xl border border-amber-200/70 bg-amber-50 p-4 text-amber-950"
    >
      <p id="hello-nickname" className="text-[0.875rem] leading-6">
        {fill(copy.nicknamePrompt, { id: `@${exchangeId}` })}
      </p>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (state === "invalid" || state === "failed") setState("idle");
          }}
          maxLength={HELLO_NAME_MAX}
          placeholder={copy.nicknamePlaceholder}
          aria-label={copy.nicknamePlaceholder}
          autoComplete="nickname"
          className="min-h-[44px] min-w-0 flex-1 rounded-2xl border border-black/[0.08] bg-white px-4 text-[0.9375rem] text-black"
        />
        <button
          type="submit"
          disabled={!value.trim() || state === "saving"}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-black px-4 text-[0.875rem] font-semibold text-white disabled:opacity-40"
        >
          {state === "saving" ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : null}
          {state === "saving" ? copy.nicknameSaving : copy.nicknameSave}
        </button>
      </form>
      {state === "invalid" || state === "failed" ? (
        <p role="status" className="text-[0.8125rem]">
          {state === "invalid" ? copy.nicknameInvalid : copy.nicknameFailed}
        </p>
      ) : null}
    </section>
  );
}
