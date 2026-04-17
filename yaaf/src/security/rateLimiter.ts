/**
 * PerUserRateLimiter — Per-Identity Usage Limits
 *
 * Extends the guardrails system with per-user budget enforcement.
 * Uses the IAM `UserContext` to track and limit individual user consumption
 * in multi-tenant environments.
 *
 * Features:
 * - Per-user cost, token, and turn limits
 * - Rolling time window with TTL eviction
 * - Burst limiting (max concurrent runs per user)
 * - Global + per-user composite enforcement
 * - Event callbacks for alerting
 *
 * @example
 * ```ts
 * import { PerUserRateLimiter } from 'yaaf';
 *
 * const limiter = new PerUserRateLimiter({
 * maxCostPerUser: 5.00,
 * maxTokensPerUser: 100_000,
 * maxTurnsPerUser: 50,
 * windowMs: 3_600_000, // 1 hour rolling window
 * });
 *
 * // Check before processing a run
 * const check = limiter.check('user-123');
 * if (check.blocked) throw new Error(check.reason);
 *
 * // Record usage after each LLM call
 * limiter.recordUsage('user-123', { cost: 0.02, tokens: 1500, turns: 1 });
 * ```
 *
 * @module security/rateLimiter
 */

// ── Types ────────────────────────────────────────────────────────────────────

// ── Distributed backend ──────────────────────────────────────────────────────

/**
 * Pluggable backend for cross-replica rate limiting.
 *
 * The default (in-memory) backend only enforces limits within a single process.
 * In multi-pod deployments, each pod maintains its own counter — meaning the
 * effective global rate limit is `maxTurnsPerUser × podCount`.
 *
 * To enforce true global limits, provide a distributed backend backed by Redis,
 * Memcached, or any atomic counter store:
 *
 * @example
 * ```ts
 * import { createClient } from 'redis'
 *
 * const redis = createClient()
 * await redis.connect()
 *
 * const limiter = new PerUserRateLimiter({
 * maxTurnsPerUser: 100,
 * windowMs: 3_600_000,
 * backend: {
 * async increment(userId, field, amount, windowMs) {
 * const key = `rl:${userId}:${field}`
 * const val = await redis.incrBy(key, amount)
 * if (val === amount) await redis.expire(key, Math.ceil(windowMs / 1000))
 * return val
 * },
 * async get(userId, field) {
 * return Number(await redis.get(`rl:${userId}:${field}`)) || 0
 * },
 * async reset(userId) {
 * await redis.del([`rl:${userId}:cost`, `rl:${userId}:tokens`, `rl:${userId}:turns`])
 * },
 * },
 * })
 * ```
 */
export interface DistributedRateLimitBackend {
  /**
   * Atomically increment a counter and return the new value.
   *
   * @param userId - The user being tracked.
   * @param field - The resource dimension ('cost', 'tokens', 'turns').
   * @param amount - How much to add (may be fractional for cost).
   * @param windowMs - The rolling window duration — used to set TTL on first write.
   * @returns The new aggregated value after incrementing.
   */
  increment(
    userId: string,
    field: "cost" | "tokens" | "turns",
    amount: number,
    windowMs: number,
  ): Promise<number>;

  /**
   * Read the current counter without modifying it.
   */
  get(userId: string, field: "cost" | "tokens" | "turns"): Promise<number>;

  /**
   * Delete all counters for a user (called by resetUser()).
   */
  reset(userId: string): Promise<void>;
}

/** Built-in in-process implementation of DistributedRateLimitBackend. */
export class InMemoryRateLimitBackend implements DistributedRateLimitBackend {
  private readonly data = new Map<string, Map<string, number>>();

  async increment(
    userId: string,
    field: "cost" | "tokens" | "turns",
    amount: number,
  ): Promise<number> {
    if (!this.data.has(userId)) this.data.set(userId, new Map());
    const user = this.data.get(userId)!;
    const prev = user.get(field) ?? 0;
    user.set(field, prev + amount);
    return prev + amount;
  }

  async get(userId: string, field: "cost" | "tokens" | "turns"): Promise<number> {
    return this.data.get(userId)?.get(field) ?? 0;
  }

  async reset(userId: string): Promise<void> {
    this.data.delete(userId);
  }
}

