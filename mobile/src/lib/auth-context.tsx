import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { apiRequest, ApiError, type ApiEnvelope, type ApiRequestInit } from "./api";
import { clearToken, deleteMe, endSession, fetchMe, readToken, renameMe, saveToken, SIGNED_OUT_MESSAGE, verifyCode, type User } from "./auth";

// The signed-in state for the whole app. At launch the saved token is read from the secure store and
// checked with GET /api/v1/me (offline, the session is kept and the user loads later). Screens get
// the status and user, the account actions, and `request`: an envelope-aware call to /api/v1 with
// the bearer token added. Any 401 from the API means the session is gone: the token is deleted and
// the app is signed out at once. The token never leaves this module and the secure store.

export type AuthStatus = "loading" | "signedOut" | "signedIn";

export type Auth = {
  status: AuthStatus;
  /** the customer once known (null while loading, signed out, or signed in offline before /me answered) */
  user: User | null;
  /** checks the SMS code and keeps the session; throws the API's ApiError (invalid_code, code_expired…) */
  signIn: (phone: string, code: string) => Promise<User>;
  /** forgets the session on the phone at once and ends it on the server (best effort) */
  signOut: () => Promise<void>;
  /** deletes the account (DELETE /api/v1/me), then signs out */
  deleteAccount: () => Promise<void>;
  /** changes the account's name */
  rename: (name: string) => Promise<User>;
  /** reads the account again (GET /api/v1/me) */
  refresh: () => Promise<User>;
  /** an /api/v1 call with the session's bearer token; throws ApiError (status 401 when signed out) */
  request: <T>(path: string, init?: Omit<ApiRequestInit, "token">) => Promise<ApiEnvelope<T>>;
  /** runs `fn` with the bearer token (the PDF download's header); a 401 from it signs out */
  withToken: <T>(fn: (token: string) => Promise<T>) => Promise<T>;
};

const signedOutError = () => new ApiError("unauthenticated", SIGNED_OUT_MESSAGE, 401);

/** Outside an AuthProvider (tests of single components): signed out, every call answered as a 401. */
const SIGNED_OUT: Auth = {
  status: "signedOut",
  user: null,
  signIn: async () => Promise.reject(signedOutError()),
  signOut: async () => undefined,
  deleteAccount: async () => Promise.reject(signedOutError()),
  rename: async () => Promise.reject(signedOutError()),
  refresh: async () => Promise.reject(signedOutError()),
  request: async () => Promise.reject(signedOutError()),
  withToken: async () => Promise.reject(signedOutError()),
};

const AuthCtx = createContext<Auth>(SIGNED_OUT);

type State = { status: AuthStatus; user: User | null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading", user: null });
  const token = useRef<string | null>(null);
  // settles once the saved session has been read (calls made before then wait for it)
  const restored = useRef<Promise<void> | null>(null);

  async function dropSession() {
    token.current = null;
    setState({ status: "signedOut", user: null });
    await clearToken();
  }

  useEffect(() => {
    let live = true;
    restored.current = (async () => {
      const saved = await readToken();
      if (!live) return;
      if (!saved) return setState({ status: "signedOut", user: null });
      token.current = saved;
      try {
        const user = await fetchMe(saved);
        if (live && token.current === saved) setState({ status: "signedIn", user });
      } catch (err) {
        if (!live || token.current !== saved) return;
        if (err instanceof ApiError && err.status === 401) await dropSession();
        // offline or a server hiccup: still signed in; the account screens load the user again
        else setState({ status: "signedIn", user: null });
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  async function withToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
    await restored.current;
    const current = token.current;
    if (!current) throw signedOutError();
    try {
      return await fn(current);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401 && token.current === current) await dropSession();
      throw err;
    }
  }

  const value: Auth = {
    ...state,
    withToken,
    request: <T,>(path: string, init: Omit<ApiRequestInit, "token"> = {}) => withToken((t) => apiRequest<T>(path, { ...init, token: t })),
    async signIn(phone, code) {
      const session = await verifyCode(phone, code);
      token.current = session.token;
      await saveToken(session.token);
      setState({ status: "signedIn", user: session.user });
      return session.user;
    },
    async signOut() {
      const current = token.current;
      await dropSession();
      if (current) await endSession(current);
    },
    async deleteAccount() {
      await withToken(deleteMe);
      await dropSession();
    },
    async rename(name) {
      const user = await withToken((t) => renameMe(t, name));
      setState({ status: "signedIn", user });
      return user;
    },
    async refresh() {
      const user = await withToken(fetchMe);
      setState({ status: "signedIn", user });
      return user;
    },
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

/** The signed-in state and the account actions (signed out outside an AuthProvider). */
export const useAuth = () => useContext(AuthCtx);
