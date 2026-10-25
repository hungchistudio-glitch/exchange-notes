import HangyumiGameReview from "@/components/hangyumi/HangyumiGameReview";
import { LANGUAGE_CODES, type LanguageCode } from "@/lib/languages";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * Hangyumi without an account, with a handful of practice words in memory
 * (lib/hangyumi/service.ts): nothing here deals from the real bank, and
 * nothing pays anybody's cookies.
 *
 * ?lang=fr (en, zh-TW, es, fr, it) picks the language being learnt,
 * ?hint=en the clue's language, and ?today=330 starts the day nearly
 * capped, to see a short payment.
 */
export const metadata = {
  title: "Hangyumi review",
  robots: { index: false, follow: false },
};

const asLanguage = (value: string | undefined, fallback: LanguageCode): LanguageCode =>
  (LANGUAGE_CODES as readonly string[]).includes(value ?? "") ? (value as LanguageCode) : fallback;

export default async function HangyumiReviewPage({ searchParams }: {
  searchParams: Promise<{ lang?: string; hint?: string; today?: string }>;
}) {
  reviewRouteOnly();
  const params = await searchParams;
  const learning = asLanguage(params.lang, "en");
  const hint = asLanguage(params.hint, learning === "zh-TW" ? "en" : "zh-TW");
  const today = Math.max(0, Math.min(333, Number(params.today) || 0));
  return <HangyumiGameReview learningLanguage={learning} hintLanguage={hint} earnedToday={today} />;
}
