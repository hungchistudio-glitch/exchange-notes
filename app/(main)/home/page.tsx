import Link from "next/link";
import {
  Camera,
  ChevronRight,
  ImagePlus,
  MessageCircle,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f5f2eb] px-5 pb-28 pt-8 text-black">
      <div className="mx-auto max-w-xl">
        <header>
          <p className="text-sm font-bold uppercase tracking-[0.2em]">
            English × 繁體中文
          </p>

          <h1 className="mt-3 text-5xl font-black tracking-tight">
            Exchange Notes
          </h1>

          <p className="mt-4 max-w-md text-lg leading-8">
            Learn one useful word from real life,
            then share it with someone who speaks
            the language.
          </p>
        </header>

        <section className="mt-9 rounded-[32px] bg-black p-6 text-white">
          <p className="text-sm font-bold uppercase tracking-[0.18em]">
            Start here
          </p>

          <h2 className="mt-3 text-3xl font-black">
            What is this called?
          </h2>

          <p className="mt-3 leading-7 text-white">
            Take a photo or choose one from your
            library. Turn something you see into a
            word you can remember.
          </p>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <Link
              href="/capture?source=camera"
              className="flex min-h-28 flex-col justify-between rounded-[24px] bg-white p-4 text-black"
            >
              <Camera size={25} />
              <span className="font-black">
                Take Photo
              </span>
            </Link>

            <Link
              href="/capture?source=library"
              className="flex min-h-28 flex-col justify-between rounded-[24px] bg-white p-4 text-black"
            >
              <ImagePlus size={25} />
              <span className="font-black">
                Choose Photo
              </span>
            </Link>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/vocabulary"
            className="rounded-[28px] bg-white p-5"
          >
            <p className="text-3xl font-black">0</p>
            <p className="mt-6 font-black">
              Words Today
            </p>
            <p className="mt-1 text-sm text-[#4f4f4f]">
              Build your vocabulary
            </p>
          </Link>

          <Link
            href="/grammar"
            className="rounded-[28px] bg-white p-5"
          >
            <p className="text-3xl font-black">0</p>
            <p className="mt-6 font-black">
              Grammar Notes
            </p>
            <p className="mt-1 text-sm text-[#4f4f4f]">
              Use words in context
            </p>
          </Link>
        </section>

        <section className="mt-6 rounded-[30px] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <MessageCircle size={24} />

              <h2 className="mt-5 text-2xl font-black">
                Learn with a friend
              </h2>

              <p className="mt-2 leading-7">
                Send a real-life photo. Your friend
                explains it in their native language,
                and you reply in yours.
              </p>
            </div>

            <Link
              href="/messages"
              aria-label="Open messages"
              className="rounded-full border border-black p-2"
            >
              <ChevronRight size={20} />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
