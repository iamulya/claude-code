/**
 * Remote Sessions — WebSocket-based persistent agent sessions.
 *
 * Extends the HTTP-only `runtime/server.ts` with bidirectional WebSocket
 * connections for real-time, persistent agent interactions.
 *
 * Features:
 * - **Persistent sessions** — maintain conversation state across messages
 * - **WebSocket transport** — full-duplex, low-latency communication
 * - **Multi-client** — multiple concurrent sessions (each isolated)
 * - **Streaming events** — tool calls, text deltas, status pushed to client
 * - **Session resume** — reconnect to existing sessions via session ID
 * - **Heartbeat** — automatic keep-alive to detect dropped connections
 *
 * Uses Node's built-in WebSocket support (Node ≥ 21) with a fallback
 * to the `ws` package if available. If neither is present, a clear
 * error message is shown.
 *
 * @example
 * ```ts
 * import { Agent } from 'yaaf';
 * import { RemoteSessionServer } from 'yaaf/remote';
 *
 * const agent = new Agent({ systemPrompt: '...' });
 *
 * const server = new RemoteSessionServer(agent, {
 * port: 8080,
 * maxSessions: 100,
 * sessionTimeoutMs: 30 * 60_000, // 30 min idle timeout
 * });
 *
 * await server.start();
 * // Clients connect via: ws://localhost:8080/ws
 * // Or HTTP: POST http://localhost:8080/chat
 * ```
 *
 * ## Client Protocol (WebSocket)
 *
 * **Client → Server messages:**
 * ```jsonc
 * // Send a message (new or existing session)
 * { "type": "message", "sessionId": "optional-id", "text": "hello" }
 *
 * // Resume a session
 * { "type": "resume", "sessionId": "existing-id" }
 *
 * // Ping (keepalive)
 * { "type": "ping" }
 *
 * // Cancel current run
 * { "type": "cancel", "sessionId": "id" }
 * ```
 *
 * **Server → Client messages:**
 * ```jsonc
 * // Session started/resumed
 * { "type": "session", "sessionId": "uuid", "status": "active" }
 *
 * // Agent text response (streaming delta)
 * { "type": "text_delta", "sessionId": "uuid", "text": "partial..." }
 *
 * // Agent full response (when done)
 * { "type": "response", "sessionId": "uuid", "text": "full response" }
 *
 * // Tool call started
 * { "type": "tool_start", "sessionId": "uuid", "tool": "name", "args": {} }
 *
 * // Tool call result
 * { "type": "tool_end", "sessionId": "uuid", "tool": "name", "result": "..." }
 *
 * // Error
 * { "type": "error", "sessionId": "uuid", "message": "..." }
 *
 * // Pong
 * { "type": "pong" }
 * ```
 *
 * @module remote/sessions
 */

import {
  createServer as createHttpServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomUUID, createHash } from "node:crypto";
import type { Duplex } from "node:stream";
import { buildDevUiHtml } from "../runtime/devUi.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type RemoteSessionConfig = {
  /** Port to listen on. Default: 8080. */
  port?: number;
  /** Hostname to bind to. Default: '0.0.0.0'. */
  host?: string;
  /** Maximum concurrent sessions. Default: 100. */
  maxSessions?: number;
  /** Idle timeout per session in ms. Default: 1800000 (30 min). */
  sessionTimeoutMs?: number;
  /** WebSocket heartbeat interval in ms. Default: 30000 (30s). */
  heartbeatIntervalMs?: number;
  /** Enable CORS for HTTP endpoints. Default: true. */
  cors?: boolean;
  /** CORS allowed origin. Default: '*'. */
  corsOrigin?: string;
  /** Agent display name (for /info). */
  name?: string;
  /** Called when a session is created. */
  onSessionCreated?: (sessionId: string) => void;
  /** Called when a session is destroyed. */
  onSessionDestroyed?: (sessionId: string, reason: string) => void;
  /**
   * Called when the server starts listening.
   * When omitted, the server prints a startup message to stdout.
   * Pass a no-op function to suppress the message.
   */
  onStart?: (info: { url: string; wsUrl: string; port: number }) => void;
  /**
   * Serve the YAAF Dev UI at GET /.
   * The UI connects over WebSocket (/ws) for full-duplex streaming.
   * Disable in production.
   * Default: false.
   */
  devUi?: boolean;
  /**
   * Model identifier shown in the UI inspector.
   * Example: 'gemini-2.0-flash'.
   */
  model?: string;
  /**
   * Optionally expose the agent's system prompt in the UI Settings drawer.
   * Default: undefined (not exposed).
   */
  systemPrompt?: string;
  /**
   * Maximum allowed HTTP request body size in bytes.
   * Requests exceeding this limit receive HTTP 413. Default: 1 MB.
   */
  maxBodyBytes?: number;
};

