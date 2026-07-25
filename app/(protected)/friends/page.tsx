"use client";

import Link from "next/link";
import { useState } from "react";


type AddMethod = "exchange-id" | "email";

export default function FriendsPage() {
  const [method, setMethod] =
    useState<AddMethod>("exchange-id");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");

  function handleSendRequest() {
    const cleanValue = value.trim();

    if (!cleanValue) {
      setMessage(
        method === "exchange-id"
          ? "Enter an Exchange ID."
          : "Enter an email address."
      );
      return;
    }

    setMessage(
      "Friend request UI is ready. Database connection comes next."
    );
  }

  return (
      <main className="min-h-screen bg-[#f4f1ea] px-4 pb-28 pt-6 text-black sm:px-6 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <header>
            <Link
              href="/"
              className="text-sm font-bold text-black"
            >
              ← Home
            </Link>

            <p className="mt-8 text-sm font-bold uppercase tracking-[0.2em] text-black">
              Learning partners
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight text-black sm:text-5xl">
              Friends
            </h1>

            <p className="mt-4 text-lg leading-7 text-black">
              Add someone by Exchange ID, email, or QR
              code.
            </p>
          </header>

          <section className="mt-8 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-2xl font-bold text-black">
              Add a friend
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setMethod("exchange-id");
                  setMessage("");
                }}
                className={`rounded-2xl border px-4 py-4 font-bold ${
                  method === "exchange-id"
                    ? "border-black bg-black text-white"
                    : "border-neutral-400 bg-white text-black"
                }`}
              >
                Exchange ID
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod("email");
                  setMessage("");
                }}
                className={`rounded-2xl border px-4 py-4 font-bold ${
                  method === "email"
                    ? "border-black bg-black text-white"
                    : "border-neutral-400 bg-white text-black"
                }`}
              >
                Email
              </button>
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-bold text-black">
                {method === "exchange-id"
                  ? "Friend's Exchange ID"
                  : "Friend's email"}
              </span>

              <div className="mt-2 flex rounded-2xl border border-neutral-500 bg-white focus-within:border-black">
                {method === "exchange-id" && (
                  <span className="px-4 py-4 text-xl font-bold text-black">
                    @
                  </span>
                )}

                <input
                  type={
                    method === "email"
                      ? "email"
                      : "text"
                  }
                  value={value}
                  onChange={(event) =>
                    setValue(event.target.value)
                  }
                  placeholder={
                    method === "exchange-id"
                      ? "friendname"
                      : "friend@example.com"
                  }
                  className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-4 text-base text-black placeholder:text-neutral-600 outline-none"
                />
              </div>
            </label>

            {message && (
              <p className="mt-4 rounded-2xl bg-[#f4f1ea] p-4 font-semibold text-black">
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={handleSendRequest}
              className="mt-5 w-full rounded-2xl bg-black px-5 py-4 font-bold text-white"
            >
              Send Friend Request
            </button>
          </section>

          <section className="mt-7 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-black">
              QR code
            </p>

            <h2 className="mt-2 text-2xl font-bold text-black">
              Share your profile
            </h2>

            <p className="mt-2 leading-7 text-black">
              Your personal QR code will appear here
              after we connect your profile data.
            </p>

            <div className="mt-5 flex aspect-square max-w-xs items-center justify-center rounded-3xl border-2 border-dashed border-black bg-[#f4f1ea]">
              <span className="text-center font-bold text-black">
                My QR Code
              </span>
            </div>

            <button
              type="button"
              className="mt-5 w-full rounded-2xl border border-black bg-white px-5 py-4 font-bold text-black"
            >
              Scan a QR Code
            </button>
          </section>

          <section className="mt-7">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-black">
                Your friends
              </h2>

              <span className="font-bold text-black">
                0
              </span>
            </div>

            <div className="mt-5 rounded-3xl bg-white p-7 text-center shadow-sm">
              <p className="text-xl font-bold text-black">
                No friends yet
              </p>

              <p className="mt-2 leading-7 text-black">
                Add your first learning partner to
                start sharing notes and messages.
              </p>
            </div>
          </section>
        </div>

        <nav className="fixed inset-x-3 bottom-3 z-50 mx-auto grid max-w-md grid-cols-4 rounded-3xl border border-neutral-200 bg-white p-2 shadow-lg sm:hidden">
          <Link
            href="/"
            className="rounded-2xl px-2 py-3 text-center text-xs font-bold text-black"
          >
            Home
          </Link>

          <Link
            href="/friends"
            className="rounded-2xl bg-black px-2 py-3 text-center text-xs font-bold text-white"
          >
            Friends
          </Link>

          <Link
            href="/camera"
            className="rounded-2xl px-2 py-3 text-center text-xs font-bold text-black"
          >
            Camera
          </Link>

          <Link
            href="/messages"
            className="rounded-2xl px-2 py-3 text-center text-xs font-bold text-black"
          >
            Messages
          </Link>
        </nav>
      </main>
  );
}