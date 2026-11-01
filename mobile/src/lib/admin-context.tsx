import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { clearAdminSession, readAdminSession, saveAdminSession, adminSignIn, sessionExpired, type AdminSession } from "./admin";
import { apiRequest, ApiError, type ApiEnvelope, type ApiRequestInit } from "./api";

// The admin session for the whole app, apart from the customer's (AuthProvider): restored from the
// secure store at launch (an expired one is dropped), with `request` adding the admin bearer token to
// /api/admin calls. A 401 from any of them means the session is over (expired, or the secret was
// changed): it is forgotten at once and the admin screens go back to the sign-in screen.

export type AdminStatus = "loading" | "signedOut" | "signedIn";

export const ADMIN_SIGNED_OUT_MESSAGE = "Your admin session has ended. Sign in again.";

export type Admin = {
  status: AdminStatus;
  username: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** an /api/admin call with the admin token; throws ApiError (status 401 when signed out) */
  request: <T>(path: string, init?: Omit<ApiRequestInit, "token">) => Promise<ApiEnvelope<T>>;
  /** runs `fn` with the admin token (the PDF download's header); a 401 from it signs out */
  withToken: <T>(fn: (token: string) => Promise<T>) => Promise<T>;
};

const signedOutError = () => new ApiError("unauthenticated", ADMIN_SIGNED_OUT_MESSAGE, 401);

const SIGNED_OUT: Admin = {
  status: "signedOut",
  username: null,
  signIn: async () => Promise.reject(signedOutError()),
  signOut: async () => undefined,
  request: async () => Promise.reject(signedOutError()),
  withToken: async () => Promise.reject(signedOutError()),
};

const AdminCtx = createContext<Admin>(SIGNED_OUT);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: AdminStatus; username: string | null }>({ status: "loading", username: null });
  const session = useRef<AdminSession | null>(null);
  const restored = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let live = true;
    restored.current = readAdminSession().then((saved) => {
      if (!live) return;
      session.current = saved;
      setState(saved ? { status: "signedIn", username: saved.username } : { status: "signedOut", username: null });
    });
    return () => {
      live = false;
    };
  }, []);

  async function drop() {
    session.current = null;
    setState({ status: "signedOut", username: null });
    await clearAdminSession();
  }

  async function withToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
    await restored.current;
    const current = session.current;
    if (!current) throw signedOutError();
    if (sessionExpired(current)) {
      await drop();
      throw signedOutError();
    }
    try {
      return await fn(current.token);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401 && session.current === current) await drop();
      throw err;
    }
  }

  const value: Admin = {
    ...state,
    withToken,
    request: <T,>(path: string, init: Omit<ApiRequestInit, "token"> = {}) => withToken((token) => apiRequest<T>(path, { ...init, token })),
    async signIn(username, password) {
      const next = await adminSignIn(username, password);
      session.current = next;
      await saveAdminSession(next);
      setState({ status: "signedIn", username: next.username });
    },
    signOut: drop,
  };

  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}

/** The admin session and its calls (signed out outside an AdminProvider). */
export const useAdmin = () => useContext(AdminCtx);