export type PerUserRateLimiterConfig = {
  /** Maximum USD cost per user within the window. Default: Infinity. */
  maxCostPerUser?: number;
  /** Maximum total tokens per user within the window. Default: Infinity. */
  maxTokensPerUser?: number;
  /** Maximum turns (model calls) per user within the window. Default: Infinity. */
  maxTurnsPerUser?: number;
  /** Maximum concurrent runs per user. Default: Infinity. */
  maxConcurrentRuns?: number;
  /**
   * Rolling window duration in ms. Usage outside this window is evicted.
   * Default: 3_600_000 (1 hour).
   */
  windowMs?: number;
  /**
   * How often to run garbage collection on expired entries (ms).
   * Default: 60_000 (1 minute).
   */
  gcIntervalMs?: number;
  /**
   * Called when a user approaches or hits limits.
   */
  onLimitEvent?: (event: RateLimitEvent) => void;
  /**
   * Roles that bypass rate limiting entirely.
   */
  bypassRoles?: string[];
  /**
   * Optional distributed backend for cross-replica enforcement.
   *
   * When omitted, an in-memory backend is used — which only enforces
   * limits within a single Node.js process. In multi-pod deployments
   * you MUST provide a distributed backend (e.g. Redis) to get global limits.
   *
   * The concurrent-run slot counter is always kept in-process regardless of
   * backend, since it requires a synchronous release() function.
   */
  backend?: DistributedRateLimitBackend;
};

export type RateLimitEvent = {
  userId: string;
  resource: "cost" | "tokens" | "turns" | "concurrent";
  current: number;
  limit: number;
  action: "warning" | "blocked";
  timestamp: Date;
};

export type RateLimitCheckResult = {
  blocked: boolean;
  reason?: string;
  usage: UserUsageSummary;
};

export type UserUsageSummary = {
  cost: number;
  tokens: number;
  turns: number;
  concurrentRuns: number;
  windowStart: number;
};

type UsageEntry = {
  timestamp: number;
  cost: number;
  tokens: number;
  turns: number;
};

type UserBucket = {
  entries: UsageEntry[];
  concurrentRuns: number;
  /**
   * Timestamp of the most recent acquireRunSlot() call.
   * Used in gc() to TTL-reset stale concurrency slots when the caller
   * crashes before calling the release function.
   */
  lastSlotAcquireMs: number;
};

// ── PerUserRateLimiter ───────────────────────────────────────────────────────

export class PerUserRateLimiter {
  readonly name = "per-user-rate-limiter";
  private readonly config: Required<
    Pick<
      PerUserRateLimiterConfig,
      | "maxCostPerUser"
      | "maxTokensPerUser"
      | "maxTurnsPerUser"
      | "maxConcurrentRuns"
      | "windowMs"
      | "gcIntervalMs"
    >
  > &
    Pick<PerUserRateLimiterConfig, "onLimitEvent" | "bypassRoles">;

  private readonly buckets = new Map<string, UserBucket>();
  private gcTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Maximum time a concurrency slot may be held before gc()
   * force-resets it. Protects against callers that crash without releasing.
   * Default: 10 minutes.
   */
  private readonly slotTtlMs: number;

  constructor(config: PerUserRateLimiterConfig & { slotTtlMs?: number } = {}) {
    this.config = {
      maxCostPerUser: config.maxCostPerUser ?? Infinity,
      maxTokensPerUser: config.maxTokensPerUser ?? Infinity,
      maxTurnsPerUser: config.maxTurnsPerUser ?? Infinity,
      maxConcurrentRuns: config.maxConcurrentRuns ?? Infinity,
      windowMs: config.windowMs ?? 3_600_000,
      gcIntervalMs: config.gcIntervalMs ?? 60_000,
      onLimitEvent: config.onLimitEvent,
      bypassRoles: config.bypassRoles,
    };
    this.slotTtlMs = config.slotTtlMs ?? 10 * 60_000;

    // BUG FIX: GC timer is now started lazily on first recordUsage(),
    // not eagerly in the constructor. This prevents timer leaks when
    // a PerUserRateLimiter is constructed but dispose() is never called
    // (e.g., short-lived request handlers or tests).
  }

  /**
   * Lazily start the GC timer on first usage recording.
   * Ensures the interval only exists when there's data to garbage-collect.
   */
  private ensureGcStarted(): void {
    if (this.gcTimer) return;
    if (this.config.gcIntervalMs > 0 && isFinite(this.config.windowMs)) {
      this.gcTimer = setInterval(() => this.gc(), this.config.gcIntervalMs);
      this.gcTimer.unref?.();
    }
  }

  // ── Check ───────────────────────────────────────────────────────────────

