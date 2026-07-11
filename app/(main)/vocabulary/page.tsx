import Link from "next/link";
import { Camera, Plus } from "lucide-react";

export default function VocabularyPage() {
  return (
    <main className="min-h-screen bg-[#f5f2eb] px-5 pb-28 pt-8 text-black">
      <div className="mx-auto max-w-xl">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em]">
              Your library
            </p>

            <h1 className="mt-2 text-5xl font-black">
              Vocabulary
            </h1>
          </div>

          <Link
            href="/capture"
            className="rounded-full bg-black p-4 text-white"
          >
            <Plus size={24} />
          </Link>
        </header>

        <section className="mt-8 rounded-[30px] bg-white p-7 text-center">
          <Camera
            className="mx-auto"
            size={30}
          />

          <h2 className="mt-5 text-2xl font-black">
            Your first word begins outside
          </h2>

          <p className="mt-3 leading-7">
            Photograph something from daily life and
            save its English and Traditional Chinese
            meaning.
          </p>

          <Link
            href="/capture"
            className="mt-6 block rounded-[20px] bg-black px-5 py-4 font-black text-white"
          >
            Discover a Word
          </Link>
        </section>
      </div>
    </main>
  );
}
