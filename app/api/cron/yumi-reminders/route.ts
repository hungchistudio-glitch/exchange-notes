import {
  NextRequest,
  NextResponse,
} from "next/server";
import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  sendWebPushToUser,
} from "@/lib/push/sendToUser";
import { DEFAULT_INTERFACE_LANGUAGE } from "@/lib/appPreferences";
import { readerLanguages } from "@/lib/push/readerLanguages";
import { yumiReminderCopy } from "@/lib/push/yumiReminderCopy";
import {
  createServiceClient,
} from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_TIME_ZONE =
  "America/New_York";

/*
 * The earliest local hour a reminder may be sent.
 *
 * The cron used to run once a day at 00:00 UTC and send to everyone it found
 * there, whatever o'clock it happened to be for them. That is 20:00 in New
 * York — which is where the hour came from — and 08:00 in Taipei, where the
 * local day the reminder is about has barely started, and 01:00 in Paris.
 * A "you have not fed Yumi today" arriving at one in the morning is about a
 * day that ends in an hour.
 *
 * Worse, it fired once. A reader whose quiet hours covered that single
 * instant was not delayed, they were skipped — every day, permanently, with
 * the run reporting it as a successful skip. Anyone in Europe with ordinary
 * night-time quiet hours could never have received one of these.
 *
 * So this runs hourly now and this is the gate: at or after eight in the
 * evening, in the reader's own zone. Quiet hours push the reminder to the
 * next hour that is not quiet rather than cancelling it, and the local date
 * on the delivery claim still holds it to one a day.
 *
 * The hourly knock does not come from vercel.json. Hobby triggers a cron
 * once a day and allows two, both already spoken for, so the cadence comes
 * from .github/workflows/yumi-reminders.yml — which is also where the setup
 * this depends on is written down. The daily entry in vercel.json stays as a
 * backstop; a second call in the same local day finds the claim made and
 * counts it as a duplicate.
 */
const REMINDER_LOCAL_HOUR = 20;

const RECENT_OPEN_WINDOW_MS =
  2 * 60 * 60 * 1000;

const MAX_USERS_PER_RUN = 500;

type PreferenceRow = {
  user_id: string;
  notification_level: string;
  sound_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  time_zone: string;
};

type PetStateRow = {
  last_fed_at: string | null;
  last_opened_at: string | null;
};

type LocalSnapshot = {
  date: string;
  minutes: number;
};

function validTimeZone(
  value: string | null | undefined,
): string {
  if (!value) {
    return DEFAULT_TIME_ZONE;
  }

  try {
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: value,
      },
    ).format(new Date());

    return value;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

function getLocalSnapshot(
  date: Date,
  timeZone: string,
): LocalSnapshot {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      },
    ).formatToParts(date);

  const values = new Map(
    parts.map((part) => [
      part.type,
      part.value,
    ]),
  );

  const year =
    values.get("year") ?? "1970";

  const month =
    values.get("month") ?? "01";

  const day =
    values.get("day") ?? "01";

  const hour = Number(
    values.get("hour") ?? "0",
  );

  const minute = Number(
    values.get("minute") ?? "0",
  );

  return {
    date: `${year}-${month}-${day}`,
    minutes: hour * 60 + minute,
  };
}

function localDateForTimestamp(
  value: string | null,
  timeZone: string,
): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return getLocalSnapshot(
    date,
    timeZone,
  ).date;
}

function parseClockMinutes(
  value: string | null,
): number | null {
  if (!value) {
    return null;
  }

  const match = value.match(
    /^(\d{1,2}):(\d{2})/,
  );

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
}

