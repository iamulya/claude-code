/**
 * createServer — Ship your agent as an HTTP API.
 *
 * Wraps any YAAF agent in a production-ready HTTP server with:
 * - POST /chat — Request/response (JSON)
 * - POST /chat/stream — Server-Sent Events (SSE) streaming
 * - GET /health — Health check endpoint
 * - GET /info — Agent metadata
 * - CORS support
 * - Request validation
 * - Rate limiting (basic)
 * - Graceful shutdown
 *
 * Uses Node's built-in `http` module — zero external dependencies.
 *
 * @example
 * ```ts
 * import { Agent } from 'yaaf';
 * import { createServer } from 'yaaf/server';
 *
 * const agent = new Agent({
 * systemPrompt: 'You are an API assistant.',
 * tools: myTools,
 * });
 *
 * const server = createServer(agent, {
 * port: 3000,
 * cors: true,
 * });
 *
 * // server.close() for graceful shutdown
 * ```
 *
 * @module runtime/server
 */

import { createServer as createHttpServer, IncomingMessage, ServerResponse } from "node:http";
import { buildDevUiHtml } from "./devUi.js";
import { Session, listSessions, type SessionLike } from "../session.js";
import type { IdentityProvider, IncomingRequest, UserContext } from "../iam/types.js";
import type { SessionAdapter } from "../plugin/types.js";
import * as crypto from "node:crypto";
import { Logger } from "../utils/logger.js";

const logger = new Logger("server");

// ── Types ────────────────────────────────────────────────────────────────────

/** Minimal agent interface. */
export type ServerAgent = {
  run(input: string, signal?: AbortSignal): Promise<string>;
  /**
   * Optional streaming interface. The server normalizes all events to
   * ServerStreamEvent internally, so this accepts any structured event stream
   * (including the richer RunnerStreamEvent superset from AgentRunner).
   */
  runStream?: (input: string, signal?: AbortSignal) => AsyncIterable<Record<string, unknown>>;
  /**
   * Optional: return per-plugin health. If any value is false the /health
   * endpoint responds with 503. Implemented by Agent via PluginHost.healthCheckAll().
   */
  healthCheck?(): Promise<Record<string, boolean>>;
  /**
   * Optional: return a list of active plugins for the /info endpoint.
   * Implemented by Agent via PluginHost.listPlugins().
   */
  listPlugins?(): Array<{ name: string; version: string; capabilities: readonly string[] }>;
};

export type ServerStreamEvent = {
  type: "text_delta" | "tool_call_start" | "tool_call_result" | "done";
  /** Text content for text_delta */
  text?: string;
  /** Alias for text (some agents use 'content' instead) */
  content?: string;
  /** Tool name for tool events */
  toolName?: string;
  /** Tool call error flag */
  error?: boolean;
  /** Tool call duration */
  durationMs?: number;
  /** Token usage — carried by 'done' events */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    cacheReadTokens?: number;
  };
};

