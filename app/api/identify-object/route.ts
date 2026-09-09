import { readLearningPair } from "@/lib/profile/languagePair";
import { NextResponse } from "next/server";

import {
  identifyObject,
  getCachedObjectIdentification,
  ObjectIdentificationUnavailableError,
} from "@/lib/ai/identifyObject";
import { createClient } from "@/lib/supabase/server";
import { consumeDailyQuota, refundDailyQuota } from "@/lib/ai/dailyQuota";
import { readBoundedInteger } from "@/lib/ai/modelConfig";

export const runtime = "nodejs";

const OPERATION = "vision_identification" as const;

const MAX_IMAGE_BYTES = readBoundedInteger(
  process.env.VISION_MAX_IMAGE_BYTES,
  4 * 1024 * 1024,
  512 * 1024,
  8 * 1024 * 1024,
);
const MAX_REQUESTS_PER_MINUTE = readBoundedInteger(
  process.env.VISION_REQUESTS_PER_MINUTE,
  10,
  1,
  60,
);

/*
 * Sixty a day, not fifteen.
 *
 * Fifteen was a guess made before anyone had used the feature, and the usage
 * table says it was the binding constraint rather than a safety margin: a
 * reader walking around naming things reached it in an afternoon and then had
 * the camera refuse them until midnight UTC. Nothing outside this app was
 * limiting them — the model's own free allowance is in the hundreds of
 * requests a day and is shared across every reader, not per reader, so the
 * number here was rationing headroom that existed.
 *
 * It stays a limit rather than becoming none, because a runaway client with
 * a valid session should cost an afternoon's allowance and not the project's.
 * The ceiling on the override is what an operator may raise it to, and it is
 * deliberately far above the default.
 */
const MAX_REQUESTS_PER_DAY = readBoundedInteger(
  process.env.VISION_DAILY_USER_LIMIT,
  60,
  1,
  500,
);

type RequestWindow = {
  count: number;
  resetsAt: number;
};

const requestWindows = new Map<string, RequestWindow>();

function decodedByteLength(base64: string) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * The burst limit, which stays in memory on purpose.
 *
 * It exists to stop one client hammering the endpoint, and a per-instance
 * counter is enough for that. The daily allowance is the one that has to
 * survive a cold start, and it lives in the database.
 */
function consumeMinuteRequest(userId: string) {
  const now = Date.now();
  const minuteWindow = requestWindows.get(userId);

  if (
    minuteWindow &&
    minuteWindow.resetsAt > now &&
    minuteWindow.count >= MAX_REQUESTS_PER_MINUTE
  ) {
    return false;
  }

  if (!minuteWindow || minuteWindow.resetsAt <= now) {
    requestWindows.set(userId, {
      count: 1,
      resetsAt: now + 60 * 1000,
    });
  } else {
    minuteWindow.count += 1;
  }

  return true;
}

export async function POST(request: Request) {
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  let charged: string | null = null;

  try {
    supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in before identifying an image." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as { image?: string };
    const imageMatch = body.image?.match(
      /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/,
    );

    if (!imageMatch) {
      return NextResponse.json(
        { error: "Please provide a valid JPEG, PNG, WEBP, or GIF image." },
        { status: 400 },
      );
    }

    const mediaType = imageMatch[1];
    const imageBase64 = imageMatch[2];

    if (decodedByteLength(imageBase64) > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "The processed image is too large." },
        { status: 413 },
      );
    }

    const languagePair = await readLearningPair(supabase, user.id);

    // Before the allowance is touched: an answer we already have costs the
    // reader nothing.
    const cached = getCachedObjectIdentification(imageBase64, languagePair);

    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "private, no-store",
          "X-AI-Cache": "hit",
        },
      });
    }

    if (!consumeMinuteRequest(user.id)) {
      return NextResponse.json(
        {
          error: "Too many image requests. Please wait a moment.",
          code: "rate_limit",
        },
        { status: 429 },
      );
    }

    if (
      !(await consumeDailyQuota(
        supabase,
        user.id,
        OPERATION,
        MAX_REQUESTS_PER_DAY,
      ))
    ) {
      return NextResponse.json(
        {
          error:
            "Today's free image limit has been reached. Please try again tomorrow.",
          code: "daily_limit",
        },
        { status: 429 },
      );
    }

    /*
     * Spent. From here every exit that is not an answer has to hand it back,
     * which is what `charged` tracks — the model call is the only thing left
     * that can fail, and it fails by timing out more often than by anything
     * else.
     */
    charged = user.id;

    const result = await identifyObject(imageBase64, mediaType, languagePair);
    charged = null;

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, no-store",
        "X-AI-Cache": "miss",
      },
    });
  } catch (error) {
    if (supabase && charged) {
      await refundDailyQuota(supabase, charged, OPERATION);
    }

    if (error instanceof ObjectIdentificationUnavailableError) {
      return NextResponse.json(
        { error: "AI vision is temporarily busy. Please try again shortly." },
        { status: 503 },
      );
    }

    console.error("Object identification route failed:", {
      name: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      { error: "The image could not be identified. Please try another photo." },
      { status: 500 },
    );
  }
}
