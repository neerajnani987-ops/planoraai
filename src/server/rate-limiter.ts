interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up old records periodically
setInterval(() => {
  const cutoff = Date.now() - 60000;
  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((t) => t > cutoff);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}, 60000).unref?.();

/**
 * Checks if a client identifier has exceeded rate limits.
 * @param identifier Client IP or user id
 * @param maxRequests Maximum requests within the time window
 * @param windowMs Time window in milliseconds (default 60 seconds)
 */
export function checkRateLimit(
  identifier: string,
  maxRequests = 15,
  windowMs = 60000
): { allowed: boolean; remaining: number; retryAfterSec?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier) || { timestamps: [] };

  // Filter out timestamps outside window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfterSec = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, retryAfterSec),
    };
  }

  record.timestamps.push(now);
  rateLimitStore.set(identifier, record);

  return {
    allowed: true,
    remaining: maxRequests - record.timestamps.length,
  };
}
