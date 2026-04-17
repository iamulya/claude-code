/**
 * Identity Providers — concrete implementations of IdentityProvider.
 *
 * Four providers covering the most common authentication patterns:
 *
 * 1. **JwtIdentityProvider** — JWT Bearer tokens (HMAC, RSA, EC, JWKS)
 * 2. **ApiKeyIdentityProvider** — static or dynamic API key lookup
 * 3. **OidcIdentityProvider** — OpenID Connect (auto-discovers JWKS from issuer)
 * 4. **CompositeIdentityProvider** — try multiple providers in order
 *
 * All implement the `IdentityProvider` interface from `iam/types.ts`.
 * They can also be wrapped as `IdentityAdapter` plugins using `PluginBase`.
 *
 * @module iam/providers
 *
 * @example
 * ```ts
 * import { JwtIdentityProvider, rbac, Agent, createServer } from 'yaaf'
 *
 * const identity = new JwtIdentityProvider({
 * jwksUri: 'https://auth.example.com/.well-known/jwks.json',
 * claims: { userId: 'sub', roles: 'groups' },
 * })
 *
 * const agent = new Agent({
 * accessPolicy: {
 * identityProvider: identity,
 * authorization: rbac({ viewer: ['read_*'], admin: ['*'] }),
 * },
 * })
 * ```
 */

import type { IdentityProvider, IncomingRequest, UserContext, UserCredentials } from "./types.js";
import {
  verifyJwt,
  verifyJwtWithJwks,
  type JwtPayload,
  type JwtVerifyOptions,
  type JwksRetryConfig,
  JwtError,
} from "./jwt.js";

// ── Utility: deep get ─────────────────────────────────────────────────────────

/**
 * Resolve a dot-separated path on an object.
 * e.g., getPath({ a: { b: [1,2] } }, 'a.b') → [1,2]
 *
 * Guard against prototype-pollution path segments.
 * A crafted JWT payload with a claim named `__proto__` could allow an
 * attacker to traverse out of the payload object's own properties.
 */
const FORBIDDEN_CLAIM_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

