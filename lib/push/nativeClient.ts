export type NativePushTokenPayload = {
  token: string;
  environment:
    | "development"
    | "production";
  bundleId:
    "art.hungchi.exchangenotes";
};

let currentNativePushToken:
  | NativePushTokenPayload
  | null = null;

export function setCurrentNativePushToken(
  payload: NativePushTokenPayload,
) {
  currentNativePushToken = payload;
}

export async function registerNativePushToken(
  payload: NativePushTokenPayload,
): Promise<void> {
  const response = await fetch(
    "/api/push/native-token",
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      "Native Push token could not be registered.",
    );
  }
}

export async function disableNativePushRegistration():
  Promise<void>
{
  const payload = currentNativePushToken;

  currentNativePushToken = null;

  if (!payload) {
    return;
  }

  try {
    await fetch(
      "/api/push/native-token",
      {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: payload.token,
        }),
      },
    );
  } catch {
    console.warn(
      "Native Push token could not be disabled before sign-out.",
    );
  }
}
