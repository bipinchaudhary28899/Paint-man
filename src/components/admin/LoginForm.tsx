"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "same-origin",
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        router.replace("/admin");
        router.refresh();
        return;
      }
      setError(json.error ?? "Sign-in failed.");
    } catch {
      setError("Network error. Try again.");
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="username" className="mb-1.5 block text-sm font-semibold">Username</label>
        <input id="username" name="username" autoComplete="username" required maxLength={100} className="field" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={200} className="field" />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>
      )}
      <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
