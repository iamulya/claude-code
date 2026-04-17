/**
 * Rate Limiter Persistent Store — Interface + Built-in Adapters
 *
 * Provides a `PerUserRateLimitStore` interface so the `PerUserRateLimiter`
 * can persist usage counters across server restarts and multiple instances.
 *
 * ## Adapters
 *
 * | Adapter | Use case |
 * |--------------------------|---------------------------------------|
 * | `InMemoryRateLimitStore` | Development, single-process (default) |
 * | `RedisRateLimitStore` | Production, multi-instance clusters |
 *
 * @example
 * ```ts
 * import Redis from 'ioredis'
 * import { RedisRateLimitStore, PerUserRateLimiter } from 'yaaf/security'
 *
 * const store = new RedisRateLimitStore(new Redis())
 * const limiter = new PerUserRateLimiter({ maxCostPerUser: 10, store })
 * ```
 *
 * @module security/rateLimiterStore
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserUsageSnapshot = {
  cost: number;
  tokens: number;
  turns: number;
  concurrentRuns: number;
  windowStart: number; // epoch ms when the window began
};

// ── Interface ─────────────────────────────────────────────────────────────────

/**
 * Pluggable storage backend for `PerUserRateLimiter`.
 *
 * Implementations must be atomic — concurrent `getUsage`+`setUsage` from
 * multiple workers must not race. Redis implementations should use Lua scripts
 * or transactions for INCR+GET atomicity.
 */
export interface PerUserRateLimitStore {
  /**
   * Retrieve current usage for a user. Returns null if no record exists
   * (treat as a new window: all counters at zero).
   */
  getUsage(userId: string): Promise<UserUsageSnapshot | null>;

  /**
   * Persist current usage for a user.
   * @param ttlMs How long to keep this record (matches the rate limit window).
   * Implementations should set a TTL so stale entries auto-expire.
   */
  setUsage(userId: string, usage: UserUsageSnapshot, ttlMs: number): Promise<void>;

  /** Delete the usage record for a user (e.g., on account deletion). */
  deleteUsage(userId: string): Promise<void>;
}

// ── InMemoryRateLimitStore ────────────────────────────────────────────────────

/**
 * In-memory rate limit store. Usage resets on process restart.
 *
 * Suitable for: development, single-instance deployments, testing.
 * Not suitable for: multi-instance clusters, production SaaS.
 */
export class InMemoryRateLimitStore implements PerUserRateLimitStore {
  private readonly store = new Map<string, UserUsageSnapshot>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  async getUsage(userId: string): Promise<UserUsageSnapshot | null> {
    return this.store.get(userId) ?? null;
  }

  async setUsage(userId: string, usage: UserUsageSnapshot, ttlMs: number): Promise<void> {
    this.store.set(userId, usage);

    // Auto-expire: clear after the window expires so gc() doesn't need to run
    const existing = this.timers.get(userId);
    if (existing) clearTimeout(existing);

    if (isFinite(ttlMs) && ttlMs > 0) {
      const timer = setTimeout(() => {
        this.store.delete(userId);
        this.timers.delete(userId);
      }, ttlMs);
      if (typeof timer.unref === "function") timer.unref();
      this.timers.set(userId, timer);
    }
  }

  async deleteUsage(userId: string): Promise<void> {
    this.store.delete(userId);
    const timer = this.timers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(userId);
    }
  }

  /** Number of users currently tracked. */
  get size(): number {
    return this.store.size;
  }

  dispose(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.store.clear();
  }
}

// ── RedisRateLimitStore ───────────────────────────────────────────────────────

/**
 * Redis-backed rate limit store. Survives restarts. Works across multiple
 * instances — each instance reads/writes the same Redis key.
 *
 * Requires `ioredis` as a peer dependency: `npm install ioredis`
 *
 * @example
 * ```ts
 * import Redis from 'ioredis'
 * const store = new RedisRateLimitStore(new Redis({ host: 'localhost' }))
 * ```
 */
export class RedisRateLimitStore implements PerUserRateLimitStore {
  private readonly redis: MinimalRedis;
  private readonly keyPrefix: string;

  constructor(redis: MinimalRedis, keyPrefix = "yaaf:ratelimit:") {
    this.redis = redis;
    this.keyPrefix = keyPrefix;
  }

  async getUsage(userId: string): Promise<UserUsageSnapshot | null> {
    const raw = await this.redis.get(`${this.keyPrefix}${userId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserUsageSnapshot;
    } catch {
      return null;
    }
  }

  async setUsage(userId: string, usage: UserUsageSnapshot, ttlMs: number): Promise<void> {
    const key = `${this.keyPrefix}${userId}`;
    const value = JSON.stringify(usage);
    const ttlSeconds = Math.ceil(ttlMs / 1000);
    if (ttlSeconds > 0) {
      await this.redis.set(key, value, "EX", ttlSeconds);
    } else {
      await this.redis.set(key, value);
    }
  }

  async deleteUsage(userId: string): Promise<void> {
    await this.redis.del(`${this.keyPrefix}${userId}`);
  }
}

/** Minimal Redis interface (ioredis + node-redis compatible). */
interface MinimalRedis {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: "EX", ttl?: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
}