export type ServerConfig = {
  /** Port to listen on. Default: 3000 */
  port?: number;
  /** Hostname to bind to. Default: '0.0.0.0' */
  host?: string;
  /** Enable CORS headers. Default: true */
  cors?: boolean;
  /** Allowed origins for CORS. Default: '*' */
  corsOrigin?: string;
  /** Agent display name (shown in /info) */
  name?: string;
  /** Agent version (shown in /info) */
  version?: string;
  /** Max request body size in bytes. Default: 1MB */
  maxBodySize?: number;
  /** Basic rate limiting: max requests per minute per IP. Default: 60 */
  rateLimit?: number;
  /**
   * External rate limit store for multi-instance deployments.
   * When provided, rate limit state is delegated to this store instead of
   * process memory. Use a Redis or Memcached implementation for production.
   */
  rateLimitStore?: RateLimitStore;
  /**
   * Trust proxy configuration for rate limiting.
   *
   * Controls whether the server trusts `X-Forwarded-For` headers for
   * determining the client IP for rate limiting.
   *
   * - `false` (default): Only uses `req.socket.remoteAddress`. Safe default.
   * - `true`: Trusts the first value in `X-Forwarded-For` (single proxy).
   * - `number`: Number of trusted proxy hops. Takes the Nth-from-right IP
   * from the XFF chain (e.g., `1` = rightmost = last proxy's client).
   *
   * **Security:** Only set this when the server is behind a known reverse
   * proxy (nginx, CloudFlare, ALB). Without a proxy, attackers can spoof
   * the header to bypass rate limiting.
   *
   * @default false
   */
  trustProxy?: boolean | number;
  /** Called before the agent runs. Return modified input. */
  beforeRun?: (input: string, req: IncomingMessage) => string | Promise<string>;
  /** Called after the agent responds. */
  afterRun?: (input: string, response: string, req: IncomingMessage) => void | Promise<void>;
  /** Custom route handlers. */
  routes?: Record<string, RouteHandler>;
  /** Called on server start. */
  onStart?: (port: number) => void;
  /** Request timeout in ms. Default: 120000 */
  timeout?: number;
  /**
   * Serve a built-in Dev UI at GET /.
   * Shows a chat interface for testing — ideal for local development.
   * Disable (or omit) in production.
   * Default: false
   */
  devUi?: boolean;
  /**
   * Model identifier exposed in the UI inspector and GET /info.
   * Example: 'gemini-2.0-flash', 'claude-3-5-sonnet'.
   */
  model?: string;
  /**
   * Optionally expose the agent's system prompt via GET /info.
   * Shown read-only in the Dev UI Settings drawer.
   * Default: undefined (not exposed).
   */
  systemPrompt?: string;
  /**
   * When true, the server accepts a `history` array in the request body:
   * { message: string, history?: Array<{ role: 'user'|'assistant', content: string }> }
   * and prepends the conversation to the agent's input for multi-turn context.
   * Default: false.
   */
  multiTurn?: boolean;

  // ── Identity + Sessions ─────────────────────────────────────────────────────

  /**
   * Identity provider — resolves UserContext from incoming HTTP requests.
   * When set, every /chat request is authenticated before the agent runs.
   * Unauthenticated requests receive 401.
   *
   * Can also be provided via IdentityAdapter plugin (plugin takes priority).
   *
   * @example
   * ```ts
   * createServer(agent, {
   * identityProvider: new JwtIdentityProvider({
   * jwksUri: 'https://auth.example.com/.well-known/jwks.json',
   * claims: { userId: 'sub', roles: 'groups' },
   * }),
   * })
   * ```
   */
  identityProvider?: IdentityProvider;

  /**
   * Enable server-side session management.
   *
   * When enabled, the server creates/resumes sessions automatically from
   * `session_id` in the request body. Sessions are persisted to `.yaaf/sessions/`
   * and the `session_id` is returned in every response.
   *
   * When combined with `identityProvider`, sessions are bound to the
   * authenticated user — other users receive 403.
   *
   * @example
   * ```ts
   * createServer(agent, {
   * identityProvider: jwtProvider,
   * sessions: { ttlMs: 30 * 60_000, maxPerUser: 10 },
   * })
   * ```
   */
  sessions?: boolean | SessionsConfig;
};

export type SessionsConfig = {
  /** Directory for session files (default: .yaaf/sessions/) */
  dir?: string;
  /** Auto-prune sessions older than this (default: no pruning) */
  ttlMs?: number;
  /** Max sessions per user (default: unlimited) */
  maxPerUser?: number;
  /**
   * Optional SessionAdapter plugin — delegates all persistence to the adapter
   * (Redis, Postgres, DynamoDB, etc.) instead of the local filesystem.
   *
   * When set, `dir` is ignored.
   *
   * Can also be discovered from PluginHost if the agent exposes one:
   * ```ts
   * const adapter = pluginHost.getSessionAdapter()
   * createServer(agent, { sessions: { adapter } })
   * ```
   */
  adapter?: SessionAdapter;
  /**
   * S1-A: AES-256-GCM encryption key for session files at rest.
   *
   * Accepts either:
   * - A 64-character hex string (32 raw bytes)
   * - A plain password; the key is derived via scrypt with a per-file salt
   *
   * When set, each line of the JSONL file is independently encrypted with a
   * unique 12-byte IV. Files are unreadable without the key even if the
   * filesystem is compromised.
   *
   * **Strongly recommended** whenever `identityProvider` is configured.
   *
   * Generate a key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   * Store it in: A secrets manager (AWS SSM, GCP Secret Manager, Vault, etc.)
   */
  encryptionKey?: string;
};

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  body: string,
) => void | Promise<void>;

export type ServerHandle = {
  /** Close the server */
  close: () => Promise<void>;
  /** Port the server is listening on */
  port: number;
  /** Base URL */
  url: string;
};

/**
 * In-process rate limiter with documentation and
 * optional external store hook.
 *
 * **WARNING — SINGLE PROCESS ONLY:** The default implementation stores
 * rate limit state in process memory. In multi-process deployments
 * (PM2, Kubernetes replicas, Cloud Run instances), each process has
 * independent rate limit state. An attacker can send N × `rateLimit`
 * requests by distributing across N instances.
 *
 * For production multi-instance deployments, provide a `RateLimitStore`
 * implementation (e.g., Redis-backed) via `ServerConfig.rateLimitStore`.
 */
