import { FIXTURE_LIBRARY, FIXTURE_LONG_PHRASE, FIXTURE_STAR_COSMIC } from "@/lib/hello/fixtures";
import { helloOgImage } from "@/lib/hello/ogImage";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * The link preview drawn from a fixture (?fixture=star for the Cosmic one,
 * ?fixture=long for the long phrase, ?fixture=gone for the card a
 * turned-off hello gets), on a development machine or a preview build only.
 */
export async function GET(request: Request) {
  reviewRouteOnly();
  const fixture = new URL(request.url).searchParams.get("fixture");
  if (fixture === "gone") return helloOgImage({ status: "revoked" });
  const hello = fixture === "star" ? FIXTURE_STAR_COSMIC : fixture === "long" ? FIXTURE_LONG_PHRASE : FIXTURE_LIBRARY;
  return helloOgImage({ status: "active", hello });
}
