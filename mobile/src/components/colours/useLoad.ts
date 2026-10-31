import { useCallback, useEffect, useState } from "react";

import { ApiError, NETWORK_MESSAGE } from "~/lib/api";

// One API answer for a screen: the data once it arrives, the error if it failed (with the API's code,
// so a 404 can read "not found"), whether it is still on its way (for a skeleton), and a retry. A newer
// request (a different key, or Try again) replaces an older one that is still on its way.

export type Load<T> = { data?: T; error?: ApiError; loading: boolean; retry: () => void };

export function useLoad<T>(load: () => Promise<T>, key: string): Load<T> {
  const [state, setState] = useState<{ key: string; attempt: number; data?: T; error?: ApiError }>({ key, attempt: 0 });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    load().then(
      (data) => live && setState({ key, attempt, data }),
      (err: unknown) => live && setState({ key, attempt, error: err instanceof ApiError ? err : new ApiError("network", NETWORK_MESSAGE) }),
    );
    return () => {
      live = false;
    };
    // `load` is a fresh closure each render; the key names what it loads
  }, [key, attempt]);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const current = state.key === key && state.attempt === attempt;
  const data = current ? state.data : undefined;
  const error = current ? state.error : undefined;
  return { data, error, loading: data === undefined && error === undefined, retry };
}
