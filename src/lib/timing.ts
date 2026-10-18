// Tiny step timer for server routes. Durations only, never request data: safe to log and to
// send back as a Server-Timing header (visible in the browser's network panel).

export type Timer = {
  /** Awaits `work` and records how long it took under `name`. */
  time<T>(name: string, work: Promise<T>): Promise<T>;
  /** `name;dur=12.3, ...` plus `total`, for the Server-Timing header. */
  header(): string;
  /** `{ name: ms, ..., total: ms }`, rounded, for a log line. */
  summary(): Record<string, number>;
};

export function createTimer(now: () => number = () => performance.now()): Timer {
  const start = now();
  const steps: [string, number][] = [];
  const round = (ms: number) => Math.round(ms * 10) / 10;
  return {
    async time(name, work) {
      const t0 = now();
      try {
        return await work;
      } finally {
        steps.push([name.replace(/[^\w-]/g, "_"), round(now() - t0)]);
      }
    },
    header() {
      return [...steps, ["total", round(now() - start)] as [string, number]].map(([n, d]) => `${n};dur=${d}`).join(", ");
    },
    summary() {
      return Object.fromEntries([...steps, ["total", round(now() - start)]]);
    },
  };
}
