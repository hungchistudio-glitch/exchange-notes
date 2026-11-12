import { isLanguageCode } from "@/lib/languages";
import { reviewRouteOnly } from "@/lib/reviewRoutes";
import { coreWordEntry, findCoreWord } from "@/lib/vocabulary/coreLexicon";

/**
 * The review's lookup (/pocket-lookup-review): the app's built-in
 * dictionary only, so a review spends no AI and reads or writes no
 * account. Development and previews only; production answers 404.
 */
export async function POST(request: Request) {
  reviewRouteOnly();
  try {
    const body = await request.json();
    const valid =
      typeof body.query === "string" &&
      [...body.query].length <= 200 &&
      isLanguageCode(body.source) &&
      isLanguageCode(body.target) &&
      body.source !== body.target;
    if (!valid) return Response.json({ error: "invalid" }, { status: 400 });
    const word = findCoreWord(body.query, body.source);
    return Response.json(
      { entry: word ? coreWordEntry(word, body.source, body.target) : null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
}
