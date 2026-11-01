import { act, render, renderHook, waitFor } from "@testing-library/react-native";
import { File } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import * as Sharing from "expo-sharing";

import { adminPath, adminSignIn, clearAdminSession, isTime, mapUrl, openAdminPdf, readAdminSession, saveAdminSession, shiftDay, telUrl } from "~/lib/admin";
import { AdminProvider, useAdmin, type Admin } from "~/lib/admin-context";
import { ApiError } from "~/lib/api";
import { apiBase } from "~/lib/config";
import { ADMIN_KEY, mockAdminApi, savedAdmin, seedAdmin } from "./helpers";

// The admin session in the app: kept only in the secure store under its own key, signed in with the
// website's admin username and password (POST /api/admin/session), sent as a bearer token, dropped
// when it expires or the API answers 401. Plus the small helpers the admin screens use.

const download = File.downloadFileAsync as unknown as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("the saved admin session", () => {
  it("reads back what was saved, and nothing once it has expired or cannot be read", async () => {
    expect(await readAdminSession()).toBeNull();
    const session = { username: "owner", token: "t", expiresAt: "2026-11-01T14:00:00.000Z" };
    await saveAdminSession(session);
    expect(JSON.parse(savedAdmin()!)).toEqual(session);
    expect(await readAdminSession(Date.parse("2026-11-01T13:59:00.000Z"))).toEqual(session);
    expect(await readAdminSession(Date.parse("2026-11-01T14:00:00.000Z"))).toBeNull();
    (jest.requireMock("expo-secure-store") as { __store: Map<string, string> }).__store.set(ADMIN_KEY, "not json");
    expect(await readAdminSession()).toBeNull();
    (jest.requireMock("expo-secure-store") as { __store: Map<string, string> }).__store.set(ADMIN_KEY, JSON.stringify({ username: "owner" }));
    expect(await readAdminSession()).toBeNull();
    await clearAdminSession();
    expect(savedAdmin()).toBeUndefined();
  });

  it("never fails when the secure store does", async () => {
    jest.spyOn(SecureStore, "getItemAsync").mockRejectedValueOnce(new Error("locked"));
    jest.spyOn(SecureStore, "setItemAsync").mockRejectedValueOnce(new Error("locked"));
    jest.spyOn(SecureStore, "deleteItemAsync").mockRejectedValueOnce(new Error("locked"));
    expect(await readAdminSession()).toBeNull();
    await expect(saveAdminSession({ username: "owner", token: "t", expiresAt: "2030-01-01T00:00:00.000Z" })).resolves.toBeUndefined();
    await expect(clearAdminSession()).resolves.toBeUndefined();
  });
});

describe("adminSignIn", () => {
  it("sends the trimmed username and the password, and answers the session", async () => {
    const calls = mockAdminApi({ "POST /api/admin/session": { data: { username: "owner", token: "t", expiresAt: "2026-11-01T14:00:00.000Z" } } });
    expect(await adminSignIn("  owner ", "pass word")).toEqual({ username: "owner", token: "t", expiresAt: "2026-11-01T14:00:00.000Z" });
    expect(calls[0]).toMatchObject({ method: "POST", path: "/api/admin/session", body: { username: "owner", password: "pass word" } });
    expect(calls[0].headers.Authorization).toBeUndefined();
  });

  it("passes on the API's refusal, and refuses an answer without a token", async () => {
    mockAdminApi({ "POST /api/admin/session": [{ status: 401, error: { code: "invalid_credentials", message: "Incorrect username or password." } }, { data: { username: "owner" } }] });
    await expect(adminSignIn("owner", "x")).rejects.toMatchObject({ code: "invalid_credentials", status: 401, message: "Incorrect username or password." });
    await expect(adminSignIn("owner", "x")).rejects.toMatchObject({ code: "bad_response" });
  });
});

describe("helpers for the admin screens", () => {
  it("moves calendar days, checks 24-hour times, builds query paths and phone and map links", () => {
    expect(shiftDay("2026-11-01", 30)).toBe("2026-12-01");
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
    expect(["09:30", "00:00", "23:59"].every(isTime)).toBe(true);
    expect(["9:30", "24:00", "12:60", "noon"].some(isTime)).toBe(false);
    expect(adminPath("/api/admin/leads", { q: "asha", type: "", page: 2, city: undefined })).toBe("/api/admin/leads?q=asha&page=2");
    expect(adminPath("/api/admin/leads", {})).toBe("/api/admin/leads");
    expect(telUrl("+91 98765-43210")).toBe("tel:+919876543210");
    expect(mapUrl({ lat: 27.2, lng: 78 })).toBe("https://maps.google.com/?q=27.2,78");
  });

  it("downloads a version's PDF with the admin token and opens the share sheet", async () => {
    await openAdminPdf("admin-token", "p1", { id: "q1", version: 2 });
    expect(download).toHaveBeenCalledWith(`${apiBase()}/api/admin/projects/p1/quotations/q1/pdf`, expect.anything(), { headers: { Authorization: "Bearer admin-token", Accept: "application/pdf" }, idempotent: true });
    expect(Sharing.shareAsync).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ mimeType: "application/pdf", dialogTitle: "Quotation version 2" }));
  });

  it("says why a PDF could not be opened", async () => {
    download.mockRejectedValueOnce(new Error("Unable to download file: response has status 401"));
    await expect(openAdminPdf("t", "p1", { id: "q1", version: 1 })).rejects.toMatchObject({ code: "unauthenticated", status: 401 });
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
    await expect(openAdminPdf("t", "p1", { id: "q1", version: 1 })).rejects.toMatchObject({ code: "sharing_unavailable" });
  });
});

