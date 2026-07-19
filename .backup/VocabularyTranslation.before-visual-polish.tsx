import { Title } from "@/components/ui/Typography";
import VocabularySpeechButton from "./VocabularySpeechButton";

type Props = {
  text: string;
  className?: string;
};

export default function VocabularyTranslation({
  text,
  className = "",
}: Props) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <Title className="min-w-0 break-words">
        {text}
      </Title>

      <VocabularySpeechButton
        text={text}
        language="zh-TW"
        label={`播放 ${text}`}
        size="sm"
      />
    </div>
  );
}
