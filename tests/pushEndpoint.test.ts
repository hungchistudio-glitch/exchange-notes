import { describe, expect, it } from "vitest";

import {
  normalizeHttpsPushEndpoint,
  normalizeTrustedPushEndpoint,
} from "@/lib/push/endpoint";

describe("Web Push endpoint validation", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/token",
    "https://updates.push.services.mozilla.com/wpush/v2/token",
    "https://web.push.apple.com/QD-token",
    "https://wns2-am3p.notify.windows.com/w/?token=abc",
  ])("accepts a browser push service: %s", (endpoint) => {
    expect(normalizeTrustedPushEndpoint(endpoint)).toBe(endpoint);
  });

  it.each([
    "https://attacker.example/collect",
    "https://127.0.0.1/internal",
    "https://fcm.googleapis.com.attacker.example/send",
    "https://fcm.googleapis.com@attacker.example/send",
    "http://fcm.googleapis.com/send",
    "https://fcm.googleapis.com:8443/send",
  ])("rejects an unsafe outbound destination: %s", (endpoint) => {
    expect(normalizeTrustedPushEndpoint(endpoint)).toBeNull();
  });

  it("still permits a legacy HTTPS endpoint to be removed", () => {
    expect(normalizeHttpsPushEndpoint("https://legacy.example/push")).toBe(
      "https://legacy.example/push",
    );
  });
});