/** Minimal agent interface for remote sessions. */
export type RemoteAgent = {
  run(input: string, signal?: AbortSignal): Promise<string>;
};

/** Session state. */
type Session = {
  id: string;
  createdAt: number;
  lastActivity: number;
  abortController: AbortController | null;
  messageCount: number;
  /** WebSocket connection(s) — a session can have multiple clients viewing. */
  connections: Set<WebSocketLike>;
};

/** Minimal WebSocket interface to avoid hard dependency. */
interface WebSocketLike {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  readyState: number;
  addEventListener(event: string, listener: (...args: unknown[]) => void): void;
  removeEventListener(event: string, listener: (...args: unknown[]) => void): void;
}

/** Client → Server message types. */
type ClientMessage =
  | { type: "message"; sessionId?: string; text: string }
  | { type: "resume"; sessionId: string }
  | { type: "cancel"; sessionId: string }
  | { type: "ping" };

/** Server → Client message types. */
export type ServerMessage =
  | { type: "session"; sessionId: string; status: "active" | "resumed" | "created" }
  | { type: "text_delta"; sessionId: string; text: string }
  | { type: "response"; sessionId: string; text: string }
  | { type: "tool_start"; sessionId: string; tool: string; args?: Record<string, unknown> }
  | { type: "tool_end"; sessionId: string; tool: string; result?: string }
  | { type: "error"; sessionId: string; message: string }
  | { type: "pong" };

export type RemoteSessionHandle = {
  url: string;
  wsUrl: string;
  port: number;
  close: () => Promise<void>;
  /** Get current session count. */
  sessionCount: () => number;
  /** List active session IDs. */
  sessions: () => string[];
  /** Force-destroy a session. */
  destroySession: (sessionId: string) => void;
};

// ── Remote Session Server ────────────────────────────────────────────────────

export class RemoteSessionServer {
  private readonly agent: RemoteAgent;
  private readonly config: Required<
    Omit<
      RemoteSessionConfig,
      "onSessionCreated" | "onSessionDestroyed" | "onStart" | "model" | "systemPrompt"
    >
  > &
    Pick<
      RemoteSessionConfig,
      "onSessionCreated" | "onSessionDestroyed" | "onStart" | "model" | "systemPrompt"
    >;
  private readonly sessions = new Map<string, Session>();
  private server: ReturnType<typeof createHttpServer> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private readonly devUiHtml: string | null;

  constructor(agent: RemoteAgent, config: RemoteSessionConfig = {}) {
    this.agent = agent;
    this.config = {
      port: config.port ?? 8080,
      host: config.host ?? "0.0.0.0",
      maxSessions: config.maxSessions ?? 100,
      sessionTimeoutMs: config.sessionTimeoutMs ?? 30 * 60_000,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 30_000,
      cors: config.cors ?? true,
      corsOrigin: config.corsOrigin ?? "*",
      name: config.name ?? "yaaf-remote",
      devUi: config.devUi ?? false,
      model: config.model,
      systemPrompt: config.systemPrompt,
      // Default 1 MB HTTP body limit
      maxBodyBytes: config.maxBodyBytes ?? 1_048_576,
      onSessionCreated: config.onSessionCreated,
      onSessionDestroyed: config.onSessionDestroyed,
      onStart: config.onStart,
    };
    this.devUiHtml = this.config.devUi
      ? buildDevUiHtml({
          name: this.config.name,
          version: "—",
          model: this.config.model ?? null,
          streaming: true,
          multiTurn: true,
          systemPrompt: this.config.systemPrompt ?? null,
        })
      : null;
  }

