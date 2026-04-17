/**
 * Remote Sessions — Opt-in entry point for WebSocket-based agent sessions.
 *
 * These are NOT included in the main `yaaf` barrel export by design.
 * Import explicitly when you need remote sessions:
 *
 * @example
 * ```ts
 * import { RemoteSessionServer, startRemoteServer } from 'yaaf/remote';
 * ```
 *
 * @module remote
 */

export {
  RemoteSessionServer,
  startRemoteServer,
  type RemoteSessionConfig,
  type RemoteAgent,
  type ServerMessage,
  type RemoteSessionHandle,
} from "./remote/sessions.js";
