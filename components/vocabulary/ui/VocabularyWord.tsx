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
          text-[34px]
          font-semibold
          leading-[1.04]
          tracking-[-0.055em]
          text-neutral-950
          sm:text-[38px]
        "
      >
        {normalizedWord}
      </Display>

      <div className="shrink-0 pt-0.5">
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