describe("AdminProvider", () => {
  function setup() {
    const ref: { current: Admin | null } = { current: null };
    function Probe() {
      ref.current = useAdmin();
      return null;
    }
    return { ref, Probe };
  }

  it("restores a saved session and sends its token as a bearer token", async () => {
    seedAdmin();
    const calls = mockAdminApi({ "GET /api/admin/projects": { data: [] } });
    const { ref, Probe } = setup();
    await render(
      <AdminProvider>
        <Probe />
      </AdminProvider>,
    );
    await waitFor(() => expect(ref.current?.status).toBe("signedIn"));
    expect(ref.current?.username).toBe("owner");
    await act(async () => {
      await ref.current!.request("/api/admin/projects");
    });
    expect(calls[0].headers.Authorization).toBe("Bearer admin-token");
  });

  it("signs in, keeps the session in the secure store, and forgets it on sign-out", async () => {
    mockAdminApi({ "POST /api/admin/session": { data: { username: "owner", token: "fresh", expiresAt: new Date(Date.now() + 3_600_000).toISOString() } } });
    const { ref, Probe } = setup();
    await render(
      <AdminProvider>
        <Probe />
      </AdminProvider>,
    );
    await waitFor(() => expect(ref.current?.status).toBe("signedOut"));
    await act(async () => {
      await ref.current!.signIn("owner", "secret");
    });
    expect(ref.current?.status).toBe("signedIn");
    expect(JSON.parse(savedAdmin()!).token).toBe("fresh");
    await act(async () => {
      await ref.current!.signOut();
    });
    expect(ref.current?.status).toBe("signedOut");
    expect(savedAdmin()).toBeUndefined();
  });

  it("signs out at once when the API answers 401, and keeps the session for other failures", async () => {
    seedAdmin();
    mockAdminApi({ "GET /api/admin/leads": [{ status: 500, error: { code: "internal_error", message: "Something went wrong on our side." } }, { status: 401, error: { code: "unauthenticated", message: "Your admin session has ended." } }] });
    const { ref, Probe } = setup();
    await render(
      <AdminProvider>
        <Probe />
      </AdminProvider>,
    );
    await waitFor(() => expect(ref.current?.status).toBe("signedIn"));
    await act(async () => {
      await expect(ref.current!.request("/api/admin/leads")).rejects.toMatchObject({ status: 500 });
    });
    expect(ref.current?.status).toBe("signedIn");
    await act(async () => {
      await expect(ref.current!.request("/api/admin/leads")).rejects.toMatchObject({ status: 401 });
    });
    expect(ref.current?.status).toBe("signedOut");
    expect(savedAdmin()).toBeUndefined();
  });

  it("drops a session whose 8 hours ran out while the app was open", async () => {
    seedAdmin();
    const { ref, Probe } = setup();
    await render(
      <AdminProvider>
        <Probe />
      </AdminProvider>,
    );
    await waitFor(() => expect(ref.current?.status).toBe("signedIn"));
    const later = Date.now() + 2 * 3_600_000;
    const now = jest.spyOn(Date, "now").mockReturnValue(later);
    await act(async () => {
      await expect(ref.current!.withToken(async () => "x")).rejects.toBeInstanceOf(ApiError);
    });
    now.mockRestore();
    expect(ref.current?.status).toBe("signedOut");
  });

  it("is signed out outside a provider, every call answered as a 401", async () => {
    const { result } = await renderHook(() => useAdmin());
    expect(result.current.status).toBe("signedOut");
    await expect(result.current.request("/api/admin/leads")).rejects.toMatchObject({ status: 401 });
    await expect(result.current.withToken(async () => 1)).rejects.toMatchObject({ status: 401 });
    await expect(result.current.signIn("a", "b")).rejects.toMatchObject({ status: 401 });
    await expect(result.current.signOut()).resolves.toBeUndefined();
  });

  it("refuses calls when no session was saved", async () => {
    const { ref, Probe } = setup();
    await render(
      <AdminProvider>
        <Probe />
      </AdminProvider>,
    );
    await waitFor(() => expect(ref.current?.status).toBe("signedOut"));
    await act(async () => {
      await expect(ref.current!.request("/api/admin/leads")).rejects.toMatchObject({ status: 401 });
    });
  });
});
