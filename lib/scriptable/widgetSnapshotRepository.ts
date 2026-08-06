import {
  parseScriptableYumiWidgetSnapshot,
  type ScriptableYumiWidgetSnapshot,
} from "@/lib/scriptable/widgetPayload";
import { createServiceClient } from "@/lib/supabase/service";

const SNAPSHOT_TABLE =
  "scriptable_yumi_snapshots";

const USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UnknownRecord =
  Record<string, unknown>;

function isRecord(
  value: unknown,
): value is UnknownRecord {
  return (
    typeof value === "object"
    && value !== null
    && !Array.isArray(value)
  );
}

function normalizeUserId(
  value: string,
): string {
  const userId = value.trim().toLowerCase();

  if (!USER_ID_PATTERN.test(userId)) {
    throw new TypeError(
      "A valid authenticated user ID is required.",
    );
  }

  return userId;
}

function parseSnapshotRow(
  value: unknown,
): ScriptableYumiWidgetSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  return parseScriptableYumiWidgetSnapshot({
    schemaVersion: value.schema_version,
    updatedAt: value.updated_at,
    payload: value.payload,
  });
}

/**
 * Stores the latest Yumi Widget snapshot for an authenticated user.
 *
 * This function uses the service role and must only be called after a route
 * has authenticated the user and derived userId from the verified session.
 */
export async function saveScriptableYumiWidgetSnapshot(
  userIdInput: string,
  snapshotInput: ScriptableYumiWidgetSnapshot,
): Promise<ScriptableYumiWidgetSnapshot> {
  const userId =
    normalizeUserId(userIdInput);

  const snapshot =
    parseScriptableYumiWidgetSnapshot(
      snapshotInput,
    );

  if (!snapshot) {
    throw new TypeError(
      "A valid Scriptable Yumi Widget snapshot is required.",
    );
  }

  const service =
    createServiceClient();

  const {
    data,
    error,
  } = await service
    .from(SNAPSHOT_TABLE)
    .upsert(
      {
        user_id: userId,
        schema_version:
          snapshot.schemaVersion,
        payload:
          snapshot.payload,
        updated_at:
          snapshot.updatedAt,
      },
      {
        onConflict: "user_id",
      },
    )
    .select(
      [
        "user_id",
        "schema_version",
        "payload",
        "created_at",
        "updated_at",
      ].join(","),
    )
    .single();

  if (error) {
    throw new Error(
      `Scriptable Yumi snapshot could not be saved (${error.code}).`,
    );
  }

  const storedSnapshot =
    parseSnapshotRow(
      data,
    );

  if (!storedSnapshot) {
    throw new Error(
      "The stored Scriptable Yumi snapshot was invalid.",
    );
  }

  return storedSnapshot;
}

/**
 * Reads the latest snapshot for a verified user.
 *
 * The caller must never accept userId directly from an untrusted request.
 */
export async function readScriptableYumiWidgetSnapshot(
  userIdInput: string,
): Promise<ScriptableYumiWidgetSnapshot | null> {
  const userId =
    normalizeUserId(userIdInput);

  const service =
    createServiceClient();

  const {
    data,
    error,
  } = await service
    .from(SNAPSHOT_TABLE)
    .select(
      [
        "user_id",
        "schema_version",
        "payload",
        "created_at",
        "updated_at",
      ].join(","),
    )
    .eq(
      "user_id",
      userId,
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Scriptable Yumi snapshot could not be loaded (${error.code}).`,
    );
  }

  if (!data) {
    return null;
  }

  const snapshot =
    parseSnapshotRow(
      data,
    );

  if (!snapshot) {
    throw new Error(
      "The saved Scriptable Yumi snapshot was invalid.",
    );
  }

  return snapshot;
}

/**
 * Deletes the current snapshot for a verified user.
 */
export async function deleteScriptableYumiWidgetSnapshot(
  userIdInput: string,
): Promise<void> {
  const userId =
    normalizeUserId(userIdInput);

  const service =
    createServiceClient();

  const {
    error,
  } = await service
    .from(SNAPSHOT_TABLE)
    .delete()
    .eq(
      "user_id",
      userId,
    );

  if (error) {
    throw new Error(
      `Scriptable Yumi snapshot could not be deleted (${error.code}).`,
    );
  }
}
