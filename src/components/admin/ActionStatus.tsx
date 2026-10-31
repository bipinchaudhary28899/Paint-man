import type { ActionFailure } from "./useAdminAction";

/** The outcome of an admin action under its form: the server's error (with a way back in when the session ended) or a short success line. */
export function ActionStatus({ error, done }: { error: ActionFailure | null; done?: string }) {
  if (error) {
    return (
      <p role="alert" className="rounded-xl bg-peach-wash px-3 py-2 text-sm font-semibold text-danger">
        {error.status === 401 ? (
          <>
            Your admin session has ended.{" "}
            <a href="/admin/login" className="underline">
              Sign in again
            </a>
          </>
        ) : (
          error.message
        )}
      </p>
    );
  }
  return done ? (
    <p role="status" className="text-sm font-semibold text-success">
      {done}
    </p>
  ) : null;
}
