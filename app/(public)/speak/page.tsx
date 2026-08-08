import SpeakPageClient from "@/components/speak/SpeakPageClient";

type SpeakPageProps = {
  searchParams: Promise<{
    language?: string | string[];
    text?: string | string[];
  }>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SpeakPage({ searchParams }: SpeakPageProps) {
  const params = await searchParams;
  const requestedLanguage = firstValue(params.language);
  const requestedText = firstValue(params.text) ?? "";

  const language = requestedLanguage === "zh-TW" ? "zh-TW" : "en-US";
  const text = requestedText.trim().slice(0, 160);

  return <SpeakPageClient language={language} text={text} />;
}
