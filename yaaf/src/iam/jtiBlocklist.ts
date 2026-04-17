/**
 * JTI Blocklist — JWT Token Revocation via JTI (JWT ID) Blocklisting
 *
 * Prevents revoked JWTs from being accepted even before their `exp` claim
 * expires. Two implementations:
 *
 * - `InMemoryJtiBlocklist` — single-process, auto-GC at expiry. Zero deps.
 * - `RedisJtiBlocklist` — multi-process, survives restarts. Requires ioredis.
 *
 * ## Usage
 * ```ts
 * import { InMemoryJtiBlocklist } from 'yaaf/iam'
 * import { JwtIdentityProvider } from 'yaaf/iam'
 *
 * const blocklist = new InMemoryJtiBlocklist()
 *
 * const idp = new JwtIdentityProvider({
 * jwksUri: 'https://auth.example.com/.well-known/jwks.json',
 * jtiBlocklist: blocklist, // revoked tokens will be rejected
 * })
 *
 * // Revoke a token (e.g., on logout):
 * const { payload } = decodeJwt(token)
 * if (payload.jti && payload.exp) {
 * await blocklist.add(payload.jti, payload.exp * 1000)
 * }
 * ```
 *
 * @module iam/jtiBlocklist
 */

// ── Interface ─────────────────────────────────────────────────────────────────

export interface JtiBlocklist {
  /**
   * Add a JTI to the blocklist.
   * @param jti The JWT ID from the `jti` claim.
   * @param expiresAt Epoch milliseconds when the token expires (used for GC).
   */
  add(jti: string, expiresAt: number): Promise<void>;

  /** Returns true if the JTI is blocked (revoked). */
  has(jti: string): Promise<boolean>;

  /**
   * Remove expired entries from the blocklist.
   * Called automatically by the GC timer in InMemoryJtiBlocklist.
   */
  gc?(): Promise<void>;
}

// ── InMemoryJtiBlocklist ──────────────────────────────────────────────────────

type BlocklistEntry = { expiresAt: number };

/**
 * In-memory JTI blocklist with automatic GC.
 *
 * **Limitation:** Resets on process restart. For multi-instance deployments
 * use `RedisJtiBlocklist` (requires ioredis peer dependency).
 */
export class InMemoryJtiBlocklist implements JtiBlocklist {
  private readonly entries = new Map<string, BlocklistEntry>();
  private readonly gcTimer: ReturnType<typeof setInterval>;

  /**
   * @param gcIntervalMs How often to GC expired entries (default: 60 seconds).
   */
  constructor(gcIntervalMs = 60_000) {
    this.gcTimer = setInterval(() => void this.gc(), gcIntervalMs);
    if (typeof this.gcTimer.unref === "function") this.gcTimer.unref();
  }

  async add(jti: string, expiresAt: number): Promise<void> {
    this.entries.set(jti, { expiresAt });
  }

  async has(jti: string): Promise<boolean> {
    const entry = this.entries.get(jti);
    if (!entry) return false;
    // Auto-evict expired entries on lookup
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(jti);
      return false;
    }
    return true;
  }

  async gc(): Promise<void> {
    const now = Date.now();
    for (const [jti, entry] of this.entries) {
      if (now > entry.expiresAt) this.entries.delete(jti);
    }
  }

  /** Stop the GC timer (call on graceful shutdown). */
  dispose(): void {
    clearInterval(this.gcTimer);
  }

  /** Number of entries currently in the blocklist. */
  get size(): number {
    return this.entries.size;
  }
}

// ── RedisJtiBlocklist (optional — requires ioredis) ───────────────────────────

/**
 * Redis-backed JTI blocklist. Survives restarts and works across multiple
 * instances in a cluster.
 *
 * Requires `ioredis` as a peer dependency:
 * ```sh
 * npm install ioredis
 * ```
 *
 * @example
 * ```ts
 * import Redis from 'ioredis'
 * import { RedisJtiBlocklist } from 'yaaf/iam'
 *
 * const redis = new Redis({ host: 'localhost', port: 6379 })
 * const blocklist = new RedisJtiBlocklist(redis)
 * ```
 */
export class RedisJtiBlocklist implements JtiBlocklist {
  private readonly redis: RedisClient;
  private readonly keyPrefix: string;

  constructor(redis: RedisClient, keyPrefix = "yaaf:jti:blocked:") {
    this.redis = redis;
    this.keyPrefix = keyPrefix;
  }

  async add(jti: string, expiresAt: number): Promise<void> {
    const ttlSeconds = Math.ceil((expiresAt - Date.now()) / 1000);
    if (ttlSeconds <= 0) return; // already expired — no need to block
    // SET with EX auto-expires the key at token expiry — no manual GC needed
    await this.redis.set(`${this.keyPrefix}${jti}`, "1", "EX", ttlSeconds);
  }

  async has(jti: string): Promise<boolean> {
    const value = await this.redis.get(`${this.keyPrefix}${jti}`);
    return value !== null;
  }
}

/** Minimal Redis client interface (compatible with ioredis and node-redis). */
interface RedisClient {
  set(key: string, value: string, mode: "EX", ttlSeconds: number): Promise<unknown>;
  get(key: string): Promise<string | null>;
}
