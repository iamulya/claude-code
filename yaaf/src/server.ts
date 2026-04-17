/**
 * Server Runtime — Opt-in entry point for shipping agents as HTTP APIs.
 *
 * @example
 * ```ts
 * import { createServer } from 'yaaf/server';
 * ```
 *
 * @module server
 */

export {
  createServer,
  type ServerAgent,
  type ServerConfig,
  type SessionsConfig,
  type ServerStreamEvent,
  type ServerHandle,
  type RouteHandler,
} from "./runtime/server.js";

// Re-export adapter for convenience
export {
  toStreamableAgent,
  adaptStream,
  type RuntimeStreamEvent,
  type StreamableAgent,
} from "./runtime/adapter.js";
