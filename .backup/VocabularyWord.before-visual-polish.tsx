import { Display } from "@/components/ui/Typography";
import VocabularySpeechButton from "./VocabularySpeechButton";

type Props = {
  word: string;
  className?: string;
};

export default function VocabularyWord({
  word,
  className = "",
}: Props) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <Display className="min-w-0 break-words">
        {word}
      </Display>

      <VocabularySpeechButton
        text={word}
        language="en-US"
        label={`Play ${word}`}
        size="sm"
      />
    </div>
  );
}
