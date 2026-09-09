"use client";

import { useEffect } from "react";

import { getDeviceTimeZone } from "@/lib/push/deviceTimeZone";
import { createClient } from "@/lib/supabase/client";

/*
 * Keeps the account's idea of where this reader is in step with the device.
 *
 * The zone already existed, but only Yumi's reminder settings ever wrote it —
 * so anyone who had not opened that screen was stored as America/New_York, the
 * column's default. That was survivable while the only thing reading it was a
 * reminder nobody had enabled. It stopped being survivable when the daily AI
 * allowance started rolling over on the reader's own midnight, because a
 * reader in Taipei filed under New York gets their allowance back at lunchtime.
 *
 * Written from the device rather than chosen, and only when it changes: the
 * IANA name is stable across daylight saving (Postgres applies that itself),
 * so in practice this writes once, and again only if the reader travels or
 * moves to a new device.
 */

const LAST_WRITTEN_KEY = "exchange-notes:device-time-zone";

type Props = { userId: string };

export default function DeviceTimeZoneSync({ userId }: Props) {
  useEffect(() => {
    const timeZone = getDeviceTimeZone();

    let lastWritten: string | null = null;

    try {
      lastWritten = window.localStorage.getItem(LAST_WRITTEN_KEY);
    } catch {
      // Private mode, or storage blocked. Falling through means the write
      // happens once per load rather than once per change, which is a cost
      // and not a failure.
    }

    if (lastWritten === timeZone) return;

    let cancelled = false;
    const supabase = createClient();

    /*
     * Only the two columns are sent. PostgREST's upsert updates exactly the
     * columns given, so an existing row keeps its reminder settings and a new
     * one takes the table's own defaults — notably yumi_reminders_enabled,
     * which defaults to false. Nobody is opted into anything by being located.
     */
    void supabase
      .from("notification_preferences")
      .upsert(
        { user_id: userId, time_zone: timeZone, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      )
      .then(({ error }) => {
        if (cancelled || error) return;

        try {
          window.localStorage.setItem(LAST_WRITTEN_KEY, timeZone);
        } catch {
          // See above.
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return null;
}