  /**
   * Check if a user is within their rate limits.
   *
   * @param userId - The user's unique identifier
   * @param roles - User's roles (for bypass check)
   */
  check(userId: string, roles?: string[]): RateLimitCheckResult {
    // Bypass check
    if (this.shouldBypass(roles)) {
      return {
        blocked: false,
        usage: { cost: 0, tokens: 0, turns: 0, concurrentRuns: 0, windowStart: Date.now() },
      };
    }

    const usage = this.getUsage(userId);

    // Cost check
    if (isFinite(this.config.maxCostPerUser) && usage.cost >= this.config.maxCostPerUser) {
      this.emitEvent(userId, "cost", usage.cost, this.config.maxCostPerUser, "blocked");
      return {
        blocked: true,
        reason: `User "${userId}" cost limit exceeded: $${usage.cost.toFixed(4)} / $${this.config.maxCostPerUser.toFixed(2)}`,
        usage,
      };
    }

    // Token check
    if (isFinite(this.config.maxTokensPerUser) && usage.tokens >= this.config.maxTokensPerUser) {
      this.emitEvent(userId, "tokens", usage.tokens, this.config.maxTokensPerUser, "blocked");
      return {
        blocked: true,
        reason: `User "${userId}" token limit exceeded: ${usage.tokens.toLocaleString()} / ${this.config.maxTokensPerUser.toLocaleString()}`,
        usage,
      };
    }

    // Turn check
    if (isFinite(this.config.maxTurnsPerUser) && usage.turns >= this.config.maxTurnsPerUser) {
      this.emitEvent(userId, "turns", usage.turns, this.config.maxTurnsPerUser, "blocked");
      return {
        blocked: true,
        reason: `User "${userId}" turn limit exceeded: ${usage.turns} / ${this.config.maxTurnsPerUser}`,
        usage,
      };
    }

    // Concurrent check
    if (
      isFinite(this.config.maxConcurrentRuns) &&
      usage.concurrentRuns >= this.config.maxConcurrentRuns
    ) {
      this.emitEvent(
        userId,
        "concurrent",
        usage.concurrentRuns,
        this.config.maxConcurrentRuns,
        "blocked",
      );
      return {
        blocked: true,
        reason: `User "${userId}" concurrent run limit exceeded: ${usage.concurrentRuns} / ${this.config.maxConcurrentRuns}`,
        usage,
      };
    }

    return { blocked: false, usage };
  }

  /**
   * Check and throw if blocked.
   */
  enforce(userId: string, roles?: string[]): void {
    const result = this.check(userId, roles);
    if (result.blocked) {
      throw new Error(result.reason);
    }
  }

  // ── Usage Recording ─────────────────────────────────────────────────────

  /**
   * Record usage for a user.
   */
  recordUsage(userId: string, usage: { cost?: number; tokens?: number; turns?: number }): void {
    this.ensureGcStarted();
    const bucket = this.getOrCreateBucket(userId);
    bucket.entries.push({
      timestamp: Date.now(),
      cost: usage.cost ?? 0,
      tokens: usage.tokens ?? 0,
      turns: usage.turns ?? 0,
    });
  }

  /**
   * Increment concurrent run counter for a user. Returns a release function.
   *
   * Records `lastSlotAcquireMs` so gc() can TTL-reset stale slots
   * if the caller crashes without calling the release function.
   */
  acquireRunSlot(userId: string): () => void {
    const bucket = this.getOrCreateBucket(userId);
    bucket.concurrentRuns++;
    bucket.lastSlotAcquireMs = Date.now();
    let released = false;
    return () => {
      if (!released) {
        released = true;
        bucket.concurrentRuns = Math.max(0, bucket.concurrentRuns - 1);
      }
    };
  }

  /**
   * Atomically check the concurrent-run limit and acquire a slot
   * in a single synchronous call.
   *
   * Without this, two concurrent callers can both pass `check()` before either
   * calls `acquireRunSlot()`, allowing `maxConcurrentRuns` to be exceeded:
   *
   * ```
   * // WRONG — race between check and acquire:
   * const result = limiter.check(userId) // both pass simultaneously
   * if (result.blocked) throw ...
   * const release = limiter.acquireRunSlot(userId) // both increment → over limit
   *
   * // CORRECT — atomic:
   * const { blocked, reason, release } = limiter.checkAndAcquire(userId, roles)
   * if (blocked) throw new Error(reason)
   * try { await run() } finally { release() }
   * ```
   */
  checkAndAcquire(
    userId: string,
    roles?: string[],
  ): {
    blocked: boolean;
    reason?: string;
    usage: UserUsageSummary;
    release: () => void;
  } {
    // Bypass — return no-op release
    if (this.shouldBypass(roles)) {
      return {
        blocked: false,
        usage: { cost: 0, tokens: 0, turns: 0, concurrentRuns: 0, windowStart: Date.now() },
        release: () => {},
      };
    }

    // Synchronously perform all limit checks AND increment the slot counter
    // before any async work begins — this is the key atomicity guarantee.
    const usage = this.getUsage(userId);

    if (isFinite(this.config.maxCostPerUser) && usage.cost >= this.config.maxCostPerUser) {
      this.emitEvent(userId, "cost", usage.cost, this.config.maxCostPerUser, "blocked");
      return {
        blocked: true,
        reason: `User "${userId}" cost limit exceeded`,
        usage,
        release: () => {},
      };
    }
    if (isFinite(this.config.maxTokensPerUser) && usage.tokens >= this.config.maxTokensPerUser) {
      this.emitEvent(userId, "tokens", usage.tokens, this.config.maxTokensPerUser, "blocked");
      return {
        blocked: true,
        reason: `User "${userId}" token limit exceeded`,
        usage,
        release: () => {},
      };
    }
    if (isFinite(this.config.maxTurnsPerUser) && usage.turns >= this.config.maxTurnsPerUser) {
      this.emitEvent(userId, "turns", usage.turns, this.config.maxTurnsPerUser, "blocked");
      return {
        blocked: true,
        reason: `User "${userId}" turn limit exceeded`,
        usage,
        release: () => {},
      };
    }
    if (
      isFinite(this.config.maxConcurrentRuns) &&
      usage.concurrentRuns >= this.config.maxConcurrentRuns
    ) {
      this.emitEvent(
        userId,
        "concurrent",
        usage.concurrentRuns,
        this.config.maxConcurrentRuns,
        "blocked",
      );
      return {
        blocked: true,
        reason: `User "${userId}" concurrent run limit exceeded`,
        usage,
        release: () => {},
      };
    }

    // All checks passed — atomically acquire the slot
    const release = this.acquireRunSlot(userId);
    return { blocked: false, usage, release };
  }

