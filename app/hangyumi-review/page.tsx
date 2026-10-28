import HangyumiGameReview from "@/components/hangyumi/HangyumiGameReview";
import { LANGUAGE_CODES, type LanguageCode } from "@/lib/languages";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * Hangyumi without an account, with a handful of practice words in memory
 * (lib/hangyumi/service.ts): nothing here deals from the real bank, and
 * nothing pays anybody's cookies.
 *
 * ?lang=fr (en, zh-TW, es, fr, it) picks the language being learnt, and
 * ?today=330 starts the day nearly capped, to see a short payment. The
 * clue is in the interface language, as in the game. ?game=wordvault plays
 * Yumi Wordvault on the same screen, and ?streak=3 (or 6) starts its streak
 * there, so the next word holds the medium (or premium) chest. ?wallet=1200
 * makes the wallet answer that many milliseconds late, as a slow network
 * would, to watch Wordvault's way in wait for her outfit.
 */
export const metadata = {
  title: "Hangyumi review",
  robots: { index: false, follow: false },
};

const asLanguage = (value: string | undefined, fallback: LanguageCode): LanguageCode =>
  (LANGUAGE_CODES as readonly string[]).includes(value ?? "") ? (value as LanguageCode) : fallback;

export default async function HangyumiReviewPage({ searchParams }: {
  searchParams: Promise<{ lang?: string; today?: string; game?: string; streak?: string; wallet?: string }>;
}) {
  reviewRouteOnly();
  const params = await searchParams;
  const learning = asLanguage(params.lang, "en");
  const today = Math.max(0, Math.min(333, Number(params.today) || 0));
  return <HangyumiGameReview learningLanguage={learning} earnedToday={today} game={params.game === "wordvault" ? "wordvault" : "hangyumi"} streak={Math.max(0, Math.min(6, Number(params.streak) || 0))} walletDelayMs={Math.max(0, Math.min(10000, Number(params.wallet) || 0))} />;
}
