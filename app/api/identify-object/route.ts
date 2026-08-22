import { readLearningPair } from "@/lib/profile/languagePair";
import { NextResponse } from "next/server";

import {
  identifyObject,
  getCachedObjectIdentification,
  ObjectIdentificationUnavailableError,
} from "@/lib/ai/identifyObject";
import { createClient } from "@/lib/supabase/server";
import { readBoundedInteger } from "@/lib/ai/modelConfig";

export const runtime = "nodejs";

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
const MAX_REQUESTS_PER_DAY = readBoundedInteger(
  process.env.VISION_DAILY_USER_LIMIT,
  15,
  1,
  100,
);

type RequestWindow = {
  count: number;
  resetsAt: number;
};

const requestWindows = new Map<string, RequestWindow>();
const dailyRequestWindows = new Map<string, RequestWindow>();
let persistentQuotaUnavailable = false;

function decodedByteLength(base64: string) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

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

function consumeMemoryDailyRequest(userId: string) {
  const now = Date.now();
  const dayKey = new Date(now).toISOString().slice(0, 10);
  const dailyKey = `${userId}:${dayKey}`;
  const dailyWindow = dailyRequestWindows.get(dailyKey);

  if (dailyWindow && dailyWindow.count >= MAX_REQUESTS_PER_DAY) {
    return false;
  }

  if (!dailyWindow) {
    const tomorrowUtc = new Date(`${dayKey}T00:00:00.000Z`).getTime()
      + 24 * 60 * 60 * 1000;
    dailyRequestWindows.set(dailyKey, {
      count: 1,
      resetsAt: tomorrowUtc,
    });
  } else {
    dailyWindow.count += 1;
  }

  return true;
}

async function consumeDailyRequest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  if (!persistentQuotaUnavailable) {
    const { data, error } = await supabase.rpc("consume_ai_daily_quota", {
      p_operation: "vision_identification",
      p_limit: MAX_REQUESTS_PER_DAY,
    });

    if (!error) {
      const rows = data as Array<{ allowed?: boolean }> | null;
      return rows?.[0]?.allowed === true;
    }

    persistentQuotaUnavailable = true;
    console.warn(
      "Persistent AI quota is unavailable; using the in-memory safety limit.",
      { code: error.code },
    );
  }

  return consumeMemoryDailyRequest(userId);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
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

    if (!(await consumeDailyRequest(supabase, user.id))) {
      return NextResponse.json(
        {
          error:
            "Today's free image limit has been reached. Please try again tomorrow.",
          code: "daily_limit",
        },
        { status: 429 },
      );
    }

    const result = await identifyObject(imageBase64, mediaType, languagePair);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, no-store",
        "X-AI-Cache": "miss",
      },
    });
  } catch (error) {
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
