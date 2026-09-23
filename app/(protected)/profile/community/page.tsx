import InfoPage from "@/components/info/InfoPage";

/*
 * The signed-in copy of a page that also exists at /community. Same words, and
 * deliberately not indexed: the public route is the one a search engine
 * should find, and this one is behind a session it can never hold.
 */
export const metadata = { robots: { index: false, follow: false } };

export default function Page() {
  return <InfoPage page="community" />;
}