class RateLimiter {
  private readonly max: number;
  private readonly windowMs = 60_000;
  private readonly hits = new Map<string, { count: number; resetAt: number }>();
  private readonly externalStore?: RateLimitStore;

  constructor(max: number, externalStore?: RateLimitStore) {
    this.max = max;
    this.externalStore = externalStore;
  }

  async check(ip: string): Promise<boolean> {
    // Delegate to external store if provided (distributed rate limiting)
    if (this.externalStore) {
      return this.externalStore.checkAndIncrement(ip, this.max, this.windowMs);
    }

    const now = Date.now();
    const entry = this.hits.get(ip);

    if (!entry || now > entry.resetAt) {
      this.hits.set(ip, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    entry.count++;
    return entry.count <= this.max;
  }

  /** Clean up expired entries (call periodically) */
  cleanup(): void {
    const now = Date.now();
    for (const [ip, entry] of this.hits) {
      if (now > entry.resetAt) this.hits.delete(ip);
    }
  }
}

/**
 * External store interface for distributed rate limiting.
 * Implement this with Redis, Memcached, etc. for multi-instance deployments.
 */
export interface RateLimitStore {
  /**
   * Atomically check and increment the request count for an IP.
   * Returns true if the request is within the rate limit.
   */
  checkAndIncrement(key: string, max: number, windowMs: number): Promise<boolean>;
}

// ── Server ───────────────────────────────────────────────────────────────────

export function createServer(agent: ServerAgent, config: ServerConfig = {}): ServerHandle {
  const port = config.port ?? 3000;
  const host = config.host ?? "0.0.0.0";
  const corsEnabled = config.cors ?? true;
  const corsOrigin = config.corsOrigin ?? "*";
  const maxBodySize = config.maxBodySize ?? 1_048_576; // 1MB
  const rateLimit = new RateLimiter(config.rateLimit ?? 60, config.rateLimitStore);
  const timeout = config.timeout ?? 120_000;
  const name = config.name ?? "yaaf-agent";
  const version = config.version ?? "0.1.0";
  const devUi = config.devUi ?? false;
  const model = config.model;
  const systemPrompt = config.systemPrompt;
  const multiTurn = config.multiTurn ?? false;
  const identityProvider = config.identityProvider;
  const sessionsEnabled = !!config.sessions;
  const sessionsConfig: SessionsConfig = typeof config.sessions === "object" ? config.sessions : {};
  // trustProxy controls X-Forwarded-For usage for rate limiting
  const trustProxy = config.trustProxy ?? false;
  const sessionsDir = sessionsConfig.dir;
  const sessionAdapter = sessionsConfig.adapter;

  // Warn when sessions are enabled without an identity provider.
  // Without authentication, session_id comes verbatim from the client — any user
  // can supply another user's session UUID and read/continue their conversation.
  if (sessionsEnabled && !identityProvider) {
    logger.warn(
      "[YAAF] WARNING: sessions are enabled without an identityProvider. " +
        "Any client can access any session by supplying its session_id. " +
        "Add an identityProvider (e.g. JwtIdentityProvider) to enforce session ownership.",
    );
  }

  // S1-A FIX: Warn when authenticated sessions are stored in plaintext.
  // With identityProvider set, sessions contain per-user conversation history.
  // Without encryptionKey, that history is readable by anyone with filesystem access.
  if (
    sessionsEnabled &&
    identityProvider &&
    !sessionsConfig.encryptionKey &&
    !sessionsConfig.adapter
  ) {
    logger.warn(
      "[YAAF] WARNING: session files are stored unencrypted. " +
        "Anyone with filesystem access can read conversation history. " +
        "Set sessions.encryptionKey to enable AES-256-GCM encryption at rest. " +
        "Generate a key: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }

  // Schedule session pruning if TTL is set
  let pruneTimer: ReturnType<typeof setInterval> | undefined;
  if (sessionsEnabled && sessionsConfig.ttlMs) {
    const ttl = sessionsConfig.ttlMs;
    const dir = sessionsDir;
    pruneTimer = setInterval(
      async () => {
        try {
          const { pruneOldSessions: prune } = await import("../session.js");
          await prune(ttl, dir);
        } catch {
          /* best effort */
        }
      },
      Math.min(ttl, 5 * 60_000),
    );
  }

  // Build Dev UI HTML once at startup (not on every request)
  const devUiHtml = devUi
    ? buildDevUiHtml({
        name,
        version,
        model: model ?? null,
        streaming: !!agent.runStream,
        multiTurn,
        systemPrompt: systemPrompt ?? null,
      })
    : null;

  let requestCount = 0;
  const startedAt = new Date();

  // Cleanup rate limiter every 5 minutes
  const cleanupTimer = setInterval(() => rateLimit.cleanup(), 300_000);

  const server = createHttpServer(async (req, res) => {
    requestCount++;

    // CORS
    if (corsEnabled) {
      res.setHeader("Access-Control-Allow-Origin", corsOrigin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Max-Age", "86400");
      // Set Vary: Origin when a specific (non-wildcard) CORS origin is configured.
      // Without this, caching intermediaries (CDN, nginx proxy) may serve the same
      // cached response to a different origin — bypassing or incorrectly blocking CORS.
      if (corsOrigin !== "*") {
        res.setHeader("Vary", "Origin");
      }
    }

    // Preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Rate limiting — only trust X-Forwarded-For when trustProxy is configured.
    // Without trustProxy, attackers can spoof XFF headers to bypass rate limiting.
    const clientIp = resolveClientIp(req, trustProxy);

    if (!(await rateLimit.check(clientIp))) {
      sendJson(res, 429, { error: "Rate limit exceeded. Try again later." });
      return;
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const path = url.pathname;

    try {
      // Check custom routes first
      if (config.routes?.[path]) {
        const body = req.method === "POST" ? await readBody(req, maxBodySize) : "";
        await config.routes[path]!(req, res, body);
        return;
      }

      switch (path) {
        case "/":
          if (!devUiHtml) {
            sendJson(res, 200, {
              name,
              version,
              endpoints: ["/chat", "/chat/stream", "/health", "/info"],
            });
          } else {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(devUiHtml);
          }
          break;

        case "/health": {
          // include plugin health from PluginHost.healthCheckAll()
          const pluginHealth = agent.healthCheck ? await agent.healthCheck().catch(() => ({})) : {};
          const allHealthy = Object.values(pluginHealth).every(Boolean);
          const statusCode = allHealthy ? 200 : 503;
          sendJson(res, statusCode, {
            status: allHealthy ? "ok" : "degraded",
            uptime: Math.floor((Date.now() - startedAt.getTime()) / 1000),
            requests: requestCount,
            ...(Object.keys(pluginHealth).length > 0 ? { plugins: pluginHealth } : {}),
          });
          break;
        }

        case "/info": {
          // include active plugins from PluginHost.listPlugins()
          const plugins = agent.listPlugins?.() ?? [];
          sendJson(res, 200, {
            name,
            version,
            ...(model ? { model } : {}),
            ...(systemPrompt !== undefined ? { systemPrompt } : {}),
            streaming: !!agent.runStream,
            multiTurn,
            ...(plugins.length > 0 ? { plugins } : {}),
            endpoints: [
              { method: "POST", path: "/chat", description: "Send a message" },
              { method: "POST", path: "/chat/stream", description: "Stream a response (SSE)" },
              { method: "GET", path: "/health", description: "Health check" },
              { method: "GET", path: "/info", description: "Agent info" },
            ],
          });
          break;
        }

        case "/chat":
          if (req.method !== "POST") {
            sendJson(res, 405, { error: "Method not allowed. Use POST." });
            return;
          }
          await handleChat(
            agent,
            req,
            res,
            config,
            maxBodySize,
            timeout,
            identityProvider,
            sessionsEnabled,
            sessionsConfig,
            sessionAdapter,
          );
          break;

        case "/chat/stream":
          if (req.method !== "POST") {
            sendJson(res, 405, { error: "Method not allowed. Use POST." });
            return;
          }
          if (!agent.runStream) {
            sendJson(res, 501, {
              error: "Streaming not supported. Agent does not implement runStream().",
            });
            return;
          }
          await handleChatStream(
            agent as ServerAgent & { runStream: NonNullable<ServerAgent["runStream"]> },
            req,
            res,
            config,
            maxBodySize,
            timeout,
            identityProvider,
            sessionsEnabled,
            sessionsConfig,
            sessionAdapter,
          );
          break;

        default:
          // Session management routes: /sessions and /sessions/:id
          if (sessionsEnabled && path === "/sessions" && req.method === "GET") {
            await handleListSessions(req, res, identityProvider, sessionsConfig, sessionAdapter);
            break;
          }
          if (sessionsEnabled && path.startsWith("/sessions/") && req.method === "DELETE") {
            const sessionId = path.slice("/sessions/".length);
            await handleDeleteSession(
              req,
              res,
              sessionId,
              identityProvider,
              sessionsConfig,
              sessionAdapter,
            );
            break;
          }
          sendJson(res, 404, {
            error: "Not found",
            endpoints: [
              "/chat",
              "/chat/stream",
              "/health",
              "/info",
              ...(sessionsEnabled ? ["/sessions"] : []),
            ],
          });
      }
    } catch (err) {
      console.error("[yaaf/server] Request error:", err);
      if (!res.headersSent) {
        // Sanitize error messages in production to prevent leaking
        // internal state (file paths, connection strings, API keys, etc.).
        // Only expose raw error messages in development mode.
        const isDev = process.env.NODE_ENV === "development" || devUi;
        sendJson(res, 500, {
          error: "Internal server error",
          ...(isDev
            ? { message: err instanceof Error ? err.message : String(err) }
            : { message: "An unexpected error occurred. Check server logs for details." }),
        });
      }
    }
  });

  server.listen(port, host, () => {
    if (config.onStart) {
      config.onStart(port);
    } else {
      const localUrl = `http://${host === "0.0.0.0" ? "localhost" : host}:${port}`;
      console.log(`\n🚀 ${name} listening on ${localUrl}`);
      if (devUi) {
        console.log(` ▶ Dev UI: ${localUrl}/`);
      }
      console.log(` POST /chat — Send a message`);
      console.log(` POST /chat/stream — Stream response (SSE)`);
      console.log(` GET /health — Health check`);
      console.log(` GET /info — Agent info\n`);
    }
  });

  // Graceful shutdown
  const handle: ServerHandle = {
    port,
    url: `http://${host === "0.0.0.0" ? "localhost" : host}:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        clearInterval(cleanupTimer);
        if (pruneTimer) clearInterval(pruneTimer);
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      }),
  };

  return handle;
}

// ── Request Handlers ─────────────────────────────────────────────────────────

async function handleChat(
  agent: ServerAgent,
  req: IncomingMessage,
  res: ServerResponse,
  config: ServerConfig,
  maxBodySize: number,
  timeout: number,
  identityProvider?: IdentityProvider,
  sessionsEnabled?: boolean,
  sessionsConfig?: SessionsConfig,
  sessionAdapter?: SessionAdapter,
): Promise<void> {
  const body = await readBody(req, maxBodySize);
  const parsed = parseRequest(body);
  if ("error" in parsed) {
    sendJson(res, 400, { error: parsed.error });
    return;
  }

  // 1. Resolve identity
  let user: UserContext | undefined;
  if (identityProvider) {
    try {
      user = (await resolveIdentity(req, identityProvider)) ?? undefined;
    } catch (err) {
      // Infrastructure error (JWKS timeout, DB down) — return 503
      const errMsg = err instanceof Error ? err.message : String(err);
      sendJson(res, 503, { error: `Authentication service unavailable: ${errMsg}` });
      return;
    }
    if (!user) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }
  }

  // 2. Resolve session
  let session: Session | SessionLike | undefined;
  if (sessionsEnabled) {
    const result = await resolveSession(parsed.session_id, user, sessionsConfig, sessionAdapter);
    if ("error" in result) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    session = result.session;
  }

  let input = parsed.message;
  if (config.multiTurn && parsed.history?.length) {
    input = buildMultiTurnInput(parsed.history, parsed.message);
  }
  if (config.beforeRun) {
    input = await config.beforeRun(input, req);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await agent.run(input, controller.signal);

    // Persist turn to session
    if (session) {
      await session.append([
        { role: "user", content: parsed.message },
        { role: "assistant", content: response },
      ]);
    }

    await config.afterRun?.(parsed.message, response, req);

    sendJson(res, 200, {
      response,
      model: parsed.model,
      ...(session ? { session_id: session.id } : {}),
    });
  } finally {
    clearTimeout(timer);
  }
}

async function handleChatStream(
  agent: ServerAgent & { runStream: NonNullable<ServerAgent["runStream"]> },
  req: IncomingMessage,
  res: ServerResponse,
  config: ServerConfig,
  maxBodySize: number,
  timeout: number,
  identityProvider?: IdentityProvider,
  sessionsEnabled?: boolean,
  sessionsConfig?: SessionsConfig,
  sessionAdapter?: SessionAdapter,
): Promise<void> {
  const body = await readBody(req, maxBodySize);
  const parsed = parseRequest(body);
  if ("error" in parsed) {
    sendJson(res, 400, { error: parsed.error });
    return;
  }

  // 1. Resolve identity
  const user = identityProvider
    ? ((await resolveIdentity(req, identityProvider)) ?? undefined)
    : undefined;
  if (identityProvider && !user) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  // 2. Resolve session
  let session: Session | SessionLike | undefined;
  if (sessionsEnabled) {
    const result = await resolveSession(parsed.session_id, user, sessionsConfig, sessionAdapter);
    if ("error" in result) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    session = result.session;
  }

  let input = parsed.message;
  if (config.multiTurn && parsed.history?.length) {
    input = buildMultiTurnInput(parsed.history, parsed.message);
  }
  if (config.beforeRun) {
    input = await config.beforeRun(input, req);
  }

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Send session_id as first event if sessions are enabled
  if (session) {
    sendSse(res, { type: "session", session_id: session.id });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let fullResponse = "";
  let lastUsage: ServerStreamEvent["usage"] | undefined;
  let callCounter = 0;
  const toolStartTimes = new Map<string, number>();

  try {
    for await (const event of agent.runStream(input, controller.signal)) {
      const ev = event as Record<string, unknown>;

      if (ev.usage) {
        const u = ev.usage as Record<string, unknown>;
        lastUsage = {
          promptTokens: (u.promptTokens ?? u.totalPromptTokens ?? u.prompt_tokens ?? 0) as number,
          completionTokens: (u.completionTokens ??
            u.totalCompletionTokens ??
            u.completion_tokens ??
            0) as number,
          cacheReadTokens: (u.cacheReadTokens ?? u.cache_read_tokens) as number | undefined,
        };
      }

      const type = String(ev.type ?? "");

      if (type === "text_delta") {
        const text = String(ev.content ?? ev.text ?? "");
        fullResponse += text;
        sendSse(res, { type: "text_delta", content: text });
        continue;
      }

      if (type === "final_response") {
        if (fullResponse.length === 0) {
          const text = String(ev.content ?? ev.text ?? "");
          fullResponse = text;
          sendSse(res, { type: "text_delta", content: text });
        }
        continue;
      }

      if (type === "tool_call_start" || type === "tool_start") {
        const name = String(ev.toolName ?? ev.name ?? ev.tool_name ?? "?");
        const callId = String(++callCounter);
        toolStartTimes.set(callId, Date.now());
        sendSse(res, { type: "tool_call_start", toolName: name, callId });
        continue;
      }

      if (type === "tool_call_result" || type === "tool_call_end" || type === "tool_end") {
        const name = String(ev.toolName ?? ev.name ?? ev.tool_name ?? "?");
        const callId = String(ev.callId ?? callCounter);
        const startedAt = toolStartTimes.get(callId);
        const durationMs = startedAt ? Date.now() - startedAt : Number(ev.durationMs ?? 0);
        toolStartTimes.delete(callId);
        sendSse(res, {
          type: "tool_call_result",
          toolName: name,
          callId,
          durationMs,
          error: (ev.error ?? false) as boolean,
        });
        continue;
      }

      const passthroughTypes = new Set(["iteration", "llm_request", "llm_response", "usage"]);
      if (passthroughTypes.has(type)) {
        sendSse(res, ev);
        continue;
      }
    }

    // Persist turn to session
    if (session) {
      await session.append([
        { role: "user", content: parsed.message },
        { role: "assistant", content: fullResponse },
      ]);
    }

    const doneEvent: Record<string, unknown> = {
      type: "done",
      text: fullResponse,
      ...(session ? { session_id: session.id } : {}),
    };
    if (lastUsage) doneEvent.usage = lastUsage;
    sendSse(res, doneEvent);
    res.end();

    await config.afterRun?.(parsed.message, fullResponse, req);
  } catch (err) {
    sendSse(res, { type: "error", text: err instanceof Error ? err.message : String(err) });
    res.end();
  } finally {
    clearTimeout(timer);
  }
}

function sendSse(res: ServerResponse, data: unknown): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

/**
 * Resolve client IP with proper proxy trust validation.
 *
 * - `trustProxy = false`: Always use socket.remoteAddress (safe default)
 * - `trustProxy = true`: Use the first (leftmost) XFF value (single proxy)
 * - `trustProxy = N`: Use the Nth-from-right XFF value (N trusted hops)
 */
function resolveClientIp(req: IncomingMessage, trustProxy: boolean | number): string {
  const socketIp = req.socket.remoteAddress ?? "unknown";

  // Default: never trust XFF — use the TCP connection's IP directly
  if (trustProxy === false) return socketIp;

  const xffHeader = req.headers["x-forwarded-for"] as string | undefined;
  if (!xffHeader) return socketIp;

  const ips = xffHeader
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
  if (ips.length === 0) return socketIp;

  if (trustProxy === true) {
    // Single proxy: take the first (client) IP
    return ips[0] ?? socketIp;
  }

  // Numeric: take the Nth-from-right (skipping N trusted proxy hops)
  const hops = typeof trustProxy === "number" ? trustProxy : 1;
  const clientIndex = ips.length - hops;
  if (clientIndex >= 0 && clientIndex < ips.length) {
    return ips[clientIndex] ?? socketIp;
  }

  return socketIp;
}

// readBody now enforces a per-request body-read deadline in addition to
// the size cap. Without this, a slow client (Slowloris-style) that dribbles data
// 1 byte/s could hold a connection open for hours — the 120s request timeout only
// fires AFTER readBody completes, so the timeout was never protecting the read phase.
//
// Default read deadline: 30 s (configurable via timeoutMs parameter).
function readBody(req: IncomingMessage, maxSize: number, timeoutMs = 30_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;

    // Body-read deadline — fires if the client is too slow to send the full body.
    const readTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      req.destroy(new Error(`Request body read timeout after ${timeoutMs}ms`));
      reject(new Error(`Request body read timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxSize) {
        if (!settled) {
          settled = true;
          clearTimeout(readTimer);
          req.destroy();
          reject(new Error(`Request body exceeds ${maxSize} bytes`));
        }
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (settled) return;
      settled = true;
      clearTimeout(readTimer);
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });

    req.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(readTimer);
      reject(err);
    });
  });
}

function parseRequest(
  body: string,
):
  | { message: string; model?: string; session_id?: string; history?: ConversationTurn[] }
  | { error: string } {
  if (!body.trim()) {
    return { error: 'Request body is required. Send JSON: { "message": "..." }' };
  }

  try {
    const data = JSON.parse(body);
    if (typeof data.message !== "string" || !data.message.trim()) {
      return { error: '"message" field is required and must be a non-empty string.' };
    }
    const history: ConversationTurn[] | undefined = Array.isArray(data.history)
      ? data.history.filter(
          (h: unknown): h is ConversationTurn =>
            typeof h === "object" &&
            h !== null &&
            ((h as ConversationTurn).role === "user" ||
              (h as ConversationTurn).role === "assistant") &&
            typeof (h as ConversationTurn).content === "string",
        )
      : undefined;
    const session_id = typeof data.session_id === "string" ? data.session_id : undefined;
    return { message: data.message.trim(), model: data.model, session_id, history };
  } catch {
    return { error: 'Invalid JSON. Send: { "message": "your question" }' };
  }
}

type ConversationTurn = { role: "user" | "assistant"; content: string };

/**
 * Format multi-turn history + current message into a single agent input string.
 * Uses a Human:/Assistant: prefix format that works well across LLM providers.
 */
function buildMultiTurnInput(history: ConversationTurn[], message: string): string {
  if (!history.length) return message;
  const lines: string[] = [];
  for (const turn of history) {
    lines.push((turn.role === "user" ? "Human" : "Assistant") + ": " + turn.content);
  }
  lines.push("Human: " + message);
  lines.push("Assistant:");
  return lines.join("\n");
}

// ── Identity + Session Helpers ───────────────────────────────────────────────

/**
 * Convert an IncomingMessage to the IdentityProvider's IncomingRequest format.
 */
function toIncomingRequest(req: IncomingMessage): IncomingRequest {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers[key] = value;
    else if (Array.isArray(value)) headers[key] = value[0] ?? "";
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const query: Record<string, string> = {};
  for (const [key, value] of url.searchParams) {
    query[key] = value;
  }

  return { headers, query };
}

/**
 * Resolve user identity from an HTTP request.
 *
 * Distinguishes auth-rejection errors (JwtError, AuthenticationError,
 * credential-not-found) from infrastructure errors (timeouts, DB connection lost).
 * - Auth rejections → return null (caller sends 401)
 * - Infrastructure errors → re-throw (caller sends 503)
 * This prevents service degradations from being silently masked as auth failures.
 */
async function resolveIdentity(
  req: IncomingMessage,
  provider: IdentityProvider,
): Promise<UserContext | null> {
  try {
    return await provider.resolve(toIncomingRequest(req));
  } catch (err) {
    // Treat known authentication-rejection errors as 'no credentials'
    if (isAuthRejectionError(err)) {
      return null;
    }
    // Any other error is an infrastructure failure — propagate so the caller
    // returns 503 instead of silently treating it as unauthenticated.
    throw err;
  }
}

/**
 * Classify an error as an auth-rejection (token missing/invalid/expired)
 * vs. an infrastructure error (network, DB, SDK crash).
 */
function isAuthRejectionError(err: unknown): boolean {
  if (!(err instanceof Error)) return true; // non-Error throwables are usually auth-related
  const name = err.name;
  // Known auth error class names from yaaf/iam and common OIDC libraries
  if (
    name === "JwtError" ||
    name === "AuthenticationError" ||
    name === "AuthError" ||
    name === "UnauthorizedError"
  )
    return true;
  // Message-based heuristics for errors that don't have a custom name
  const msg = err.message.toLowerCase();
  return (
    msg.includes("unauthorized") ||
    msg.includes("unauthenticated") ||
    msg.includes("invalid token") ||
    msg.includes("token expired") ||
    msg.includes("jwt") ||
    msg.includes("bearer") ||
    msg.includes("no credentials") ||
    msg.includes("missing authorization")
  );
}

/**
 * Resolve (create or resume) a session, with identity binding.
 */
// Lock set to prevent concurrent session bind races.
// When two requests arrive simultaneously for an unbound session,
// without this lock both could pass canAccess() and race to bind().
const sessionBindLocks = new Set<string>();

async function resolveSession(
  sessionId: string | undefined,
  user: UserContext | undefined,
  config?: SessionsConfig,
  adapter?: SessionAdapter,
): Promise<{ session: Session | SessionLike } | { error: string; status: number }> {
  try {
    // For authenticated users, derive the session ID server-side.
    // Client-supplied session_id is treated as a 'session name' hint, not a
    // direct storage key. This prevents IDOR pre-registration attacks where
    // an attacker claims a UUID before the legitimate user.
    //
    // Derivation: HMAC-SHA256(userId, sessionHint || randomUUID) → hex[:32]
    // This is deterministic per user+hint, so the client can reliably resume
    // a named session, but cannot derive IDs for other users.
    let id: string;
    if (user) {
      const hint = sessionId ?? crypto.randomUUID();
      id = crypto.createHmac("sha256", user.userId).update(hint).digest("hex").slice(0, 32);
    } else {
      id = sessionId ?? crypto.randomUUID();
    }

    const session = await Session.resumeOrCreate(
      id,
      config?.dir,
      adapter,
      undefined,
      config?.encryptionKey,
    );

    // Check ownership
    if (user && !session.canAccess(user.userId)) {
      return { error: "Session belongs to another user", status: 403 };
    }

    // Atomic bind — use a lock to prevent concurrent bind races.
    // Without this, two users could simultaneously access an unbound session
    // and both pass canAccess() before either calls bind().
    if (user && !session.owner) {
      const lockKey = `bind:${id}`;
      if (sessionBindLocks.has(lockKey)) {
        // Another request is binding this session — retry check
        return { error: "Session binding in progress, please retry", status: 409 };
      }
      sessionBindLocks.add(lockKey);
      try {
        // Re-check after acquiring lock (another request may have bound it)
        if (!session.owner) {
          session.bind(user.userId);
        } else if (!session.canAccess(user.userId)) {
          return { error: "Session belongs to another user", status: 403 };
        }
      } finally {
        sessionBindLocks.delete(lockKey);
      }
    }

    return { session };
  } catch (err) {
    return {
      error: `Session error: ${err instanceof Error ? err.message : String(err)}`,
      status: 500,
    };
  }
}

/**
 * GET /sessions — list sessions owned by the authenticated user.
 */
async function handleListSessions(
  req: IncomingMessage,
  res: ServerResponse,
  identityProvider?: IdentityProvider,
  config?: SessionsConfig,
  adapter?: SessionAdapter,
): Promise<void> {
  // Optionally authenticate
  let user: UserContext | undefined;
  if (identityProvider) {
    user = (await resolveIdentity(req, identityProvider)) ?? undefined;
    if (!user) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }
  }

