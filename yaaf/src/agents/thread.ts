/**
 * AgentThread — Serializable step-by-step agent execution state.
 *
 * Enables the "stateless reducer" pattern from 12 Factor Agents (Factor 12):
 *
 * agent.step(thread) → { thread: newThread, done: boolean, suspended?: SuspendReason }
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

import type { ChatMessage, ToolCall } from "./runner.js";
import { createHmac, timingSafeEqual } from "crypto";

// ── Thread Types ──────────────────────────────────────────────────────────────

/**
 * The reason an agent suspended mid-execution.
 * Each variant provides enough context to resume correctly.
 */
export type SuspendReason =
  | {
      type: "awaiting_approval";
      /** The tool call the LLM requested that requires approval */
      pendingToolCall: ToolCall;
      /** Parsed arguments */
      args: Record<string, unknown>;
      /** Human-readable reason (from the tool's requiresApproval setting) */
      message: string;
    }
  | {
      type: "awaiting_human_input";
      /** The question the agent is asking the human */
      question: string;
      /** Optional urgency hint */
      urgency?: "low" | "medium" | "high";
    }
  | {
      type: "awaiting_async_result";
      /** Job/task ID to poll for completion */
      jobId: string;
      /** Tool that kicked off the async job */
      toolName: string;
    }
  | {
      type: "max_iterations";
      /** Number of iterations completed */
      iterations: number;
    };

/**
 * Result of resolving a suspension.
 * Pass this to `agent.resume(thread, resolution)`.
 */
export type SuspendResolution =
  | { type: "approved"; result?: string }
  | { type: "rejected"; reason?: string }
  | { type: "human_input"; response: string }
  | { type: "async_result"; result: unknown; error?: string };

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
  id: string;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** Step counter (increments with each agent.step() call) */
  step: number;
  /** Full conversation history — the source of truth */
  messages: ChatMessage[];
  /** Whether the thread has reached a terminal state */
  done: boolean;
  /** Final response content (set when done === true) */
  finalResponse?: string;
  /** Suspension details (set when the thread is suspended) */
  suspended?: SuspendReason;
  /** Optional metadata (user-defined) */
  metadata?: Record<string, unknown>;
};

// ── Thread Factories ──────────────────────────────────────────────────────────

import { randomUUID } from "crypto";

/**
 * Create a new thread with an initial user message.
 */
export function createThread(userMessage: string, metadata?: Record<string, unknown>): AgentThread {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    step: 0,
    messages: [{ role: "user", content: userMessage }],
    done: false,
    metadata,
  };
}

/**
 * Fork a thread at the current step.
 * Returns a new thread with the same history but a new ID.
 * Useful for "what if?" branching and A/B testing agent paths.
 */
export function forkThread(thread: AgentThread, metadata?: Record<string, unknown>): AgentThread {
  const now = new Date().toISOString();
  return {
    ...thread,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    step: thread.step,
    // deep-copy messages so mutations in the fork don't affect the original
    messages: thread.messages.map((m) => ({ ...m })),
    done: false,
    suspended: undefined,
    metadata: { ...thread.metadata, ...metadata, forkedFrom: thread.id },
  };
}

/**
 * Serialize a thread to JSON string (for storage).
 *
 * @param hmacSecret — If provided, appends an HMAC-SHA256 signature to the
 * serialized output for integrity verification on deserialization.
 */
export function serializeThread(thread: AgentThread, hmacSecret?: string): string {
  const json = JSON.stringify(thread);
  if (hmacSecret) {
    const sig = createHmac("sha256", hmacSecret).update(json).digest("hex");
    return JSON.stringify({ __signed: true, payload: json, sig });
  }
  return json;
}

/** Maximum serialized thread size (50 MB) to prevent DoS */
const MAX_THREAD_SIZE = 50 * 1024 * 1024;

/**
 * Deserialize a thread from JSON string.
 *
 * validates the thread structure to prevent injection attacks
 * via tampered thread blobs (e.g., spoofed system messages, forged tool calls).
 *
 *
 * - Enforces 50MB max size to prevent deserialization DoS.
 * - Strips `system` role messages from deserialized threads to prevent
 * system prompt injection via tampered thread blobs. System prompts
 * are injected by the runner at execution time — they should never
 * come from an external thread source.
 * - Supports optional HMAC verification when an `hmacSecret` is provided.
 *
 * @param hmacSecret — If provided, verifies the HMAC-SHA256 signature before
 * deserializing. Tampered threads are rejected with an error.
 */
export function deserializeThread(json: string, hmacSecret?: string): AgentThread {
  // Size limit to prevent DoS
  if (json.length > MAX_THREAD_SIZE) {
    throw new Error(`Invalid thread: exceeds maximum size (${MAX_THREAD_SIZE} bytes)`);
  }

  // HMAC verification
  let rawJson = json;
  if (hmacSecret) {
    const wrapper = JSON.parse(json);
    if (!wrapper?.__signed || !wrapper.payload || !wrapper.sig) {
      throw new Error("Invalid thread: expected HMAC-signed thread but got unsigned data");
    }
    const expectedSig = createHmac("sha256", hmacSecret).update(wrapper.payload).digest("hex");
    // Constant-time comparison to prevent timing attacks
    const sigA = Buffer.from(wrapper.sig, "hex");
    const sigB = Buffer.from(expectedSig, "hex");
    if (sigA.length !== sigB.length || !timingSafeEqual(sigA, sigB)) {
      throw new Error(
        "Invalid thread: HMAC signature mismatch — thread may have been tampered with",
      );
    }
    rawJson = wrapper.payload;
  }

  const parsed = JSON.parse(rawJson);

  // Structural validation — fail fast on malformed/tampered threads
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid thread: expected an object");
  }
  if (typeof parsed.id !== "string" || !parsed.id) {
    throw new Error('Invalid thread: missing or empty "id"');
  }
  if (typeof parsed.step !== "number" || parsed.step < 0) {
    throw new Error('Invalid thread: "step" must be a non-negative number');
  }
  if (!Array.isArray(parsed.messages)) {
    throw new Error('Invalid thread: "messages" must be an array');
  }
  if (typeof parsed.done !== "boolean") {
    throw new Error('Invalid thread: "done" must be a boolean');
  }

  // Validate message roles
  const ALLOWED_ROLES = new Set(["user", "assistant", "system", "tool"]);
  for (let i = 0; i < parsed.messages.length; i++) {
    const msg = parsed.messages[i];
    if (!msg || typeof msg !== "object" || !ALLOWED_ROLES.has(msg.role)) {
      throw new Error(`Invalid thread: message[${i}] has invalid role "${msg?.role}"`);
    }
  }

  // Strip system-role messages from deserialized threads.
  // System prompts are injected by the runner at execution time — incoming
  // threads should never carry their own system prompts (injection vector).
  parsed.messages = parsed.messages.filter((msg: { role: string }) => msg.role !== "system");

  return parsed as AgentThread;
}

// ── Step Result ───────────────────────────────────────────────────────────────

/**
 * The result of a single agent.step() call.
 */
export type StepResult = {
  /** The updated thread after this step */
  thread: AgentThread;
  /** Whether the agent is done (final response produced) */
  done: boolean;
  /** Final response text (only when done === true) */
  response?: string;
  /** Set if the agent suspended and needs external input to continue */
  suspended?: SuspendReason;
};
