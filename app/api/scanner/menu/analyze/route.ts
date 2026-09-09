import { readLanguageCode } from "@/lib/languages";
import { readLearningPair } from "@/lib/profile/languagePair";
import { NextResponse } from "next/server";

import {
  MenuScanTimeoutError,
  MenuScanUnavailableError,
  scanMenu,
} from "@/lib/ai/menuScan";
import { readBoundedInteger } from "@/lib/ai/modelConfig";
import { consumeDailyQuota, refundDailyQuota } from "@/lib/ai/dailyQuota";
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
/*
 * Doubled, for the same reason the vision allowance was: twenty was a number
 * chosen before the feature had users, and a menu is re-photographed several
 * times over one meal — a page at a time, then a corner that came out blurred.
 * Each of those attempts spent a unit.
 */
const MAX_REQUESTS_PER_DAY = readBoundedInteger(
  process.env.MENU_SCAN_DAILY_USER_LIMIT,
  40,
  1,
  200,
);

const OPERATION = "menu_scan" as const;

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
 * The burst limit, which stays in memory on purpose: it exists to stop one
 * client hammering the endpoint, and a per-instance counter is enough. The
 * daily allowance has to survive a cold start, so it lives in the database.
 */
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
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  let charged: string | null = null;

  try {
    supabase = await createClient();
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

    /*
     * Two languages come back from a scan — the user's own pair — and the
     * target decides which of them leads on screen. Clamped to that pair
     * rather than trusted: leading with a language the scan does not contain
     * shows the printed line where a translation should be.
     *
     * The client still sends the prose encoding, and readLanguageCode takes
     * either that or a code, so the two can cross over independently.
     */
    const languagePair = await readLearningPair(supabase, user.id);

    const requested = readLanguageCode(body.targetLanguage);
    const targetLanguage =
      requested && languagePair.includes(requested)
        ? requested
        : languagePair[0];

    if (!consumeMinuteRequest(user.id)) {
      return failed(
        "Too many menu scans. Please wait a moment.",
        "rate_limit",
        429,
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
      return failed(
        "Today's free menu-scan limit has been reached.",
        "daily_limit",
        429,
      );
    }

    /*
     * Spent. A scan that times out — and a menu gets forty-five seconds, so
     * the ones that do are genuinely stuck — used to be charged exactly like
     * a menu that came back translated.
     */
    charged = user.id;

    const { document, isMenu } = await scanMenu(
      imageBase64,
      mediaType,
      targetLanguage,
      languagePair,
    );

    /*
     * The model answered, so the unit stays spent even here: "this is not a
     * menu" is a real read of the photograph and cost a real call.
     */
    charged = null;

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
    if (supabase && charged) {
      await refundDailyQuota(supabase, charged, OPERATION);
    }

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
