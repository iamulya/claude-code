/**
 * Worker Runtime — Opt-in entry point for shipping agents to edge platforms.
 *
 * @example
 * ```ts
 * import { createWorker } from 'yaaf/worker';
 * ```
 *
 * @module worker
 */

export {
  createWorker,
  type WorkerAgent,
  type WorkerConfig,
  type WorkerStreamEvent,
} from './runtime/worker.js'

// Re-export adapter for convenience
export {
  toStreamableAgent,
  adaptStream,
  type RuntimeStreamEvent,
  type StreamableAgent,
} from './runtime/adapter.js'
