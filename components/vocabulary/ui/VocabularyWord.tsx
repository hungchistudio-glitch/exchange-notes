import { cn } from "@/lib/utils";
import { Display } from "@/components/ui/Typography";
import VocabularySpeechButton from "./VocabularySpeechButton";

type Props = {
  word: string;
  className?: string;
};

export default function VocabularyWord({
  word,
  className,
}: Props) {
  const normalizedWord = word.trim();

  return (
    <div
      className={cn(
        "flex min-w-0 items-start justify-between gap-4",
        className,
      )}
    >
      <Display
        className="
          min-w-0
          flex-1
          break-words
          text-[30px]
          font-semibold
          leading-[1.08]
          tracking-[-0.04em]
          text-black
          sm:text-[34px]
        "
      >
        {normalizedWord}
      </Display>

      <div className="shrink-0">
        <VocabularySpeechButton
          text={normalizedWord}
          language="en-US"
          label={`Play ${normalizedWord}`}
          size="sm"
        />
      </div>
    </div>
  );
}
