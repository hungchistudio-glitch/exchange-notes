import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import {
  createServiceClient,
} from "@/lib/supabase/service";

const TOKEN_TABLE =
  "scriptable_yumi_tokens";

const TOKEN_NAMESPACE =
  "ensw_";

const TOKEN_RANDOM_BYTES = 32;
const TOKEN_PREFIX_LENGTH = 12;

const TOKEN_PATTERN =
  /^ensw_[A-Za-z0-9_-]{43}$/;

const TOKEN_HASH_PATTERN =
  /^[0-9a-f]{64}$/;

const USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UnknownRecord =
  Record<string, unknown>;

export type ScriptableYumiTokenStatus = {
  prefix: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  active: boolean;
};

export type IssuedScriptableYumiToken =
  ScriptableYumiTokenStatus & {
    token: string;
  };

function isRecord(
  value: unknown,
): value is UnknownRecord {
  return (
    typeof value === "object"
    && value !== null
    && !Array.isArray(value)
  );
}

function parseUserId(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const userId =
    value.trim().toLowerCase();

  return USER_ID_PATTERN.test(userId)
    ? userId
    : null;
}

function requireUserId(
  value: string,
): string {
  const userId = parseUserId(value);

  if (!userId) {
    throw new TypeError(
      "A valid authenticated user ID is required.",
    );
  }

  return userId;
}

function parseTimestamp(
  value: unknown,
): string | null {
  if (
    typeof value !== "string"
    || Number.isNaN(Date.parse(value))
  ) {
    return null;
  }

  return value;
}

function parseNullableTimestamp(
  value: unknown,
): string | null | undefined {
  if (value === null) {
    return null;
  }

  const timestamp =
    parseTimestamp(value);

  return timestamp ?? undefined;
}

function parseTokenStatus(
  value: unknown,
): ScriptableYumiTokenStatus | null {
  if (!isRecord(value)) {
    return null;
  }

  const prefix =
    typeof value.token_prefix === "string"
      ? value.token_prefix.trim()
      : "";

  const createdAt =
    parseTimestamp(value.created_at);

  const updatedAt =
    parseTimestamp(value.updated_at);

  const lastUsedAt =
    parseNullableTimestamp(
      value.last_used_at,
    );

  const revokedAt =
    parseNullableTimestamp(
      value.revoked_at,
    );

  if (
    prefix.length < 8
    || prefix.length > 24
    || !createdAt
    || !updatedAt
    || lastUsedAt === undefined
    || revokedAt === undefined
  ) {
    return null;
  }

  return {
    prefix,
    createdAt,
    updatedAt,
    lastUsedAt,
    revokedAt,
    active: revokedAt === null,
  };
}

export function normalizeScriptableYumiToken(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const token = value.trim();

  return TOKEN_PATTERN.test(token)
    ? token
    : null;
}

export function extractScriptableYumiBearerToken(
  authorizationHeader: string | null,
): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const match =
    authorizationHeader.match(
      /^Bearer\s+(.+)$/i,
    );

  return normalizeScriptableYumiToken(
    match?.[1],
  );
}

function hashToken(
  token: string,
): string {
  return createHash("sha256")
    .update(token, "utf8")
    .digest("hex");
}

function hashesMatch(
  left: string,
  right: string,
): boolean {
  if (
    !TOKEN_HASH_PATTERN.test(left)
    || !TOKEN_HASH_PATTERN.test(right)
  ) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(left, "hex"),
    Buffer.from(right, "hex"),
  );
}

/**
 * Generates a new personal token and invalidates the user's previous token.
 *
 * The plaintext token is returned once and is never stored in PostgreSQL.
 */
