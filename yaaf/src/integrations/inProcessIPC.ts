/**
 * InProcessIPCPlugin — Zero-latency EventEmitter-based IPC for same-process agents.
 *
 * Implements the `IPCAdapter` plugin capability. Messages are delivered
 * via Node.js EventEmitter (synchronously within the same event-loop turn) —
 * no polling, no disk I/O, no file lock contention.
 *
 * Use this when all agents are in the same Node.js process.
 * For cross-process communication, use the `Mailbox` file-based transport.
 *
 * Production features (I1-I3):
 * - I1: maxInboxSize cap with drop-oldest or reject policy (backpressure)
 * - I2: Observability events (ipc:dlq, ipc:backpressure, ipc:ttl_expired)
 * - I3: allowedSenders whitelist per subscription (capability enforcement)
 *
 * @module integrations/inProcessIPC
 */

import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import { PluginBase } from "../plugin/base.js";
import type { DistributedIPCBackend } from "./ipc.backend.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type IPCMessage = {
  id: string;
  from: string;
  to: string;
  body: string; // JSON-serialized or plain text
  timestamp: string; // ISO 8601
  read: boolean;
  attempts: number;
  maxAttempts: number;
  ttlMs?: number;
  color?: string;
  summary?: string;
};

export interface IPCAdapter {
  readonly capability: "ipc";
  send(
    inbox: string,
    message: Omit<IPCMessage, "id" | "timestamp" | "read" | "attempts">,
  ): Promise<void>;
  readUnread(inbox: string): Promise<IPCMessage[]>;
  markAllRead(inbox: string): Promise<void>;
  subscribe(
    inbox: string,
    handler: (msg: IPCMessage) => void,
    options?: SubscribeOptions,
  ): () => void;
  deadLetter(inbox: string, message: IPCMessage, reason: string): Promise<void>;
  listDeadLetters(inbox: string): Promise<IPCMessage[]>;
  clear(inbox: string): Promise<void>;
}

/** I3: Options for subscribe() */
export type SubscribeOptions = {
  /**
   * If set, only messages with a `from` field in this set are delivered.
   * Messages from unauthorized senders are dead-lettered.
   *
   * @example
   * ```ts
   * ipc.subscribe('agent-a', handler, { allowedSenders: ['agent-b', 'agent-c'] })
   * ```
   */
  allowedSenders?: string[];
};

/** I1: Backpressure config */
export type InProcessIPCConfig = {
  /**
   * Maximum messages per inbox before backpressure kicks in.
   * Default: 1000.
   */
  maxInboxSize?: number;

  /**
   * Policy when an inbox is full.
   * - `'drop-oldest'` (default): oldest unread message is dead-lettered, new message accepted.
   * - `'reject'`: `send()` throws `Error('inbox full')`.
   */
  fullPolicy?: "drop-oldest" | "reject";

  /**
   * I2: Called for observability events (backpressure, DLQ, TTL expiry).
   * Optional — if not provided, events are silently tracked internally.
   */
  onEvent?: (event: IPCEvent) => void;

  /**
   * I4: Optional distributed backend for cross-replica message transport.
   *
   * When omitted, an in-process EventEmitter is used — messages are only
   * visible within a single Node.js process. In multi-pod deployments
   * you MUST provide a distributed backend (e.g. Redis) to route messages
   * between replicas.
   *
   * @example
   * ```ts
   * import { InMemoryIPCBackend } from 'yaaf/integrations/ipc.backend'
   *
   * const ipc = new InProcessIPCPlugin({
   * backend: new InMemoryIPCBackend(), // swap for Redis backend in production
   * })
   * ```
   */
  backend?: DistributedIPCBackend;
};

export type IPCEvent =
  | { type: "ipc:dlq"; inbox: string; messageId: string; reason: string }
  | { type: "ipc:backpressure"; inbox: string; droppedId: string; policy: "drop-oldest" }
  | { type: "ipc:ttl_expired"; inbox: string; messageId: string }
  | { type: "ipc:sender_blocked"; inbox: string; messageId: string; from: string };

// ── InProcessIPCPlugin ────────────────────────────────────────────────────────

/**
 * EventEmitter-based IPC for same-process multi-agent swarms.
 * Subscribe-based delivery (zero polling).
 */
export class InProcessIPCPlugin extends PluginBase implements IPCAdapter {
  readonly capability = "ipc" as const;

  private readonly emitter = new EventEmitter();
  private readonly inboxes = new Map<string, IPCMessage[]>();
  private readonly deadLetters = new Map<string, IPCMessage[]>();

  // I1: Backpressure
  private readonly maxInboxSize: number;
  private readonly fullPolicy: "drop-oldest" | "reject";

  // I2: Observability
  private readonly onEvent?: (event: IPCEvent) => void;

  // I3: Per-inbox allowed-senders (set at subscribe time)
  private readonly senderFilters = new Map<string, Set<string>>();

  // I4: Optional distributed backend
  private readonly _backend?: DistributedIPCBackend;

