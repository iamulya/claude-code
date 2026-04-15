/**
 * AgentThread — Serializable step-by-step agent execution state.
 *
 * Enables the "stateless reducer" pattern from 12 Factor Agents (Factor 12):
 *
 *   agent.step(thread) → { thread: newThread, done: boolean, suspended?: SuspendReason }
 *
 * The thread captures everything needed to continue execution:
 * - Full message history
 * - Pending tool calls (if suspended mid-execution)
 * - Metadata (thread ID, step count, timestamps)
 *
 * Threads are plain JSON — store them anywhere (DynamoDB, Redis, files, etc.)
 * and resume from any environment, process, or serverless function.
 *
 * @module agents/thread
 */

import type { ChatMessage, ToolCall } from './runner.js'

// ── Thread Types ──────────────────────────────────────────────────────────────

/**
 * The reason an agent suspended mid-execution.
 * Each variant provides enough context to resume correctly.
 */
export type SuspendReason =
  | {
      type: 'awaiting_approval'
      /** The tool call the LLM requested that requires approval */
      pendingToolCall: ToolCall
      /** Parsed arguments */
      args: Record<string, unknown>
      /** Human-readable reason (from the tool's requiresApproval setting) */
      message: string
    }
  | {
      type: 'awaiting_human_input'
      /** The question the agent is asking the human */
      question: string
      /** Optional urgency hint */
      urgency?: 'low' | 'medium' | 'high'
    }
  | {
      type: 'awaiting_async_result'
      /** Job/task ID to poll for completion */
      jobId: string
      /** Tool that kicked off the async job */
      toolName: string
    }
  | {
      type: 'max_iterations'
      /** Number of iterations completed */
      iterations: number
    }

/**
 * Result of resolving a suspension.
 * Pass this to `agent.resume(thread, resolution)`.
 */
export type SuspendResolution =
  | { type: 'approved'; result?: string }
  | { type: 'rejected'; reason?: string }
  | { type: 'human_input'; response: string }
  | { type: 'async_result'; result: unknown; error?: string }

/**
 * An agent thread — the complete serializable state for one agent conversation.
 *
 * A thread can be:
 * - Saved to any storage (file, database, Redis)
 * - Loaded and resumed in any Node.js process
 * - Forked at any step (snapshot branching)
 * - Replayed for debugging
 */
export type AgentThread = {
  /** Unique thread identifier */
  id: string
  /** ISO timestamp of creation */
  createdAt: string
  /** ISO timestamp of last update */
  updatedAt: string
  /** Step counter (increments with each agent.step() call) */
  step: number
  /** Full conversation history — the source of truth */
  messages: ChatMessage[]
  /** Whether the thread has reached a terminal state */
  done: boolean
  /** Final response content (set when done === true) */
  finalResponse?: string
  /** Suspension details (set when the thread is suspended) */
  suspended?: SuspendReason
  /** Optional metadata (user-defined) */
  metadata?: Record<string, unknown>
}

// ── Thread Factories ──────────────────────────────────────────────────────────

import { randomUUID } from 'crypto'

/**
 * Create a new thread with an initial user message.
 */
export function createThread(userMessage: string, metadata?: Record<string, unknown>): AgentThread {
  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    step: 0,
    messages: [{ role: 'user', content: userMessage }],
    done: false,
    metadata,
  }
}

/**
 * Fork a thread at the current step.
 * Returns a new thread with the same history but a new ID.
 * Useful for "what if?" branching and A/B testing agent paths.
 */
export function forkThread(thread: AgentThread, metadata?: Record<string, unknown>): AgentThread {
  const now = new Date().toISOString()
  return {
    ...thread,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    step: thread.step,
    messages: [...thread.messages],
    done: false,
    suspended: undefined,
    metadata: { ...thread.metadata, ...metadata, forkedFrom: thread.id },
  }
}

/**
 * Serialize a thread to JSON string (for storage).
 */
export function serializeThread(thread: AgentThread): string {
  return JSON.stringify(thread)
}

/**
 * Deserialize a thread from JSON string.
 */
export function deserializeThread(json: string): AgentThread {
  return JSON.parse(json) as AgentThread
}

// ── Step Result ───────────────────────────────────────────────────────────────

/**
 * The result of a single agent.step() call.
 */
export type StepResult = {
  /** The updated thread after this step */
  thread: AgentThread
  /** Whether the agent is done (final response produced) */
  done: boolean
  /** Final response text (only when done === true) */
  response?: string
  /** Set if the agent suspended and needs external input to continue */
  suspended?: SuspendReason
}
