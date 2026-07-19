import { cn } from "@/lib/utils";
import { Title } from "@/components/ui/Typography";
import VocabularySpeechButton from "./VocabularySpeechButton";

type Props = {
  text: string;
  className?: string;
};

export default function VocabularyTranslation({
  text,
  className,
}: Props) {
  const normalizedText = text.trim();

  if (!normalizedText) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex min-w-0 items-start justify-between gap-4",
        className,
      )}
    >
      <Title
        className="
          min-w-0
          flex-1
          break-words
          text-[22px]
          font-medium
          leading-[1.35]
          tracking-[-0.025em]
          text-neutral-800
        "
      >
        {normalizedText}
      </Title>

      <div className="shrink-0 pt-0.5">
        <VocabularySpeechButton
          text={normalizedText}
          language="zh-TW"
          label={`播放 ${normalizedText}`}
          size="sm"
        />
      </div>
    </div>
  );
}