  constructor(config: InProcessIPCConfig = {}) {
    super("ipc:in-process", ["ipc"]);
    this.emitter.setMaxListeners(0); // many agents may subscribe
    this.maxInboxSize = config.maxInboxSize ?? 1000;
    this.fullPolicy = config.fullPolicy ?? "drop-oldest";
    this.onEvent = config.onEvent;
    this._backend = config.backend;
  }

  async send(
    inbox: string,
    message: Omit<IPCMessage, "id" | "timestamp" | "read" | "attempts">,
  ): Promise<void> {
    const now = Date.now();
    const msg: IPCMessage = {
      ...message,
      id: randomUUID(),
      timestamp: new Date(now).toISOString(),
      read: false,
      attempts: 1,
      maxAttempts: message.maxAttempts ?? 3,
    };

    // TTL check — zero or negative TTL means the message is already expired
    if (msg.ttlMs !== undefined && msg.ttlMs <= 0) {
      await this.deadLetter(inbox, msg, "TTL expired before delivery");
      this.emitEvent({ type: "ipc:ttl_expired", inbox, messageId: msg.id });
      return;
    }

    if (!this.inboxes.has(inbox)) this.inboxes.set(inbox, []);
    const queue = this.inboxes.get(inbox)!;

    // I1: Backpressure — check inbox size before inserting
    if (queue.length >= this.maxInboxSize) {
      if (this.fullPolicy === "reject") {
        throw new Error(
          `IPC inbox "${inbox}" is full (${this.maxInboxSize} messages). Sender: ${msg.from}`,
        );
      }
      // drop-oldest: move oldest to DLQ
      const dropped = queue.shift()!;
      await this.deadLetter(inbox, dropped, "inbox full — evicted by drop-oldest policy");
      this.emitEvent({
        type: "ipc:backpressure",
        inbox,
        droppedId: dropped.id,
        policy: "drop-oldest",
      });
    }

    queue.push(msg);

    // I3: Check sender filter BEFORE emitting to subscribers
    const allowed = this.senderFilters.get(inbox);
    if (allowed && !allowed.has(msg.from)) {
      // Blocked sender — dead-letter without subscriber delivery
      await this.deadLetter(inbox, msg, `sender "${msg.from}" not in allowedSenders`);
      this.emitEvent({ type: "ipc:sender_blocked", inbox, messageId: msg.id, from: msg.from });
      return;
    }

    // I4: Delegate to distributed backend if configured; otherwise use local EventEmitter
    if (this._backend) {
      await this._backend.publish(inbox, msg);
    } else {
      // Event-driven delivery to local subscribers
      this.emitter.emit(`inbox:${inbox}`, msg);
    }
  }

  async readUnread(inbox: string): Promise<IPCMessage[]> {
    // I4: Drain from distributed backend if configured
    if (this._backend) {
      return this._backend.drain(inbox);
    }
    const messages = this.inboxes.get(inbox) ?? [];
    return messages.filter((m) => !m.read);
  }

  async markAllRead(inbox: string): Promise<void> {
    const messages = this.inboxes.get(inbox);
    if (messages) {
      for (const m of messages) m.read = true;
    }
  }

  /**
   * Subscribe to messages delivered to `inbox`.
   *
   * @param options.allowedSenders - I3: If set, only messages from these senders
   * are delivered. Others are dead-lettered with reason 'sender not in allowedSenders'.
   *
   * @returns Unsubscribe function — call it to stop receiving messages.
   */
  subscribe(
    inbox: string,
    handler: (msg: IPCMessage) => void,
    options?: SubscribeOptions,
  ): () => void {
    // I3: Register sender filter for this inbox
    if (options?.allowedSenders?.length) {
      this.senderFilters.set(inbox, new Set(options.allowedSenders));
    }

    // I4: Delegate to distributed backend if configured
    if (this._backend) {
      return this._backend.subscribe(inbox, handler);
    }

    const listener = (msg: IPCMessage) => handler(msg);
    this.emitter.on(`inbox:${inbox}`, listener);
    return () => {
      this.emitter.off(`inbox:${inbox}`, listener);
    };
  }

  async deadLetter(inbox: string, message: IPCMessage, reason: string): Promise<void> {
    if (!this.deadLetters.has(inbox)) this.deadLetters.set(inbox, []);
    const dlqMsg = {
      ...message,
      body: `[DLQ: ${reason}] ${message.body}`,
    };
    this.deadLetters.get(inbox)!.push(dlqMsg);
    this.emitEvent({ type: "ipc:dlq", inbox, messageId: message.id, reason });
  }

  async listDeadLetters(inbox: string): Promise<IPCMessage[]> {
    return this.deadLetters.get(inbox) ?? [];
  }

  async clear(inbox: string): Promise<void> {
    this.inboxes.set(inbox, []);
  }

  async destroy(): Promise<void> {
    this.emitter.removeAllListeners();
    this.inboxes.clear();
    this.deadLetters.clear();
    this.senderFilters.clear();
  }

  // ── I2: Observability ─────────────────────────────────────────────────────

  private emitEvent(event: IPCEvent): void {
    this.onEvent?.(event);
  }
}
