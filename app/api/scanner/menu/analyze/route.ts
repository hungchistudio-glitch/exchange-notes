import { NextResponse } from "next/server";

import {
  MenuScanTimeoutError,
  MenuScanUnavailableError,
  scanMenu,
} from "@/lib/ai/menuScan";
import { readBoundedInteger } from "@/lib/ai/modelConfig";
import { createClient } from "@/lib/supabase/server";
import type { MenuAnalyzeResponse } from "@/lib/scanner/menuTypes";

export const runtime = "nodejs";

// Bigger than the object-identification ceiling on purpose: a menu is small
// type read from a photograph, and the pixels are the accuracy.
const MAX_IMAGE_BYTES = readBoundedInteger(
  process.env.MENU_SCAN_MAX_IMAGE_BYTES,
  8 * 1024 * 1024,
  1024 * 1024,
  12 * 1024 * 1024,
);
const MAX_REQUESTS_PER_MINUTE = readBoundedInteger(
  process.env.MENU_SCAN_REQUESTS_PER_MINUTE,
  6,
  1,
  30,
);
const MAX_REQUESTS_PER_DAY = readBoundedInteger(
  process.env.MENU_SCAN_DAILY_USER_LIMIT,
  20,
  1,
  100,
);

const TARGET_LANGUAGE_NAMES: Record<string, string> = {
  english: "English",
  "traditional-chinese": "Traditional Chinese (繁體中文)",
};

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
  const window = requestWindows.get(userId);

  if (window && window.resetsAt > now && window.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  if (!window || window.resetsAt <= now) {
    requestWindows.set(userId, { count: 1, resetsAt: now + 60 * 1000 });
  } else {
    window.count += 1;
  }

  return true;
}

function consumeMemoryDailyRequest(userId: string) {
  const now = Date.now();
  const dayKey = new Date(now).toISOString().slice(0, 10);
  const dailyKey = `${userId}:${dayKey}`;
  const window = dailyRequestWindows.get(dailyKey);

  if (window && window.count >= MAX_REQUESTS_PER_DAY) return false;

  if (!window) {
    const tomorrowUtc =
      new Date(`${dayKey}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000;
    dailyRequestWindows.set(dailyKey, { count: 1, resetsAt: tomorrowUtc });
  } else {
    window.count += 1;
  }

  return true;
}

async function consumeDailyRequest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  if (!persistentQuotaUnavailable) {
    const { data, error } = await supabase.rpc("consume_ai_daily_quota", {
      p_operation: "menu_scan",
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

function failed(
  error: string,
  code: string,
  status: number,
  stage: "ocr" | "translation" = "ocr",
) {
  const body: MenuAnalyzeResponse = {
    id: "",
    state: "failed",
    progress: {
      ocr: stage === "ocr" ? "failed" : "completed",
      translation: stage === "translation" ? "failed" : "pending",
      reconstruction: "pending",
    },
    document: null,
    error,
    code,
  };

  return NextResponse.json(body, { status });
}

/*
 * One request, three reported stages.
 *
 * The image never touches storage: it is read, translated and dropped inside
 * this handler. Menus are photographs a user took of somewhere they are
 * sitting right now, and nothing here needs them a second time — saving a
 * menu is a deliberate act on the client, from an image the client already
 * holds.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return failed(
        "Please sign in before scanning a menu.",
        "authentication_required",
        401,
      );
    }

    const body = (await request.json()) as {
      image?: string;
      targetLanguage?: string;
    };

    const imageMatch = body.image?.match(
      /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/,
    );

    if (!imageMatch) {
      return failed(
        "Please provide a valid JPEG, PNG, or WEBP image.",
        "invalid_image",
        400,
      );
    }

    const mediaType = imageMatch[1];
    const imageBase64 = imageMatch[2];

    if (decodedByteLength(imageBase64) > MAX_IMAGE_BYTES) {
      return failed("The photo is too large to read.", "image_too_large", 413);
    }

    const targetLanguage =
      body.targetLanguage === "english" ||
      body.targetLanguage === "traditional-chinese"
        ? body.targetLanguage
        : "english";

    if (!consumeMinuteRequest(user.id)) {
      return failed(
        "Too many menu scans. Please wait a moment.",
        "rate_limit",
        429,
      );
    }

    if (!(await consumeDailyRequest(supabase, user.id))) {
      return failed(
        "Today's free menu-scan limit has been reached.",
        "daily_limit",
        429,
      );
    }

    const { document, isMenu } = await scanMenu(
      imageBase64,
      mediaType,
      targetLanguage,
      TARGET_LANGUAGE_NAMES[targetLanguage],
    );

    if (!document) {
      const response: MenuAnalyzeResponse = {
        id: crypto.randomUUID(),
        state: "failed",
        progress: {
          ocr: isMenu ? "completed" : "failed",
          translation: "failed",
          reconstruction: "pending",
        },
        document: null,
        notMenu: !isMenu,
        code: isMenu ? "no_items_found" : "not_a_menu",
      };

      return NextResponse.json(response, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    /*
     * "partial" rather than "translation_ready" when the model told us it was
     * unsure of the read. The menu is still shown — the state is what lets the
     * viewer say so instead of presenting a guess as a fact.
     */
    const response: MenuAnalyzeResponse = {
      id: crypto.randomUUID(),
      state:
        document.overallConfidence === "low" ? "partial" : "translation_ready",
      progress: {
        ocr: "completed",
        translation: "completed",
        // Premium reconstruction is a later stage of this feature and has not
        // shipped; reporting it as pending is the honest answer, and the
        // viewer already knows how to show a menu without it.
        reconstruction: "pending",
      },
      document,
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof MenuScanTimeoutError) {
      return failed(
        "Reading the menu took too long. Try a tighter photo of one page.",
        "timeout",
        504,
      );
    }

    if (error instanceof MenuScanUnavailableError) {
      return failed(
        "Menu scanning is temporarily busy. Please try again shortly.",
        "unavailable",
        503,
      );
    }

    console.error("Menu scan route failed:", {
      name: error instanceof Error ? error.name : "UnknownError",
    });

    return failed(
      "The menu could not be read. Please try another photo.",
      "unknown",
      500,
    );
  }
}
