import SpeakPageClient from "@/components/speak/SpeakPageClient";
import { resolveLanguageCode } from "@/lib/languages";

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

  /*
   * Any language the app knows, not one of two.
   *
   * The Scriptable widget builds this URL on the user's phone and sends a
   * speech tag ("en-US", "zh-TW"); a share link sends a language code. Both
   * resolve here, and anything unrecognised falls back to English rather
   * than reading a word in the wrong voice.
   */
  const language = resolveLanguageCode(requestedLanguage) ?? "en";
  const text = requestedText.trim().slice(0, 160);

  return <SpeakPageClient language={language} text={text} />;
}