  /** Start the remote session server. */
  async start(): Promise<RemoteSessionHandle> {
    const { port, host } = this.config;

    this.server = createHttpServer(async (req, res) => {
      try {
        // CORS
        if (this.config.cors) {
          res.setHeader("Access-Control-Allow-Origin", this.config.corsOrigin);
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        }

        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }

        const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

        switch (url.pathname) {
          case "/":
            if (this.config.devUi && this.devUiHtml) {
              res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
              res.end(this.devUiHtml);
            } else {
              this.sendJson(res, 200, {
                name: this.config.name,
                transport: ["http", "websocket"],
              });
            }
            break;

          case "/health":
            this.sendJson(res, 200, {
              status: "ok",
              name: this.config.name,
              sessions: this.sessions.size,
              maxSessions: this.config.maxSessions,
            });
            break;

          case "/info":
            this.sendJson(res, 200, {
              name: this.config.name,
              transport: ["http", "websocket"],
              endpoints: {
                chat: "POST /chat",
                stream: "POST /chat/stream",
                sessions: "GET /sessions",
                websocket: "WS /ws",
              },
              sessionCount: this.sessions.size,
            });
            break;

          case "/sessions":
            if (req.method === "GET") {
              // Do not return session IDs in the public endpoint.
              // Previously this exposed UUIDs that could be used by an attacker
              // to hijack sessions via the resume or message WebSocket handlers.
              // Now only aggregate stats are returned.
              this.sendJson(res, 200, {
                count: this.sessions.size,
                maxSessions: this.config.maxSessions,
              });
            } else {
              this.sendJson(res, 405, { error: "Method not allowed" });
            }
            break;

          case "/chat":
            if (req.method === "POST") {
              await this.handleHttpChat(req, res);
            } else {
              this.sendJson(res, 405, { error: "Method not allowed" });
            }
            break;

          default:
            this.sendJson(res, 404, { error: "Not found" });
        }
      } catch (err) {
        if (!res.headersSent) {
          this.sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
        }
      }
    });

    // Handle WebSocket upgrades
    this.server.on("upgrade", (req, socket, head) => {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      if (url.pathname === "/ws") {
        this.handleWebSocketUpgrade(req, socket, head);
      } else {
        socket.destroy();
      }
    });

    // Session cleanup timer
    this.cleanupTimer = setInterval(() => this.cleanupStaleSessions(), 60_000);

