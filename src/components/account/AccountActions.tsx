"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { callApi, errorText, fieldError } from "@/lib/api-client";
import { hardNavigate } from "@/lib/browser";
import { FIELD_MESSAGES } from "@/lib/leads/field-checks";

// The account page's own controls: the name (PATCH /api/v1/me), signing out (POST
// /api/v1/auth/logout) and deleting the account (DELETE /api/v1/me, after a confirm step). Each shows
// the API's words when something fails.

const link = "inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:text-terracotta";

/** The customer's name: shown with an Edit button, or a field to set it (the first time, straight away). */
export function NameForm({ initialName }: { initialName: string | null }) {
  const router = useRouter();
  const id = useId();
  const [saved, setSaved] = useState(initialName ?? "");
  const [value, setValue] = useState(initialName ?? "");
  const [editing, setEditing] = useState(!initialName);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    const name = value.trim();
    if (name.length < 2) {
      setError(FIELD_MESSAGES.name);
      return;
    }
    setBusy(true);
    setError("");
    const res = await callApi<{ name: string }>("/api/v1/me", { method: "PATCH", body: { name } });
    setBusy(false);
    if (!res.ok) {
      setError(fieldError(res, "name"));
      return;
    }
    setSaved(res.data.name);
    setValue(res.data.name);
    setEditing(false);
    setStatus("Name saved.");
    // the greeting at the top of the page is server-rendered: render it again with the new name
    router.refresh();
  }

  if (!editing) {
    return (
      <div>
        <p className="text-sm font-semibold text-muted">Name</p>
        <div className="flex flex-wrap items-center justify-between gap-x-4">
          <p className="text-lg font-semibold">{saved}</p>
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setStatus("");
            }}
            className={link}
          >
            Edit <span className="sr-only">your name</span>
          </button>
        </div>
        <p role="status" className="text-sm text-success empty:hidden">
          {status}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={save} noValidate aria-busy={busy}>
      <label htmlFor={`${id}-name`} className="mb-1.5 block text-sm font-semibold">
        {saved ? "Name" : "Your name (so our team knows what to call you)"}
      </label>
      <input
        id={`${id}-name`}
        name="name"
        autoComplete="name"
        maxLength={80}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="field min-h-12"
        {...(error && { "aria-invalid": true, "aria-describedby": `${id}-error` })}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="btn-primary !min-h-11 !px-5 text-sm">
          {busy ? "Saving…" : "Save name"}
        </button>
        {saved && (
          <button
            type="button"
            onClick={() => {
              setValue(saved);
              setEditing(false);
              setError("");
            }}
            className="btn-secondary !min-h-11 !px-5 text-sm"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

/** Signs out of this device and goes to the home page. */
export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setBusy(true);
    setError("");
    const res = await callApi("/api/v1/auth/logout");
    if (res.ok) {
      hardNavigate("/");
      return;
    }
    setBusy(false);
    setError(errorText(res));
  }
  return (
    <div>
      <button type="button" onClick={signOut} disabled={busy} className="btn-secondary w-full">
        {busy ? "Logging out…" : "Log out"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Deleting the account, after a confirm step. The account and every sign-in go; the bookings stay
 * with us for our records, no longer linked to an account (logging in again with the number links
 * them again).
 */
export function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = useId();

  async function remove() {
    setBusy(true);
    setError("");
    const res = await callApi("/api/v1/me", { method: "DELETE" });
    if (res.ok) {
      hardNavigate("/");
      return;
    }
    setBusy(false);
    setError(errorText(res));
  }

  return (
    <div>
      <p className="text-[15px] leading-relaxed text-muted">
        This removes your account and logs you out on every device. Your bookings stay with us for our records, but are no longer linked to an account.
      </p>
      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)} className="btn-secondary mt-4 w-full !border-danger/50 !text-danger">
          Delete my account
        </button>
      ) : (
        <div role="group" aria-labelledby={`${id}-confirm`} className="mt-4 rounded-pm-md border border-danger/40 bg-rose-wash p-4">
          <p id={`${id}-confirm`} className="font-semibold">
            Delete your account? This cannot be undone.
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">If you log in again later with the same number, a new account is made and your bookings show up in it again.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" onClick={remove} disabled={busy} className="btn-primary !min-h-11 !bg-danger !px-5 text-sm">
              {busy ? "Deleting…" : "Yes, delete my account"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="btn-secondary !min-h-11 !px-5 text-sm">
              Keep my account
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm font-semibold text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
