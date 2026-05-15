type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  retryAfter: number; // seconds
  remaining: number;
};

/**
 * Simple in-memory sliding-window rate limiter.
 * Suitable for dev / single-instance deploys. For multi-instance prod use Redis.
 */
export function rateLimit(opts: {
  key: string;
  max: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(opts.key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(opts.key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, retryAfter: 0, remaining: opts.max - 1 };
  }

  if (bucket.count >= opts.max) {
    return {
      allowed: false,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
      remaining: 0,
    };
  }

  bucket.count++;
  return {
    allowed: true,
    retryAfter: 0,
    remaining: opts.max - bucket.count,
  };
}

// Periodic GC of expired buckets to avoid unbounded growth
let lastGC = 0;
export function gcRateLimit() {
  const now = Date.now();
  if (now - lastGC < 60_000) return;
  lastGC = now;
  for (const [k, b] of buckets) {
    if (b.resetAt < now) buckets.delete(k);
  }
}