export async function issueScriptableYumiToken(
  userIdInput: string,
): Promise<IssuedScriptableYumiToken> {
  const userId =
    requireUserId(userIdInput);

  const token =
    TOKEN_NAMESPACE
    + randomBytes(TOKEN_RANDOM_BYTES)
      .toString("base64url");

  const tokenHash =
    hashToken(token);

  const tokenPrefix =
    token.slice(
      0,
      TOKEN_PREFIX_LENGTH,
    );

  const now =
    new Date().toISOString();

  const service =
    createServiceClient();

  const {
    data,
    error,
  } = await service
    .from(TOKEN_TABLE)
    .upsert(
      {
        user_id: userId,
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
        created_at: now,
        updated_at: now,
        last_used_at: null,
        revoked_at: null,
      },
      {
        onConflict: "user_id",
      },
    )
    .select(
      "token_prefix, created_at, updated_at, last_used_at, revoked_at",
    )
    .single();

  if (error) {
    throw new Error(
      `Scriptable token could not be created (${error.code}).`,
    );
  }

  const status =
    parseTokenStatus(data);

  if (!status || !status.active) {
    throw new Error(
      "The created Scriptable token record was invalid.",
    );
  }

  return {
    token,
    ...status,
  };
}

export async function readScriptableYumiTokenStatus(
  userIdInput: string,
): Promise<ScriptableYumiTokenStatus | null> {
  const userId =
    requireUserId(userIdInput);

  const service =
    createServiceClient();

  const {
    data,
    error,
  } = await service
    .from(TOKEN_TABLE)
    .select(
      "token_prefix, created_at, updated_at, last_used_at, revoked_at",
    )
    .eq(
      "user_id",
      userId,
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Scriptable token status could not be loaded (${error.code}).`,
    );
  }

  if (!data) {
    return null;
  }

  const status =
    parseTokenStatus(data);

  if (!status) {
    throw new Error(
      "The saved Scriptable token record was invalid.",
    );
  }

  return status;
}

export async function revokeScriptableYumiToken(
  userIdInput: string,
): Promise<boolean> {
  const userId =
    requireUserId(userIdInput);

  const now =
    new Date().toISOString();

  const service =
    createServiceClient();

  const {
    data,
    error,
  } = await service
    .from(TOKEN_TABLE)
    .update({
      revoked_at: now,
      updated_at: now,
    })
    .eq(
      "user_id",
      userId,
    )
    .is(
      "revoked_at",
      null,
    )
    .select("user_id")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Scriptable token could not be revoked (${error.code}).`,
    );
  }

  return Boolean(data);
}

/**
 * Validates a bearer token and returns its owning user ID.
 *
 * This function is intended for the future public Scriptable Widget endpoint.
 */
export async function authenticateScriptableYumiToken(
  tokenInput: string,
): Promise<string | null> {
  const token =
    normalizeScriptableYumiToken(
      tokenInput,
    );

  if (!token) {
    return null;
  }

  const requestedHash =
    hashToken(token);

  const service =
    createServiceClient();

  const {
    data,
    error,
  } = await service
    .from(TOKEN_TABLE)
    .select(
      "user_id, token_hash, revoked_at",
    )
    .eq(
      "token_hash",
      requestedHash,
    )
    .is(
      "revoked_at",
      null,
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Scriptable token could not be verified (${error.code}).`,
    );
  }

  if (!isRecord(data)) {
    return null;
  }

  const userId =
    parseUserId(data.user_id);

  const storedHash =
    typeof data.token_hash === "string"
      ? data.token_hash
      : "";

  if (
    !userId
    || !hashesMatch(
      requestedHash,
      storedHash,
    )
  ) {
    return null;
  }

  const now =
    new Date().toISOString();

  const {
    error: lastUsedError,
  } = await service
    .from(TOKEN_TABLE)
    .update({
      last_used_at: now,
      updated_at: now,
    })
    .eq(
      "user_id",
      userId,
    )
    .eq(
      "token_hash",
      requestedHash,
    )
    .is(
      "revoked_at",
      null,
    );

  if (lastUsedError) {
    console.error(
      "Scriptable token last-used timestamp could not be updated.",
      {
        code: lastUsedError.code,
        userId,
      },
    );
  }

  return userId;
}
