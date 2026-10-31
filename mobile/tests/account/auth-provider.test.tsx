import { act, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { ApiError } from "~/lib/api";
import { AuthProvider, useAuth, type Auth } from "~/lib/auth-context";
import { asha, mockApi, offline, savedToken, seedToken } from "./helpers";

jest.mock("expo-router", () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));

let auth: Auth;
function Probe() {
  auth = useAuth();
  return <Text testID="state">{`${auth.status}:${auth.user?.name ?? "-"}`}</Text>;
}

const state = () => screen.getByTestId("state").props.children as string;

async function mount() {
  await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

describe("AuthProvider: restoring the session at launch", () => {
  it("is loading while the saved token is checked", async () => {
    seedToken("saved-token");
    globalThis.fetch = jest.fn(() => new Promise(() => {})) as never;
    await mount();
    expect(state()).toBe("loading:-");
  });

  it("is signed out with no saved token, asking the API nothing", async () => {
    const calls = mockApi({});
    await mount();
    await waitFor(() => expect(state()).toBe("signedOut:-"));
    expect(calls).toEqual([]);
  });

  it("checks a saved token with /api/v1/me and signs in with its user", async () => {
    seedToken("saved-token");
    const calls = mockApi({ "GET /api/v1/me": { data: asha } });
    await mount();
    await waitFor(() => expect(state()).toBe("signedIn:Asha Verma"));
    expect(calls[0]).toMatchObject({ method: "GET", path: "/api/v1/me", headers: { Authorization: "Bearer saved-token" } });
  });

  it("deletes a token the API no longer knows (401) and is signed out", async () => {
    seedToken("expired");
    mockApi({ "GET /api/v1/me": { status: 401, error: { code: "unauthenticated", message: "Sign in to continue" } } });
    await mount();
    await waitFor(() => expect(state()).toBe("signedOut:-"));
    expect(savedToken()).toBeUndefined();
  });

  it("stays signed in offline, keeping the token, with the user to load later", async () => {
    seedToken("saved-token");
    mockApi({ "GET /api/v1/me": offline });
    await mount();
    await waitFor(() => expect(state()).toBe("signedIn:-"));
    expect(savedToken()).toBe("saved-token");
  });
});

describe("AuthProvider: signed in", () => {
  it("keeps the token from a sign-in in the secure store and adds it to every call", async () => {
    const calls = mockApi({
      "POST /api/v1/auth/verify": { data: { user: { ...asha, name: null }, token: "new-token", expiresAt: "2027-01-29T00:00:00.000Z" } },
      "GET /api/v1/projects": { data: [] },
    });
    await mount();
    await waitFor(() => expect(state()).toBe("signedOut:-"));
    await act(async () => void (await auth.signIn("98765 43210", "123456")));
    expect(state()).toBe("signedIn:-");
    expect(savedToken()).toBe("new-token");
    await act(async () => void (await auth.request("/api/v1/projects")));
    expect(calls.at(-1)).toMatchObject({ path: "/api/v1/projects", headers: { Authorization: "Bearer new-token" } });
  });

  it("signs out at once on any 401, deleting the token", async () => {
    seedToken("saved-token");
    mockApi({ "GET /api/v1/me": { data: asha }, "GET /api/v1/projects": { status: 401, error: { code: "unauthenticated", message: "Sign in to continue" } } });
    await mount();
    await waitFor(() => expect(state()).toBe("signedIn:Asha Verma"));
    let error: unknown;
    await act(async () => {
      error = await auth.request("/api/v1/projects").catch((e: unknown) => e);
    });
    expect(error).toMatchObject({ code: "unauthenticated", status: 401 });
    expect(state()).toBe("signedOut:-");
    expect(savedToken()).toBeUndefined();
  });

  it("keeps the session through other failures", async () => {
    seedToken("saved-token");
    mockApi({ "GET /api/v1/me": { data: asha }, "GET /api/v1/projects": { status: 500, error: { code: "internal_error", message: "Something went wrong on our side." } } });
    await mount();
    await waitFor(() => expect(state()).toBe("signedIn:Asha Verma"));
    await act(async () => void (await auth.request("/api/v1/projects").catch(() => undefined)));
    expect(state()).toBe("signedIn:Asha Verma");
    expect(savedToken()).toBe("saved-token");
  });

  it("renames and reads the account again", async () => {
    seedToken("saved-token");
    const calls = mockApi({ "GET /api/v1/me": [{ data: { ...asha, name: null } }, { data: { ...asha, name: "Asha V" } }], "PATCH /api/v1/me": { data: asha } });
    await mount();
    await waitFor(() => expect(state()).toBe("signedIn:-"));
    await act(async () => void (await auth.rename("Asha Verma")));
    expect(state()).toBe("signedIn:Asha Verma");
    expect(calls.at(-1)).toMatchObject({ method: "PATCH", body: { name: "Asha Verma" } });
    await act(async () => void (await auth.refresh()));
    expect(state()).toBe("signedIn:Asha V");
  });

  it("signs out on the phone at once and ends the session on the server", async () => {
    seedToken("saved-token");
    const calls = mockApi({ "GET /api/v1/me": { data: asha }, "POST /api/v1/auth/logout": { data: { signedOut: true } } });
    await mount();
    await waitFor(() => expect(state()).toBe("signedIn:Asha Verma"));
    await act(() => auth.signOut());
    expect(state()).toBe("signedOut:-");
    expect(savedToken()).toBeUndefined();
    expect(calls.at(-1)).toMatchObject({ method: "POST", path: "/api/v1/auth/logout", headers: { Authorization: "Bearer saved-token" } });
    // a second sign-out has nothing to end
    await act(() => auth.signOut());
    expect(calls.filter((c) => c.path === "/api/v1/auth/logout")).toHaveLength(1);
  });

  it("deletes the account, then is signed out", async () => {
    seedToken("saved-token");
    const calls = mockApi({ "GET /api/v1/me": { data: asha }, "DELETE /api/v1/me": { data: { deleted: true } } });
    await mount();
    await waitFor(() => expect(state()).toBe("signedIn:Asha Verma"));
    await act(() => auth.deleteAccount());
    expect(calls.at(-1)).toMatchObject({ method: "DELETE", path: "/api/v1/me", headers: { Authorization: "Bearer saved-token" } });
    expect(state()).toBe("signedOut:-");
    expect(savedToken()).toBeUndefined();
  });

  it("answers calls without a session as a 401, sending nothing", async () => {
    const calls = mockApi({});
    await mount();
    await waitFor(() => expect(state()).toBe("signedOut:-"));
    await expect(auth.withToken(async () => "never")).rejects.toMatchObject({ code: "unauthenticated", status: 401 });
    await expect(auth.request("/api/v1/me")).rejects.toBeInstanceOf(ApiError);
    expect(calls).toEqual([]);
  });
});

describe("useAuth outside a provider", () => {
  it("is signed out and answers every call as a 401", async () => {
    await render(<Probe />);
    expect(state()).toBe("signedOut:-");
    for (const call of [auth.signIn("9876543210", "123456"), auth.deleteAccount(), auth.rename("A"), auth.refresh(), auth.request("/x"), auth.withToken(async () => 1)]) {
      await expect(call).rejects.toMatchObject({ status: 401 });
    }
    await expect(auth.signOut()).resolves.toBeUndefined();
  });
});
