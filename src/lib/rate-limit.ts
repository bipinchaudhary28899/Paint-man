// Rate limiting for form submissions and admin sign-in.
//
// On Vercel each request can run on a different serverless instance, so limits
// kept in memory are not shared. When Upstash Redis is configured (Vercel
// Marketplace sets KV_REST_API_URL / KV_REST_API_TOKEN, or use
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN) counts are stored there.
// Without it, a per-instance in-memory limiter is used (fine for local dev).

export type RateLimiter = {
  /** Records a hit; resolves false when the key is over the limit. */
  hit(key: string, now?: number): Promise<boolean>;
  /** True when the key has used up its allowance (does not record a hit). */
  isBlocked(key: string, now?: number): Promise<boolean>;
  reset(key: string, now?: number): Promise<void>;
};

type Options = { name: string; limit: number; windowMs: number };

export function createMemoryLimiter({ limit, windowMs }: Omit<Options, "name">): RateLimiter {
  const hits = new Map<string, number[]>();
  const recent = (key: string, now: number) => (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  return {
    async hit(key, now = Date.now()) {
      const list = recent(key, now);
      if (list.length >= limit) {
        hits.set(key, list);
        return false;
      }
      list.push(now);
      hits.set(key, list);
      if (hits.size > 10_000) hits.clear();
      return true;
    },
    async isBlocked(key, now = Date.now()) {
      return recent(key, now).length >= limit;
    },
    async reset(key) {
      hits.delete(key);
    },
  };
}

export function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

/** Fixed-window counter in Upstash Redis via its REST API (no extra dependency). */
export function createRedisLimiter({ name, limit, windowMs }: Options, cfg: { url: string; token: string }): RateLimiter {
  const keyFor = (key: string, now: number) => `rl:${name}:${key}:${Math.floor(now / windowMs)}`;

  async function pipeline(commands: (string | number)[][]): Promise<{ result?: unknown; error?: string }[]> {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    return res.json();
  }

  return {
    async hit(key, now = Date.now()) {
      const k = keyFor(key, now);
      const [incr] = await pipeline([["INCR", k], ["PEXPIRE", k, windowMs]]);
      return Number(incr.result) <= limit;
    },
    async isBlocked(key, now = Date.now()) {
      const [get] = await pipeline([["GET", keyFor(key, now)]]);
      return Number(get.result ?? 0) >= limit;
    },
    async reset(key, now = Date.now()) {
      await pipeline([["DEL", keyFor(key, now)]]);
    },
  };
}

/**
 * Uses Redis when configured, otherwise memory. If Redis is unreachable the
 * in-memory limiter takes over so the site keeps working.
 */
export function createRateLimiter(opts: Options): RateLimiter {
  const memory = createMemoryLimiter(opts);
  const cfg = redisConfig();
  if (!cfg) return memory;
  const redis = createRedisLimiter(opts, cfg);

  const withFallback =
    <A extends unknown[], R>(fn: (...a: A) => Promise<R>, fallback: (...a: A) => Promise<R>) =>
    async (...args: A) => {
      try {
        return await fn(...args);
      } catch (err) {
        console.error("Rate limiter: Redis unavailable, using memory:", err instanceof Error ? err.message : "unknown");
        return fallback(...args);
      }
    };

  return {
    hit: withFallback(redis.hit, memory.hit),
    isBlocked: withFallback(redis.isBlocked, memory.isBlocked),
    reset: withFallback(redis.reset, memory.reset),
  };
}

let leadLimiter: RateLimiter | null = null;

/** 5 valid lead submissions per IP per 10 minutes. */
export function rateLimit(key: string) {
  leadLimiter ??= createRateLimiter({ name: "lead", limit: 5, windowMs: 10 * 60 * 1000 });
  return leadLimiter.hit(key);
}