  const allSessions = await listSessions(config?.dir, adapter);

  // If authenticated, filter to sessions this user owns
  if (user) {
    const owned: string[] = [];
    for (const id of allSessions) {
      try {
        const session = await Session.resume(id, config?.dir, adapter);
        if (session.canAccess(user.userId)) owned.push(id);
      } catch {
        /* skip broken sessions */
      }
    }
    sendJson(res, 200, { sessions: owned });
  } else {
    sendJson(res, 200, { sessions: allSessions });
  }
}

/**
 * DELETE /sessions/:id — delete a specific session (if owned by the user).
 */
async function handleDeleteSession(
  req: IncomingMessage,
  res: ServerResponse,
  sessionId: string,
  identityProvider?: IdentityProvider,
  config?: SessionsConfig,
  adapter?: SessionAdapter,
): Promise<void> {
  // Optionally authenticate
  let user: UserContext | undefined;
  if (identityProvider) {
    user = (await resolveIdentity(req, identityProvider)) ?? undefined;
    if (!user) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }
  }

  try {
    const session = await Session.resume(sessionId, config?.dir, adapter);

    // Check ownership
    if (user && !session.canAccess(user.userId)) {
      sendJson(res, 403, { error: "Session belongs to another user" });
      return;
    }

    await session.delete();
    sendJson(res, 200, { deleted: sessionId });
  } catch {
    sendJson(res, 404, { error: `Session not found: ${sessionId}` });
  }
}
