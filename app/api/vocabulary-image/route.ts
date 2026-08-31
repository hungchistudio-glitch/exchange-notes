import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { VOCABULARY_BUCKET } from "@/lib/media/record";

/* =========================================================
   One door to a vocabulary picture

   The bucket used to be public, which meant every photograph anyone had
   ever saved was readable by anyone holding the URL — and those URLs were
   sitting in message bodies. It is private now, so something has to decide
   who may see what, and this is that something.

   Two answers are yes. You own it, which is the ordinary case and covers a
   reader looking at their own library. Or it is an image somebody
   deliberately shared into a conversation you are a member of, which is the
   case that exists because a word card sent to a friend should show its
   picture rather than a broken frame.

   Everything else is no, including "we are friends" on its own. Friendship
   is not consent to read someone's entire camera roll; being sent one card
   is consent to see that card.
   ========================================================= */

export const runtime = "nodejs";

/**
 * How long a signed link lives.
 *
 * Short, because the browser is redirected to it and follows it
 * immediately. It is not a link anybody keeps — the thing that gets kept is
 * the route URL, which is re-authorised on every use.
 *
 * Comfortably longer than the redirect's own cache lifetime below, so a
 * cached redirect can never outlive the signature it points at.
 */
const SIGNED_URL_TTL_SECONDS = 60 * 90;

/**
 * The folder a shared copy goes in.
 *
 * Sharing writes its own copy rather than pointing at the library asset, so
 * that a reader deleting a word does not blank out a card they sent someone
 * three months ago — and so that "may this person see this file" can be
 * answered from the path alone.
 */
const SHARED_SEGMENT = "shared";

function ownerOf(path: string): string | null {
  const [owner] = path.split("/");

  // A uuid, and nothing that could climb out of the folder.
  return owner &&
    /^[0-9a-f-]{36}$/i.test(owner) &&
    !path.includes("..")
    ? owner
    : null;
}

function isSharedAsset(path: string): boolean {
  return path.split("/")[1] === SHARED_SEGMENT;
}

/**
 * Do these two people have a conversation in common?
 *
 * Asked with the service role because the requester cannot see the other
 * person's membership rows under RLS, and the question is about both of
 * them. Two narrow reads, intersected here rather than in a join, because
 * conversation_members has no policy that would let one query see both
 * sides.
 */
async function sharesConversation(
  requesterId: string,
  ownerId: string,
): Promise<boolean> {
  const service = createServiceClient();

  const [mine, theirs] = await Promise.all([
    service
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", requesterId),
    service
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", ownerId),
  ]);

  if (mine.error || theirs.error || !mine.data || !theirs.data) return false;

  const ours = new Set(mine.data.map((row) => row.conversation_id));

  return theirs.data.some((row) => ours.has(row.conversation_id));
}

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "A path is required." }, { status: 400 });
  }

  const owner = ownerOf(path);

  if (!owner) {
    return NextResponse.json({ error: "Not a valid path." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const permitted =
    user.id === owner ||
    (isSharedAsset(path) && (await sharesConversation(user.id, owner)));

  if (!permitted) {
    /*
     * 404 rather than 403. A 403 confirms the file exists, which turns this
     * route into a way to ask whether a given reader has a given image.
     */
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  /*
   * Signed with the service role in both cases. The owner would pass RLS on
   * their own object, but using one path for both keeps the authorisation
   * decision in the block above rather than half here and half in a policy.
   */
  const { data, error } = await createServiceClient()
    .storage.from(VOCABULARY_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl, {
    status: 307,
    headers: {
      /*
       * Private, and for rather less than the signature's own life so the
       * browser comes back for a fresh redirect before the URL it was given
       * goes stale.
       *
       * An hour rather than five minutes. Every image on a vocabulary card
       * is a function invocation now that the bucket is private, and five
       * minutes meant a reader who scrolled their library twice in an
       * afternoon paid for all of them twice. The signature outlives this
       * by a wide margin, so nothing here can hand back a link that has
       * already expired.
       */
      "Cache-Control": "private, max-age=3600",
    },
  });
}
