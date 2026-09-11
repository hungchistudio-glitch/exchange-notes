import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("web-push", () => ({ default: push }));

import { sendWebPushNotification } from "@/lib/push/sendWebPush";

beforeEach(() => {
  process.env.VAPID_SUBJECT = "mailto:security@example.com";
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-key";
  process.env.VAPID_PRIVATE_KEY = "private-key";
  push.setVapidDetails.mockReset();
  push.sendNotification.mockReset();
});

describe("Web Push outbound boundary", () => {
  it("fails a stored attacker endpoint without making a network request", async () => {
    await expect(
      sendWebPushNotification(
        {
          endpoint: "https://127.0.0.1/internal",
          p256dh: "p".repeat(32),
          auth: "a".repeat(16),
        },
        { title: "test" },
      ),
    ).resolves.toMatchObject({ ok: false, state: "failed" });

    expect(push.sendNotification).not.toHaveBeenCalled();
  });
});
