import { beforeEach, describe, expect, it, vi } from "vitest";

import { ACCOUNT_DELETE_CONFIRMATION } from "@/lib/account/deletion";

const session = vi.hoisted(() => ({
  getUser: vi.fn(),
  signOut: vi.fn(),
}));
const admin = vi.hoisted(() => ({
  rpc: vi.fn(),
  remove: vi.fn(),
  from: vi.fn(),
  deleteUser: vi.fn(),
  calls: [] as string[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: session }),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    rpc: admin.rpc,
    storage: { from: admin.from },
    auth: { admin: { deleteUser: admin.deleteUser } },
  }),
}));

import { DELETE } from "@/app/api/account/route";

function request(body: unknown = { confirm: ACCOUNT_DELETE_CONFIRMATION }, json = true) {
  return new Request("https://exchange-notes-app.vercel.app/api/account", {
    method: "DELETE",
    headers: json ? { "Content-Type": "application/json" } : {},
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  admin.calls = [];
  session.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  session.signOut.mockResolvedValue({ error: null });
  admin.rpc.mockImplementation(async () => {
    admin.calls.push("rpc");
    return {
      data: [
        { bucket_id: "avatars", object_name: "user-1/profile.jpg" },
        { bucket_id: "vocabulary-images", object_name: "user-1/a/card.webp" },
      ],
      error: null,
    };
  });
  admin.remove.mockImplementation(async () => {
    admin.calls.push("remove");
    return { data: [], error: null };
  });
  admin.from.mockImplementation(() => ({ remove: admin.remove }));
  admin.deleteUser.mockImplementation(async () => {
    admin.calls.push("deleteUser");
    return { data: {}, error: null };
  });
});

describe("DELETE /api/account", () => {
  it("removes the reader's files, then the account, then the session", async () => {
    const response = await DELETE(request());

    expect(response.status).toBe(200);
    expect(admin.rpc).toHaveBeenCalledWith("prepare_account_deletion", { p_user_id: "user-1" });
    expect(admin.from).toHaveBeenCalledWith("avatars");
    expect(admin.from).toHaveBeenCalledWith("vocabulary-images");
    expect(admin.deleteUser).toHaveBeenCalledWith("user-1");
    expect(admin.calls).toEqual(["rpc", "remove", "remove", "deleteUser"]);
    expect(session.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("deletes only the session's own user, whatever the body says", async () => {
    await DELETE(request({ confirm: ACCOUNT_DELETE_CONFIRMATION, userId: "someone-else" }));
    expect(admin.deleteUser).toHaveBeenCalledWith("user-1");
    expect(admin.rpc).toHaveBeenCalledWith("prepare_account_deletion", { p_user_id: "user-1" });
  });

  it("keeps the account when a file cannot be removed, so a retry can finish", async () => {
    admin.remove.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const response = await DELETE(request());

    expect(response.status).toBe(500);
    expect(admin.deleteUser).not.toHaveBeenCalled();
  });

  it("removes files in batches", async () => {
    admin.rpc.mockResolvedValueOnce({
      data: Array.from({ length: 250 }, (_, i) => ({
        bucket_id: "vocabulary-images",
        object_name: `user-1/${i}.webp`,
      })),
      error: null,
    });
    await DELETE(request());

    expect(admin.remove).toHaveBeenCalledTimes(3);
    expect(admin.remove.mock.calls.map(([names]) => names.length)).toEqual([100, 100, 50]);
  });

  it("refuses without a session", async () => {
    session.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const response = await DELETE(request());

    expect(response.status).toBe(401);
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(admin.deleteUser).not.toHaveBeenCalled();
  });

  it("refuses a call that does not say it means it", async () => {
    expect((await DELETE(request({}))).status).toBe(400);
    expect((await DELETE(request({ confirm: "yes" }))).status).toBe(400);
    expect(admin.deleteUser).not.toHaveBeenCalled();
  });

  it("refuses anything but JSON, which no cross-site form can send", async () => {
    expect((await DELETE(request(undefined, false))).status).toBe(415);
    expect(admin.deleteUser).not.toHaveBeenCalled();
  });

  it("reports a failed account delete instead of claiming success", async () => {
    admin.deleteUser.mockResolvedValueOnce({ data: null, error: { message: "nope" } });
    const response = await DELETE(request());

    expect(response.status).toBe(500);
    expect(session.signOut).not.toHaveBeenCalled();
  });
});
