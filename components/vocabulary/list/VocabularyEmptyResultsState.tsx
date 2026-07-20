import { BookOpen, LoaderCircle, SearchX } from "lucide-react";

import { EmptyState } from "@/components/foundation";
import type {
  VocabularyLookupStatus,
} from "@/lib/types/vocabularyLookup";


type VocabularyEmptyResultsStateProps = {
  query: string;
  lookupStatus: VocabularyLookupStatus;
  lookupError: string;
  onLookupWord: () => void;
};

export default function VocabularyEmptyResultsState({
  query,
  lookupStatus,
  lookupError,
  onLookupWord,
}: VocabularyEmptyResultsStateProps) {
  const trimmedQuery = query.trim();

  return (
    <div className="mt-8">
      <EmptyState
        className="rounded-[28px] py-9 shadow-[0_4px_20px_rgba(0,0,0,0.035)]"
        icon={
          trimmedQuery ? (
            <SearchX size={22} strokeWidth={1.7} />
          ) : (
            <BookOpen size={22} strokeWidth={1.7} />
          )
        }
        title={
          trimmedQuery
            ? "This word is not saved yet"
            : "No matching words"
        }
        description={
          trimmedQuery
            ? "Look it up to find its meaning, examples, and save it to your vocabulary."
            : "Try another search or choose a different learning status."
        }
        action={
          trimmedQuery ? (
            <button
              type="button"
              onClick={onLookupWord}
              disabled={lookupStatus === "loading"}
              className="mx-auto flex h-12 w-full max-w-sm items-center justify-center rounded-full bg-black px-5 text-[13px] font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35"
            >
              {lookupStatus === "loading" ? (
                <>
                  <LoaderCircle
                    size={15}
                    className="mr-2 animate-spin"
                  />
                  Looking up
                </>
              ) : (
                `Look up "${trimmedQuery}"`
              )}
            </button>
          ) : undefined
        }
      />

      {lookupStatus === "error" && (
        <p
          role="alert"
          className="mt-3 rounded-[16px] bg-red-50 px-4 py-3 text-center text-[13px] font-semibold text-red-700"
        >
          {lookupError}
        </p>
      )}
    </div>
  );
}
