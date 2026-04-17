/**
 * CLI Runtime — Opt-in entry point for shipping agents as CLI products.
 *
 * @example
 * ```ts
 * import { createCLI } from 'yaaf/cli-runtime';
 * ```
 *
 * @module cli-runtime
 */

export {
  createCLI,
  type CLIAgent,
  type CLIConfig,
  type CLITheme,
  type CLIStreamEvent,
  type CLISlashCommand,
  type CLIContext,
} from "./runtime/cli.js";

// Re-export adapter for convenience
export {
  toStreamableAgent,
  adaptStream,
  type RuntimeStreamEvent,
  type StreamableAgent,
} from "./runtime/adapter.js";