function isQuietTime(
  preferences: PreferenceRow,
  localMinutes: number,
): boolean {
  if (!preferences.quiet_hours_enabled) {
    return false;
  }

  const start = parseClockMinutes(
    preferences.quiet_hours_start,
  );

  const end = parseClockMinutes(
    preferences.quiet_hours_end,
  );

  if (
    start === null ||
    end === null ||
    start === end
  ) {
    return false;
  }

  if (start < end) {
    return (
      localMinutes >= start &&
      localMinutes < end
    );
  }

  return (
    localMinutes >= start ||
    localMinutes < end
  );
}

async function claimReminder(
  supabase: SupabaseClient,
  userId: string,
  localDate: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("yumi_reminder_deliveries")
    .insert({
      user_id: userId,
      local_date: localDate,
    });

  if (!error) {
    return true;
  }

  if (error.code === "23505") {
    return false;
  }

  throw new Error(
    `Yumi reminder claim failed: ${error.code}`,
  );
}

async function releaseReminder(
  supabase: SupabaseClient,
  userId: string,
  localDate: string,
): Promise<void> {
  const { error } = await supabase
    .from("yumi_reminder_deliveries")
    .delete()
    .eq("user_id", userId)
    .eq("local_date", localDate);

  if (error) {
    console.warn(
      "Yumi reminder claim could not be released:",
      {
        code: error.code,
        userId,
      },
    );
  }
}

