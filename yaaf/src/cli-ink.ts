/**
 * Ink CLI Runtime — Opt-in premium terminal interface.
 *
 * Requires: `npm install ink react ink-text-input ink-spinner`
 *
 * @example
 * ```ts
 * import { createInkCLI } from 'yaaf/cli-ink';
 * ```
 *
 * @module cli-ink
 */

export { createInkCLI, type InkCLIConfig, type InkCLITheme } from "./runtime/inkCli.js";

// Re-export adapter for convenience
export {
  toStreamableAgent,
  adaptStream,
  type RuntimeStreamEvent,
  type StreamableAgent,
} from "./runtime/adapter.js";