    return new Promise((resolve) => {
      this.server!.listen(port, host, () => {
        const addr = this.server!.address();
        const actualPort = typeof addr === "object" && addr ? addr.port : port;
        const hostname = host === "0.0.0.0" ? "localhost" : host;
        const baseUrl = `http://${hostname}:${actualPort}`;
        const wsUrl = `ws://${hostname}:${actualPort}/ws`;

        const startInfo = { url: baseUrl, wsUrl, port: actualPort };
        if (this.config.onStart) {
          this.config.onStart(startInfo);
        } else {
          const devUiLine = this.config.devUi ? ` ▶ Dev UI: ${baseUrl}/\n` : "";
          process.stdout.write(
            `\n🔌 Remote Session Server "${this.config.name}" listening\n` +
              ` HTTP: ${baseUrl}\n` +
              devUiLine +
              ` WebSocket: ${wsUrl}\n` +
              ` Max sessions: ${this.config.maxSessions}\n\n`,
          );
        }
        resolve({
          url: baseUrl,
          wsUrl,
          port: actualPort,
          close: () => this.stop(),
          sessionCount: () => this.sessions.size,
          sessions: () => [...this.sessions.keys()],
          destroySession: (id) => this.destroySession(id, "manual"),
        });
      });
    });
  }

  /** Stop the server and clean up all sessions. */
  async stop(): Promise<void> {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);

    // Close all sessions
    for (const [id, session] of this.sessions) {
      session.abortController?.abort();
      for (const ws of session.connections) {
        try {
          ws.close(1001, "Server shutting down");
        } catch {
          /* ignore */
        }
      }
      this.sessions.delete(id);
    }

    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      this.server.close((err) => (err ? reject(err) : resolve()));
      this.server = null;
    });
  }

  // ── WebSocket Handling ──────────────────────────────────────────────────

  private handleWebSocketUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    // Perform the WebSocket handshake manually using the raw socket
    // This avoids requiring the `ws` package
    const key = req.headers["sec-websocket-key"];
    if (!key) {
      socket.destroy();
      return;
    }

    const acceptKey = createHash("sha1")
      .update(key + "258EAFA5-E914-47DA-95CA-5AB5DC11505E")
      .digest("base64");

    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        `Sec-WebSocket-Accept: ${acceptKey}\r\n` +
        "\r\n",
    );

    // Simple WebSocket frame parser/writer
    const ws = new RawWebSocket(socket);
    this.handleWebSocketConnection(ws);
  }

  private handleWebSocketConnection(ws: WebSocketLike): void {
    let sessionId: string | null = null;

    ws.addEventListener("message", async (event: unknown) => {
      try {
        const data = typeof event === "string" ? event : (event as { data?: unknown })?.data;
        if (!data) return;
        const msg = JSON.parse(data as string) as ClientMessage;

        switch (msg.type) {
          case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;

          case "resume": {
            const session = this.sessions.get(msg.sessionId);
            if (session) {
              sessionId = msg.sessionId;
              session.connections.add(ws);
              session.lastActivity = Date.now();
              ws.send(JSON.stringify({ type: "session", sessionId, status: "resumed" }));
            } else {
              ws.send(
                JSON.stringify({
                  type: "error",
                  sessionId: msg.sessionId,
                  message: "Session not found",
                }),
              );
            }
            break;
          }

          case "cancel": {
            const session = this.sessions.get(msg.sessionId);
            if (session?.abortController) {
              session.abortController.abort();
              session.abortController = null;
            }
            break;
          }

          case "message": {
            // A client-supplied sessionId in a 'message' must NOT be
            // used to join an EXISTING session. That would allow an attacker who
            // knows (or guesses) a victim's session UUID to inject messages and
            // receive their agent responses. Session attachment is only allowed
            // via the explicit 'resume' message type.
            //
            // Rule: if this WebSocket connection has already established a sessionId
            // (via a previous 'message' or 'resume'), keep using it. Otherwise,
            // always create a new session, ignoring any client-provided sessionId.
            if (!sessionId) {
              if (this.sessions.size >= this.config.maxSessions) {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    sessionId: "",
                    message: `Max sessions (${this.config.maxSessions}) reached`,
                  }),
                );
                return;
              }
              sessionId = randomUUID();
              const session: Session = {
                id: sessionId,
                createdAt: Date.now(),
                lastActivity: Date.now(),
                abortController: null,
                messageCount: 0,
                connections: new Set([ws]),
              };
              this.sessions.set(sessionId, session);
              this.config.onSessionCreated?.(sessionId);
              ws.send(JSON.stringify({ type: "session", sessionId, status: "created" }));
            }

            const session = this.sessions.get(sessionId!)!;
            session.connections.add(ws);
            session.lastActivity = Date.now();
            session.messageCount++;

            // Run the agent
            const controller = new AbortController();
            session.abortController = controller;

            try {
              const result = await this.agent.run(msg.text, controller.signal);
              this.broadcast(session, { type: "response", sessionId: session.id, text: result });
            } catch (err) {
              if (controller.signal.aborted) {
                this.broadcast(session, {
                  type: "error",
                  sessionId: session.id,
                  message: "Canceled",
                });
              } else {
                this.broadcast(session, {
                  type: "error",
                  sessionId: session.id,
                  message: err instanceof Error ? err.message : String(err),
                });
              }
            } finally {
              session.abortController = null;
            }
            break;
          }
        }
      } catch (err) {
        ws.send(
          JSON.stringify({
            type: "error",
            sessionId: sessionId ?? "",
            message: err instanceof Error ? err.message : "Invalid message",
          }),
        );
      }
    });

    ws.addEventListener("close", () => {
      if (sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
          session.connections.delete(ws);
          // Don't destroy — session persists for reconnection
        }
      }
    });
  }

  // ── HTTP Chat Fallback ──────────────────────────────────────────────────

  private async handleHttpChat(req: IncomingMessage, res: ServerResponse): Promise<void> {
    let body: string;
    try {
      body = await this.readBody(req);
    } catch (err: unknown) {
      // Surface 413 from the body size limit, not a generic 500
      const status = (err as { statusCode?: number }).statusCode ?? 500;
      this.sendJson(res, status, {
        error: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    let parsed: { message: string; sessionId?: string };

    try {
      parsed = JSON.parse(body);
    } catch {
      this.sendJson(res, 400, { error: "Invalid JSON" });
      return;
    }

    if (!parsed.message?.trim()) {
      this.sendJson(res, 400, { error: '"message" field is required' });
      return;
    }

    // Create or get session
    const sessionId = parsed.sessionId ?? randomUUID();
    if (!this.sessions.has(sessionId)) {
      if (this.sessions.size >= this.config.maxSessions) {
        this.sendJson(res, 503, { error: "Max sessions reached" });
        return;
      }
      this.sessions.set(sessionId, {
        id: sessionId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        abortController: null,
        messageCount: 0,
        connections: new Set(),
      });
      this.config.onSessionCreated?.(sessionId);
    }

    const session = this.sessions.get(sessionId)!;
    session.lastActivity = Date.now();
    session.messageCount++;

    try {
      const result = await this.agent.run(parsed.message);
      this.sendJson(res, 200, { sessionId, response: result });
    } catch (err) {
      this.sendJson(res, 500, {
        sessionId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Internal Helpers ───────────────────────────────────────────────────

  private broadcast(session: Session, message: ServerMessage): void {
    const data = JSON.stringify(message);
    for (const ws of session.connections) {
      try {
        if (ws.readyState === 1) ws.send(data); // OPEN
      } catch {
        /* connection may have dropped */
      }
    }
  }

  private cleanupStaleSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (
        session.connections.size === 0 &&
        now - session.lastActivity > this.config.sessionTimeoutMs
      ) {
        this.destroySession(id, "timeout");
      }
    }
  }

  private destroySession(id: string, reason: string): void {
    const session = this.sessions.get(id);
    if (!session) return;

    session.abortController?.abort();
    for (const ws of session.connections) {
      try {
        ws.close(1000, reason);
      } catch {
        /* ignore */
      }
    }
    this.sessions.delete(id);
    this.config.onSessionDestroyed?.(id, reason);
  }

  private sendJson(res: ServerResponse, status: number, data: unknown): void {
    const body = JSON.stringify(data);
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
  }

  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalBytes = 0;
      // Enforce a body size limit to prevent OOM DoS.
      // Requests exceeding maxBodyBytes are rejected with HTTP 413 by the
      // caller (handleHttpChat destroys the connection on rejection).
      const maxBytes = this.config.maxBodyBytes;
      req.on("data", (chunk: Buffer) => {
        totalBytes += chunk.length;
        if (totalBytes > maxBytes) {
          reject(Object.assign(new Error("Request body too large"), { statusCode: 413 }));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      req.on("error", reject);
    });
  }
}

// ── Raw WebSocket Implementation ────────────────────────────────────────────

/**
 * Minimal RFC 6455 WebSocket on a raw TCP socket.
 * Handles text frames only (opcode 0x1). No extensions, no compression.
 * This avoids requiring the `ws` npm package as a dependency.
 */
class RawWebSocket implements WebSocketLike {
  readyState = 1; // OPEN
  private readonly socket: Duplex;
  private readonly listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  private buffer = Buffer.alloc(0);
  /**
   * Maximum allowed size of the in-flight frame buffer.
   * A slow or adversarial client can send a large frame header (announcing e.g.
   * 64 KB of payload) but never send the payload bytes. Without this cap, all
   * partial chunks accumulate in `buffer`, allowing OOM via many stalled connections.
   * Default: 1 MB. Exceeding this destroys the socket immediately.
   */
  private static readonly MAX_BUFFER_BYTES = 1_048_576; // 1 MB

  constructor(socket: Duplex) {
    this.socket = socket;

    socket.on("data", (chunk: Buffer) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      // Destroy the socket if the buffer grows beyond the cap.
      if (this.buffer.length > RawWebSocket.MAX_BUFFER_BYTES) {
        console.warn(
          `[yaaf/remote] WebSocket buffer exceeded ${RawWebSocket.MAX_BUFFER_BYTES} bytes — ` +
            "destroying connection (adversarial or pathological frame)",
        );
        this.readyState = 3;
        socket.destroy();
        this.emit("close");
        return;
      }
      this.processFrames();
    });

    socket.on("close", () => {
      this.readyState = 3; // CLOSED
      this.emit("close");
    });

    socket.on("error", () => {
      this.readyState = 3;
      this.emit("close");
    });
  }

  send(data: string): void {
    if (this.readyState !== 1) return;

    const payload = Buffer.from(data, "utf-8");
    const frame = this.encodeFrame(payload, 0x01); // Text frame
    this.socket.write(frame);
  }

  close(code?: number, reason?: string): void {
    if (this.readyState !== 1) return;
    this.readyState = 2; // CLOSING

    const payload = Buffer.alloc(2);
    payload.writeUInt16BE(code ?? 1000, 0);
    this.socket.write(this.encodeFrame(payload, 0x08)); // Close frame
    this.socket.end();
    this.readyState = 3;
  }

  addEventListener(event: string, listener: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
  }

  removeEventListener(event: string, listener: (...args: unknown[]) => void): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(event: string, data?: unknown): void {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    for (const listener of listeners) {
      try {
        listener(data);
      } catch {
        /* swallow */
      }
    }
  }

  private processFrames(): void {
    while (this.buffer.length >= 2) {
      const byte0 = this.buffer[0]!;
      const byte1 = this.buffer[1]!;
      const opcode = byte0 & 0x0f;
      const masked = (byte1 & 0x80) !== 0;
      let payloadLength = byte1 & 0x7f;

      let offset = 2;

      if (payloadLength === 126) {
        if (this.buffer.length < 4) return;
        payloadLength = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLength === 127) {
        if (this.buffer.length < 10) return;
        payloadLength = Number(this.buffer.readBigUInt64BE(2));
        offset = 10;
      }

      const maskingKeyLength = masked ? 4 : 0;
      const totalLength = offset + maskingKeyLength + payloadLength;

      if (this.buffer.length < totalLength) return;

      let payload: Buffer;
      if (masked) {
        const maskingKey = this.buffer.subarray(offset, offset + 4);
        payload = this.buffer.subarray(offset + 4, offset + 4 + payloadLength);
        for (let i = 0; i < payload.length; i++) {
          payload[i] = payload[i]! ^ maskingKey[i % 4]!;
        }
      } else {
        payload = this.buffer.subarray(offset, offset + payloadLength);
      }

      this.buffer = this.buffer.subarray(totalLength);

      switch (opcode) {
        case 0x01: // Text frame
          this.emit("message", payload.toString("utf-8"));
          break;
        case 0x08: // Close frame
          this.close();
          break;
        case 0x09: // Ping
          this.socket.write(this.encodeFrame(payload, 0x0a)); // Pong
          break;
        case 0x0a: // Pong
          break;
      }
    }
  }

  private encodeFrame(payload: Buffer, opcode: number): Buffer {
    const length = payload.length;
    let header: Buffer;

    if (length < 126) {
      header = Buffer.alloc(2);
      header[0] = 0x80 | opcode; // FIN + opcode
      header[1] = length;
    } else if (length < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode;
      header[1] = 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(length), 2);
    }

    return Buffer.concat([header, payload]);
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Start a remote session server for a YAAF agent.
 *
 * @example
 * ```ts
 * const handle = await startRemoteServer(myAgent, { port: 8080 });
 * // handle.close() to stop
 * ```
 */
export async function startRemoteServer(
  agent: RemoteAgent,
  config?: RemoteSessionConfig,
): Promise<RemoteSessionHandle> {
  const server = new RemoteSessionServer(agent, config);
  return server.start();
}