async function markDelivered(
  supabase: SupabaseClient,
  userId: string,
  localDate: string,
): Promise<void> {
  const { error } = await supabase
    .from("yumi_reminder_deliveries")
    .update({
      delivered_at:
        new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("local_date", localDate);

  if (error) {
    console.warn(
      "Yumi reminder delivery timestamp could not be updated:",
      {
        code: error.code,
        userId,
      },
    );
  }
}

export async function GET(
  request: NextRequest,
) {
  const authHeader =
    request.headers.get("authorization");

  const expectedSecret =
    process.env.CRON_SECRET;

  if (
    !expectedSecret ||
    authHeader !==
      `Bearer ${expectedSecret}`
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const supabase =
    createServiceClient();

  const now = new Date();

  const summary = {
    candidates: 0,
    due: 0,
    delivered: 0,
    skippedDisabledLevel: 0,
    skippedWrongLocalHour: 0,
    skippedQuietHours: 0,
    skippedFedToday: 0,
    skippedRecentlyOpened: 0,
    skippedDuplicate: 0,
    noSubscription: 0,
    failed: 0,
  };

  try {
    const {
      data,
      error,
    } = await supabase
      .from("notification_preferences")
      .select(
        "user_id, notification_level, sound_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, time_zone",
      )
      .eq(
        "yumi_reminders_enabled",
        true,
      )
      .limit(MAX_USERS_PER_RUN);

    if (error) {
      throw new Error(
        `Yumi reminder preferences could not be loaded: ${error.code}`,
      );
    }

    const preferences =
      (data ?? []) as PreferenceRow[];

    summary.candidates =
      preferences.length;

    /*
     * Who this hour is for, decided before anything is fetched per reader.
     *
     * The cron runs hourly and most readers are not due in any given hour,
     * so the three cheap tests — the level they chose, the hour it is where
     * they are, and whether they asked for quiet — happen first. Everything
     * below costs a round trip and only runs for whoever is left.
     */
    const due: Array<{
      preference: PreferenceRow;
      timeZone: string;
      local: LocalSnapshot;
    }> = [];

    for (const preference of preferences) {
      if (
        preference.notification_level !==
        "all"
      ) {
        summary.skippedDisabledLevel += 1;
        continue;
      }

      const timeZone =
        validTimeZone(
          preference.time_zone,
        );

      const local =
        getLocalSnapshot(
          now,
          timeZone,
        );

      if (
        local.minutes <
        REMINDER_LOCAL_HOUR * 60
      ) {
        summary.skippedWrongLocalHour += 1;
        continue;
      }

      /*
       * Skipped for this hour, not for the day. The next run comes round in
       * an hour and the claim is still unmade, so a reader whose quiet hours
       * end before midnight gets the reminder then — which is what "quiet
       * hours" should have meant all along.
       */
      if (
        isQuietTime(
          preference,
          local.minutes,
        )
      ) {
        summary.skippedQuietHours += 1;
        continue;
      }

      due.push({
        preference,
        timeZone,
        local,
      });
    }

    summary.due = due.length;

    /*
     * Everyone's languages in one query, before the loop.
     *
     * Asking per user would be a round trip each, inside a job that already
     * runs against a sixty-second ceiling — the kind of thing that works
     * for ten readers and quietly stops working for a thousand. One `in`
     * for the whole run costs the same whoever turns up.
     */
    const languages = new Map(
      (
        await readerLanguages(
          supabase,
          due.map(
            (candidate) => candidate.preference.user_id,
          ),
        )
      ).map((reader) => [reader.userId, reader]),
    );

    for (
      const { preference, timeZone, local } of due
    ) {
      try {
        const {
          data: petState,
          error: petError,
        } = await supabase
          .from("yumi_pet_state")
          .select(
            "last_fed_at, last_opened_at",
          )
          .eq(
            "user_id",
            preference.user_id,
          )
          .maybeSingle();

        if (petError) {
          console.warn(
            "Yumi pet state could not be loaded:",
            {
              code: petError.code,
              userId:
                preference.user_id,
            },
          );
        }

        const pet =
          (petState ??
            {
              last_fed_at: null,
              last_opened_at: null,
            }) as PetStateRow;

        if (
          localDateForTimestamp(
            pet.last_fed_at,
            timeZone,
          ) === local.date
        ) {
          summary.skippedFedToday += 1;
          continue;
        }

        if (pet.last_opened_at) {
          const lastOpened =
            new Date(
              pet.last_opened_at,
            );

          if (
            !Number.isNaN(
              lastOpened.getTime(),
            ) &&
            now.getTime() -
              lastOpened.getTime() <
              RECENT_OPEN_WINDOW_MS
          ) {
            summary.skippedRecentlyOpened += 1;
            continue;
          }
        }

        const claimed =
          await claimReminder(
            supabase,
            preference.user_id,
            local.date,
          );

        if (!claimed) {
          summary.skippedDuplicate += 1;
          continue;
        }

        const reader = languages.get(
          preference.user_id,
        );

        const copy = await yumiReminderCopy(
          reader?.interfaceLanguage ??
            DEFAULT_INTERFACE_LANGUAGE,
          reader?.learningLanguage ?? null,
        );

        const result =
          await sendWebPushToUser(
            supabase,
            preference.user_id,
            {
              title: copy.title,
              body: copy.body,
              url: "/vocabulary",
              tag:
                `yumi-reminder-${local.date}`,
              renotify: false,
              silent:
                preference.sound_enabled ===
                false,
              data: {
                kind: "yumi-reminder",
                localDate: local.date,
              },
            },
            {
              ttlSeconds:
                6 * 60 * 60,
            },
          );

        if (result.delivered > 0) {
          summary.delivered +=
            result.delivered;

          await markDelivered(
            supabase,
            preference.user_id,
            local.date,
          );

          continue;
        }

        await releaseReminder(
          supabase,
          preference.user_id,
          local.date,
        );

        if (result.total === 0) {
          summary.noSubscription += 1;
        } else {
          summary.failed += 1;
        }
      } catch (userError) {
        summary.failed += 1;

        console.error(
          "A Yumi reminder candidate failed:",
          {
            message:
              userError instanceof Error
                ? userError.message
                : "Unknown error",
            userId:
              preference.user_id,
          },
        );
      }
    }

    return NextResponse.json({
      ok: true,
      ...summary,
      generatedAt:
        now.toISOString(),
    });
  } catch (error) {
    console.error(
      "Yumi reminder cron failed:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Yumi reminders could not be processed.",
      },
      {
        status: 500,
      },
    );
  }
}