function getPath(obj: Record<string, unknown>, path: string): unknown {
  let current: unknown = obj;
  for (const key of path.split(".")) {
    // Reject prototype-polluting path segments
    if (FORBIDDEN_CLAIM_SEGMENTS.has(key)) return undefined;
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

// ── JWT Identity Provider ─────────────────────────────────────────────────────

/**
 * Configuration for JwtIdentityProvider.
 *
 * Must supply exactly one of: `jwksUri`, `secret`, or `publicKey`.
 */
export type JwtIdentityConfig = {
  // ── Key source (pick one) ───────────────────────────────────────────────────

  /** JWKS endpoint URL — auto-fetches and caches signing keys (recommended) */
  jwksUri?: string;

  /** HMAC shared secret (for HS256/HS384/HS512) */
  secret?: string;

  /** PEM-encoded public key (for RS256/ES256/etc.) */
  publicKey?: string;

  // ── Claim mapping ──────────────────────────────────────────────────────────

  /**
   * Map JWT claims to UserContext fields.
   * Values are dot-separated paths into the JWT payload.
   *
   * @example
   * ```ts
   * claims: {
   * userId: 'sub', // required
   * name: 'name',
   * roles: 'realm_access.roles', // Keycloak-style nested claim
   * attributes: {
   * tenantId: 'org_id', // Auth0 org
   * department: 'custom:department', // custom claim
   * },
   * }
   * ```
   */
  claims: {
    /** Claim path for userId (required) */
    userId: string;
    /** Claim path for display name */
    name?: string;
    /** Claim path for roles array */
    roles?: string;
    /** Map of attribute name → claim path */
    attributes?: Record<string, string>;
  };

  // ── Validation ─────────────────────────────────────────────────────────────

  /** Expected issuer (`iss` claim) */
  issuer?: string;

  /** Expected audience (`aud` claim) */
  audience?: string;

  /** Accepted algorithms (default: RS256, ES256 for JWKS/PEM; HS256 for secret) */
  algorithms?: string[];

  /** Clock tolerance in seconds (default: 30) */
  clockToleranceSec?: number;

  // ── Token extraction ───────────────────────────────────────────────────────

  /**
   * Custom header to read the token from.
   * Default: 'authorization' (reads Bearer token).
   */
  header?: string;

  /**
   * Query parameter to read the token from (fallback if header is missing).
   * Disabled by default.
   *
   * ⚠️ **Security Warning:** Tokens placed in query parameters are logged by
   * virtually every web server, reverse proxy (nginx, Cloudflare, AWS ALB), and
   * CDN access-log pipeline. Use this option **only for local development**. In
   * production, always deliver tokens via the `Authorization` header.
   */
  queryParam?: string;

  /**
   * Whether to propagate the original token as UserCredentials.
   * Default: true
   */
  propagateCredentials?: boolean;

  /**
   * S4-B FIX: Optional JTI blocklist for token revocation.
   * When set, revoked tokens (added via blocklist.add()) will be rejected
   * even before they expire naturally.
   *
   * @example
   * ```ts
   * import { InMemoryJtiBlocklist } from 'yaaf/iam'
   *
   * const blocklist = new InMemoryJtiBlocklist()
   * const idp = new JwtIdentityProvider({
   * jwksUri: 'https://auth.example.com/.well-known/jwks.json',
   * claims: { userId: 'sub' },
   * jtiBlocklist: blocklist,
   * })
   *
   * // On logout:
   * const { payload } = decodeJwt(token)
   * if (payload.jti && payload.exp) {
   * await blocklist.add(payload.jti, payload.exp * 1000)
   * }
   * ```
   */
  jtiBlocklist?: { has(jti: string): Promise<boolean> };

  /**
   * JWKS-RETRY FIX: Retry policy for transient JWKS fetch failures.
   *
   * Only retries on network errors and 5xx responses (not 4xx).
   * Default when omitted: single attempt (no retry).
   * Recommended production setting:
   * ```ts
   * jwksRetry: { maxAttempts: 3, baseDelayMs: 500, maxDelayMs: 4_000 }
   * ```
   */
  jwksRetry?: JwksRetryConfig;

  /**
   * When true, tokens without a `jti` claim are rejected.
   * Recommended: set to true when jtiBlocklist is provided.
   * Default: false
   */
  requireJti?: boolean;
};

export class JwtIdentityProvider implements IdentityProvider {
  readonly name = "jwt";
  private readonly config: JwtIdentityConfig;

  constructor(config: JwtIdentityConfig) {
    const sources = [config.jwksUri, config.secret, config.publicKey].filter(Boolean);
    if (sources.length === 0) {
      throw new Error("JwtIdentityProvider requires one of: jwksUri, secret, publicKey");
    }
    if (sources.length > 1) {
      throw new Error("JwtIdentityProvider: provide only one of jwksUri, secret, publicKey");
    }
    this.config = config;
  }

  async resolve(request: IncomingRequest): Promise<UserContext | null> {
    const token = this.extractToken(request);
    if (!token) return null; // No token present → not our concern, try next provider

    // if a token IS present, verification failures must NOT be swallowed.
    // An invalid token should not degrade to "anonymous" — it should reject.
    const payload = await this.verifyToken(token);
    return this.payloadToUserContext(payload, token);
  }

  private extractToken(request: IncomingRequest): string | null {
    // Pre-parsed token takes priority
    if (request.token) return request.token;

    // Authorization header
    const headerName = this.config.header ?? "authorization";
    const headerValue = request.headers[headerName] ?? request.headers[headerName.toLowerCase()];
    if (headerValue) {
      // Strip "Bearer " prefix if present
      if (headerValue.toLowerCase().startsWith("bearer ")) {
        return headerValue.slice(7).trim();
      }
      return headerValue.trim();
    }

    // Query parameter fallback
    if (this.config.queryParam && request.query) {
      const qp = request.query[this.config.queryParam];
      if (qp) return qp;
    }

    return null;
  }

  private async verifyToken(token: string): Promise<JwtPayload> {
    const verifyOptions: JwtVerifyOptions = {
      algorithms: this.config.algorithms ?? (this.config.secret ? ["HS256"] : ["RS256", "ES256"]),
      issuer: this.config.issuer,
      audience: this.config.audience,
      clockToleranceSec: this.config.clockToleranceSec,
      // S4-B FIX: Thread JTI blocklist through to verifyJwt
      jtiBlocklist: this.config.jtiBlocklist,
      requireJti: this.config.requireJti,
    };

    if (this.config.jwksUri) {
      return verifyJwtWithJwks(token, this.config.jwksUri, {
        ...verifyOptions,
        retryConfig: this.config.jwksRetry,
      });
    }

    const keyMaterial = this.config.secret ?? this.config.publicKey!;
    return verifyJwt(token, keyMaterial, verifyOptions);
  }

  private payloadToUserContext(payload: JwtPayload, token: string): UserContext | null {
    const claims = this.config.claims;

    // userId is required — MISCONFIGURATION FIX: throw instead of returning null.
    // Returning null here signals "I don't handle this request" to the composite
    // provider, which may silently fall through to an anonymous provider.
    // But the token WAS present and WAS verified — the claim path is just wrong.
    // Throwing exposes the misconfiguration immediately rather than granting anonymous access.
    const userId = getPath(payload, claims.userId) as string | undefined;
    if (!userId) {
      throw new Error(
        `JwtIdentityProvider: JWT verified successfully but userId claim ` +
          `"${claims.userId}" is absent from the payload. ` +
          `Check the 'claims.userId' configuration. ` +
          `Available payload keys: ${Object.keys(payload).join(", ")}`,
      );
    }

    const user: UserContext = { userId };

    // Optional name
    if (claims.name) {
      const name = getPath(payload, claims.name) as string | undefined;
      if (name) user.name = name;
    }

    // Optional roles
    if (claims.roles) {
      const roles = getPath(payload, claims.roles);
      if (Array.isArray(roles)) {
        user.roles = roles.map(String);
      } else if (typeof roles === "string") {
        // Some providers return space-separated roles
        user.roles = roles.split(/[,\s]+/).filter(Boolean);
      }
    }

    // Optional attributes
    if (claims.attributes) {
      const attributes: Record<string, unknown> = {};
      for (const [attrName, claimPath] of Object.entries(claims.attributes)) {
        const value = getPath(payload, claimPath);
        if (value !== undefined) attributes[attrName] = value;
      }
      if (Object.keys(attributes).length > 0) user.attributes = attributes;
    }

    // Propagate credentials
    if (this.config.propagateCredentials !== false) {
      const credentials: UserCredentials = {
        type: "bearer",
        token,
        scopes: payload.scope ? String(payload.scope).split(" ").filter(Boolean) : undefined,
        expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
      };
      user.credentials = credentials;
    }

    return user;
  }
}

// ── API Key Identity Provider ─────────────────────────────────────────────────

/**
 * Configuration for ApiKeyIdentityProvider.
 *
 * Supply either `keys` (static map) or `resolve` (dynamic lookup), or both
 * (static checked first, then dynamic).
 */
export type ApiKeyIdentityConfig = {
  /**
   * Static key → user map.
   *
   * @example
   * ```ts
   * keys: {
   * 'sk-prod-abc': { userId: 'alice', roles: ['admin'] },
   * 'sk-dev-xyz': { userId: 'bob', roles: ['viewer'] },
   * }
   * ```
   */
  keys?: Record<string, Partial<UserContext> & { userId: string }>;

  /**
   * Dynamic resolver — called when the key is not in `keys` (or keys is empty).
   * Return null if the key is invalid.
   */
  resolve?: (key: string) => Promise<UserContext | null> | UserContext | null;

  /**
   * Header to read the API key from.
   * Default: reads from 'authorization' (Bearer <key>) or 'x-api-key'.
   */
  header?: string;

  /**
   * Query parameter to read the key from.
   * Default: 'api_key'
   */
  queryParam?: string;

  /**
   * Whether to propagate the API key as UserCredentials.
   * Default: false (API keys are sensitive — don't propagate by default)
   */
  propagateCredentials?: boolean;
};

export class ApiKeyIdentityProvider implements IdentityProvider {
  readonly name = "api-key";
  private readonly config: ApiKeyIdentityConfig;

  constructor(config: ApiKeyIdentityConfig) {
    if (!config.keys && !config.resolve) {
      throw new Error("ApiKeyIdentityProvider requires at least one of: keys, resolve");
    }
    this.config = config;
  }

  async resolve(request: IncomingRequest): Promise<UserContext | null> {
    const key = this.extractKey(request);
    if (!key) return null;

    // Static lookup first
    if (this.config.keys) {
      const entry = this.config.keys[key];
      if (entry) {
        const user: UserContext = { ...entry };
        if (this.config.propagateCredentials) {
          user.credentials = { type: "api_key", token: key };
        }
        return user;
      }
    }

    // Dynamic resolver
    if (this.config.resolve) {
      // SECURITY FIX: Do NOT catch resolver errors.
      // A dynamic resolver that throws (DB down, network timeout) must NOT
      // silently degrade to null/anonymous — it must propagate so that the
      // CompositeIdentityProvider (or caller) can fail closed.
      const user = await this.config.resolve(key);
      if (user) {
        if (this.config.propagateCredentials && !user.credentials) {
          user.credentials = { type: "api_key", token: key };
        }
        return user;
      }
      // Resolver returned null = key not found = this provider is authoritative
      // but rejected the key. Throw so no fallthrough to an anonymous provider.
      throw new Error(`API key authentication failed: key not recognized`);
    }

    return null;
  }

  private extractKey(request: IncomingRequest): string | null {
    // Pre-parsed token
    if (request.token) return request.token;

    // Custom header
    if (this.config.header) {
      const value =
        request.headers[this.config.header] ?? request.headers[this.config.header.toLowerCase()];
      if (value) return value.replace(/^Bearer\s+/i, "").trim();
    }

    // Default: Authorization header
    const auth = request.headers["authorization"] ?? request.headers["Authorization"];
    if (auth) {
      const stripped = auth.replace(/^Bearer\s+/i, "").trim();
      // A JWT has the form header.payload.signature (all base64url).
      // If the stripped value looks like a JWT, it is almost certainly a Bearer
      // token, not an API key. Accept it only if a custom header is configured
      // (in which case the caller opted in to this header for API keys).
      // Without this guard, a JWT presented to an API-key endpoint would be
      // passed to the dynamic resolver, possibly being accepted by a loose DB lookup.
      if (looksLikeJwt(stripped)) {
        console.warn(
          "[yaaf/iam] ApiKeyIdentityProvider: Authorization header contains a JWT-shaped value. " +
            "Use a JwtIdentityProvider for JWT-based authentication, or set config.header to a " +
            'custom header (e.g., "x-api-key") to silence this warning.',
        );
        return null;
      }
      return stripped;
    }

    // X-API-Key header
    const xApiKey = request.headers["x-api-key"] ?? request.headers["X-API-Key"];
    if (xApiKey) return xApiKey.trim();

    // Query parameter
    const qp = this.config.queryParam ?? "api_key";
    if (request.query?.[qp]) return request.query[qp];

    return null;
  }
}

/**
 * Detect JWT-shaped values (three base64url segments separated by dots).
 * Used by ApiKeyIdentityProvider to guard against JWT tokens being silently
 * treated as API keys when presented in the Authorization header.
 */
function looksLikeJwt(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  // All three segments must be non-empty base64url strings
  const base64urlRe = /^[A-Za-z0-9_-]+$/;
  return parts.every((p) => p.length > 0 && base64urlRe.test(p));
}

// ── OIDC Identity Provider ────────────────────────────────────────────────────

/**
 * Configuration for OidcIdentityProvider.
 *
 * Auto-discovers the JWKS endpoint from the OIDC issuer's
 * `/.well-known/openid-configuration`.
 */
export type OidcIdentityConfig = {
  /** OIDC issuer URL (e.g., 'https://accounts.google.com') */
  issuerUrl: string;

  /** OAuth client ID (used for audience validation) */
  clientId: string;

  /**
   * Claim mapping — same as JwtIdentityProvider.
   * Default: { userId: 'sub', name: 'name', roles: 'groups' }
   */
  claims?: JwtIdentityConfig["claims"];

  /** Accepted algorithms (default: RS256, ES256) */
  algorithms?: string[];

  /** Clock tolerance in seconds (default: 30) */
  clockToleranceSec?: number;

  /** Whether to propagate the token as UserCredentials (default: true) */
  propagateCredentials?: boolean;
};

export class OidcIdentityProvider implements IdentityProvider {
  readonly name = "oidc";
  private readonly config: OidcIdentityConfig;
  private _jwtProvider: JwtIdentityProvider | null = null;
  private _discoveryPromise: Promise<JwtIdentityProvider> | null = null;
  /**
   * JWKS discovery cache TTL.
   * OIDC providers rotate signing keys (JWKS rollover) typically on 24h-7d
   * cycles. Previously the cache was permanent, causing auth outages after key
   * rotation until the service was restarted. Now the cached provider is
   * re-discovered when the TTL expires or on JWT verification failures.
   */
  private _discoveryExpiresAt = 0;
  private static readonly DISCOVERY_TTL_MS = 60 * 60_000; // 1 hour
  /**
   * OIDC THUNDERING-HERD FIX: Explicit mutex flag to prevent concurrent
   * discovery fetches when TTL expires simultaneously for many requests.
   *
   * Root cause: `_discoveryPromise` was cleared alongside `_jwtProvider`
   * in the TTL eviction block, then the dedup guard checked `_discoveryPromise`
   * again — but both steps happen in the same synchronous execution, so multiple
   * concurrent awaiting coroutines all see null and each fires `discover()`.
   *
   * Fix: separate the "is discovery in progress" flag from the promise itself.
   * `_discovering` is set true before clearing stale state, preventing re-entry.
   */
  private _discovering = false;

  constructor(config: OidcIdentityConfig) {
    this.config = config;
  }

  async resolve(request: IncomingRequest): Promise<UserContext | null> {
    // On JwtError (e.g., signature invalid after key rotation), clear
    // the cached provider so the next request triggers fresh OIDC discovery.
    try {
      const provider = await this.getJwtProvider();
      return provider.resolve(request);
    } catch (err) {
      if (err instanceof JwtError) {
        // Key rotation suspected — invalidate the discovery cache
        this._jwtProvider = null;
        this._discoveryPromise = null;
        this._discoveryExpiresAt = 0;
      }
      throw err;
    }
  }

  private async getJwtProvider(): Promise<JwtIdentityProvider> {
    // THUNDERING-HERD FIX: Check the in-progress flag FIRST, before any state
    // modification. If discovery is already running, wait for the existing promise.
    if (this._discovering && this._discoveryPromise) {
      return this._discoveryPromise;
    }

    // Respect TTL — evict the cache when it expires.
    if (this._jwtProvider && Date.now() < this._discoveryExpiresAt) {
      return this._jwtProvider;
    }

    // TTL expired or first call — set the in-progress flag BEFORE clearing state
    // to prevent any concurrent coroutine from seeing a null promise and firing
    // a duplicate discover() call.
    this._discovering = true;
    this._jwtProvider = null;
    this._discoveryPromise = this.discover().finally(() => {
      this._discovering = false;
    });

    return this._discoveryPromise;
  }

  private async discover(): Promise<JwtIdentityProvider> {
    const url = this.config.issuerUrl.replace(/\/$/, "") + "/.well-known/openid-configuration";
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `OIDC discovery failed: ${response.status} ${response.statusText} from ${url}`,
      );
    }
    const config = (await response.json()) as { jwks_uri: string; issuer: string };

    if (!config.jwks_uri) {
      throw new Error("OIDC discovery response missing jwks_uri");
    }

    this._jwtProvider = new JwtIdentityProvider({
      jwksUri: config.jwks_uri,
      issuer: config.issuer ?? this.config.issuerUrl,
      audience: this.config.clientId,
      claims: this.config.claims ?? {
        userId: "sub",
        name: "name",
        roles: "groups",
      },
      algorithms: this.config.algorithms,
      clockToleranceSec: this.config.clockToleranceSec,
      propagateCredentials: this.config.propagateCredentials,
    });

    // Record the TTL so the cache is automatically invalidated after 1 hour.
    // This ensures JWKS key rotations are picked up without a service restart.
    this._discoveryExpiresAt = Date.now() + OidcIdentityProvider.DISCOVERY_TTL_MS;

    return this._jwtProvider;
  }
}

