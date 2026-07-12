"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [exchangeId, setExchangeId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    if (user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          display_name: name,
          exchange_id: exchangeId.toLowerCase(),
          email: email,
        });

      if (profileError) {
        setMessage(profileError.message);
        setLoading(false);
        return;
      }
    }

    setMessage(
      "Account created successfully! Please check your email to verify your account."
    );

    setLoading(false);

    setTimeout(() => {
      router.push("/login");
    }, 2000);
  }

  return (
    <main className="min-h-screen bg-[#f4f1ea] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-sm p-10">

        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-700">
          English × Traditional Chinese
        </p>

        <h1 className="mt-3 text-5xl font-bold text-black">
          Exchange Notes
        </h1>

        <p className="mt-3 text-lg text-black">
          Create your account and start learning together.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-6"
        >
          <div>
            <label className="mb-2 block font-semibold text-black">
              Your name
            </label>

            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name"
              className="w-full rounded-2xl border border-neutral-300 px-5 py-4 text-lg text-black placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold text-black">
              Exchange ID
            </label>

            <div className="flex items-center rounded-2xl border border-neutral-300 px-5">
              <span className="mr-4 text-3xl font-bold text-black">@</span>

              <input
                required
                value={exchangeId}
                onChange={(e) =>
                  setExchangeId(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_]/g, "")
                  )
                }
                placeholder="yourname"
                className="w-full bg-transparent py-4 text-lg text-black placeholder:text-neutral-500 focus:outline-none"
              />
            </div>

            <p className="mt-2 text-sm text-neutral-600">
              3–24 lowercase letters, numbers, or underscores.
            </p>
          </div>

          <div>
            <label className="mb-2 block font-semibold text-black">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-neutral-300 px-5 py-4 text-lg text-black placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold text-black">
              Password
            </label>

            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full rounded-2xl border border-neutral-300 px-5 py-4 text-lg text-black placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {message && (
            <div className="rounded-2xl bg-neutral-100 p-4 text-black">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-black py-4 text-lg font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full rounded-2xl border border-neutral-300 py-4 text-lg font-semibold text-black transition hover:bg-neutral-100"
          >
            Already have an account? Log In
          </button>
        </form>

      </div>
    </main>
  );
}