  // ── Query ───────────────────────────────────────────────────────────────

  /**
   * Get aggregated usage for a user within the current window.
   */
  getUsage(userId: string): UserUsageSummary {
    const bucket = this.buckets.get(userId);
    if (!bucket) {
      return { cost: 0, tokens: 0, turns: 0, concurrentRuns: 0, windowStart: Date.now() };
    }

    const cutoff = Date.now() - this.config.windowMs;
    let cost = 0,
      tokens = 0,
      turns = 0;
    let windowStart = Date.now();

    for (const entry of bucket.entries) {
      if (entry.timestamp >= cutoff) {
        cost += entry.cost;
        tokens += entry.tokens;
        turns += entry.turns;
        if (entry.timestamp < windowStart) windowStart = entry.timestamp;
      }
    }

    return { cost, tokens, turns, concurrentRuns: bucket.concurrentRuns, windowStart };
  }

  /**
   * Get status for all tracked users.
   */
  getAllUsers(): Array<{ userId: string; usage: UserUsageSummary }> {
    const result: Array<{ userId: string; usage: UserUsageSummary }> = [];
    for (const userId of this.buckets.keys()) {
      result.push({ userId, usage: this.getUsage(userId) });
    }
    return result;
  }

  /**
   * Reset usage for a specific user.
   */
  resetUser(userId: string): void {
    this.buckets.delete(userId);
  }

  /**
   * Stop the GC timer. Call when shutting down.
   */
  dispose(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private getOrCreateBucket(userId: string): UserBucket {
    let bucket = this.buckets.get(userId);
    if (!bucket) {
      bucket = { entries: [], concurrentRuns: 0, lastSlotAcquireMs: 0 };
      this.buckets.set(userId, bucket);
    }
    return bucket;
  }

  private shouldBypass(roles?: string[]): boolean {
    if (!this.config.bypassRoles || !roles) return false;
    return roles.some((r) => this.config.bypassRoles!.includes(r));
  }

  private emitEvent(
    userId: string,
    resource: RateLimitEvent["resource"],
    current: number,
    limit: number,
    action: RateLimitEvent["action"],
  ): void {
    this.config.onLimitEvent?.({
      userId,
      resource,
      current,
      limit,
      action,
      timestamp: new Date(),
    });
  }

  /** Garbage collect expired entries */
  private gc(): void {
    const cutoff = Date.now() - this.config.windowMs;
    const now = Date.now();
    for (const [userId, bucket] of this.buckets) {
      bucket.entries = bucket.entries.filter((e) => e.timestamp >= cutoff);

      // TTL-reset stale concurrency slots.
      // If concurrentRuns > 0 but the slot was acquired more than slotTtlMs ago
      // and no entries have been added since, assume the caller crashed without
      // releasing and reset the counter to prevent permanent user lock-out.
      if (bucket.concurrentRuns > 0 && now - bucket.lastSlotAcquireMs > this.slotTtlMs) {
        bucket.concurrentRuns = 0;
      }

      // Remove empty buckets with no concurrent runs
      if (bucket.entries.length === 0 && bucket.concurrentRuns === 0) {
        this.buckets.delete(userId);
      }
    }
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a per-user rate limiter.
 */
export function perUserRateLimiter(config?: PerUserRateLimiterConfig): PerUserRateLimiter {
  return new PerUserRateLimiter(config);
}