// ── Composite Identity Provider ───────────────────────────────────────────────

/**
 * Configuration for CompositeIdentityProvider.
 */
export type CompositeIdentityConfig = {
  /** Providers to try, in order. First non-null result wins. */
  providers: IdentityProvider[];

  /**
   * If true, return null (anonymous) when all providers return null.
   * If false (default), unauthenticated requests fail.
   */
  allowAnonymous?: boolean;
};

export class CompositeIdentityProvider implements IdentityProvider {
  readonly name = "composite";
  private readonly providers: IdentityProvider[];
  private readonly allowAnonymous: boolean;

  constructor(config: CompositeIdentityConfig);
  constructor(providers: IdentityProvider[]);
  constructor(arg: CompositeIdentityConfig | IdentityProvider[]) {
    if (Array.isArray(arg)) {
      this.providers = arg;
      this.allowAnonymous = false;
    } else {
      this.providers = arg.providers;
      this.allowAnonymous = arg.allowAnonymous ?? false;
    }
    if (this.providers.length === 0) {
      throw new Error("CompositeIdentityProvider requires at least one provider");
    }
  }

  async resolve(request: IncomingRequest): Promise<UserContext | null> {
    const errors: Array<{ provider: string; error: unknown }> = [];

    for (const provider of this.providers) {
      try {
        const user = await provider.resolve(request);
        if (user) return user;
      } catch (err) {
        // collect errors instead of silently swallowing.
        // If ALL providers fail, the error from the first provider that threw
        // is more informative than a silent null.
        errors.push({ provider: provider.name, error: err });
        continue;
      }
    }

    // If any provider threw (rather than returning null), propagate the error
    // to prevent silent degradation from "auth failed" to "anonymous".
    if (errors.length > 0 && !this.allowAnonymous) {
      const firstErr = errors[0]!.error;
      throw firstErr instanceof Error ? firstErr : new Error(String(firstErr));
    }

    return null;
  }
}

// ── Anonymous Identity Provider ───────────────────────────────────────────────

/**
 * Always returns a fixed anonymous user context.
 * Useful as the last provider in a composite chain to allow unauthenticated access.
 */
export class AnonymousIdentityProvider implements IdentityProvider {
  readonly name = "anonymous";
  private readonly user: UserContext;

  constructor(user?: Partial<UserContext>) {
    this.user = {
      userId: "anonymous",
      roles: ["anonymous"],
      ...user,
    };
  }

  async resolve(_request: IncomingRequest): Promise<UserContext> {
    return this.user;
  }
}
