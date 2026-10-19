import HelloEditorEntry from "@/components/hello/HelloEditorEntry";

/*
 * Making a Yumi hello: ?word=<saved word id> opens on that word,
 * ?from=lookup on the word just looked up (lib/hello/draft.ts). Either is
 * only where the editor starts; nothing is made until the reader presses
 * create.
 */
export default async function NewHelloPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const word = typeof params.word === "string" && /^[\w:-]{1,80}$/.test(params.word) ? params.word : undefined;
  return <HelloEditorEntry wordId={word} fromLookup={params.from === "lookup"} />;
}
