import { BookmarkPlus, LoaderCircle } from "lucide-react";

import type { VocabularyCategory } from "@/lib/types/app";
import type {
  VocabularyLookupResult,
} from "@/lib/types/vocabularyLookup";


type VocabularyLookupResultStateProps = {
  result: VocabularyLookupResult;
  saving: boolean;
  onSave: () => void;
};

export default function VocabularyLookupResultState({
  result,
  saving,
  onSave,
}: VocabularyLookupResultStateProps) {
  return (
    <section className="mt-8 rounded-[28px] bg-white p-6 text-center shadow-[0_4px_20px_rgba(0,0,0,0.035)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f1ea] text-black/60">
        <BookmarkPlus size={22} strokeWidth={1.7} />
      </div>

      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/35">
        Word found
      </p>

      <h2 className="mt-2 break-words text-[27px] font-semibold tracking-[-0.04em] text-black">
        {result.englishName}
      </h2>

      <p className="mt-1 break-words text-xl text-black/60">
        {result.chineseName}
      </p>

      <p className="mt-2 text-[11px] font-medium capitalize tracking-[0.06em] text-black/35">
        {result.partOfSpeech}
      </p>

      <div className="mt-5 rounded-[20px] bg-[#f5f2eb] p-4 text-left">
        <p className="text-[14px] leading-6 text-black/80">
          {result.englishExample}
        </p>

        <p className="mt-2 text-[14px] leading-6 text-black/50">
          {result.chineseExample}
        </p>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-black px-5 text-[13px] font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35"
      >
        {saving ? (
          <>
            <LoaderCircle
              size={15}
              className="mr-2 animate-spin"
            />
            Saving
          </>
        ) : (
          "Add to vocabulary"
        )}
      </button>
    </section>
  );
}
