/**
 * DistributedIPCBackend — Pluggable cross-replica IPC transport.
 *
 * The default `InProcessIPCPlugin` uses an in-process EventEmitter —
 * messages are only visible within the same Node.js process. In multi-pod
 * deployments, cross-pod messages are silently dropped.
 *
 * Provide a `DistributedIPCBackend` to make `send()` and `subscribe()`
 * work across replicas:
 *
 * @example Redis backend (drop-in, ~15 lines):
 * ```ts
 * import { createClient } from 'redis'
 * import type { DistributedIPCBackend, IPCMessage } from 'yaaf/integrations/ipc.backend'
 *
 * const pub = createClient()
 * const sub = pub.duplicate()
 * await pub.connect()
 * await sub.connect()
 *
 * const backend: DistributedIPCBackend = {
 * async publish(mailbox, message) {
 * const key = `ipc:inbox:${mailbox}`
 * const val = await pub.lPush(key, JSON.stringify(message))
 * await pub.publish(`ipc:ch:${mailbox}`, JSON.stringify(message))
 * return val
 * },
 * subscribe(mailbox, handler) {
 * sub.subscribe(`ipc:ch:${mailbox}`, (msg) => handler(JSON.parse(msg)))
 * return () => sub.unsubscribe(`ipc:ch:${mailbox}`)
 * },
 * async drain(mailbox) {
 * const key = `ipc:inbox:${mailbox}`
 * const items = await pub.lRange(key, 0, -1)
 * await pub.del(key)
 * return items.map(i => JSON.parse(i) as IPCMessage)
 * },
 * }
 * ```
 *
 * @module integrations/ipc.backend
 */

import type { IPCMessage } from "./inProcessIPC.js";

// Re-export IPCMessage so consumers can import from this module
export type { IPCMessage };

/**
 * Pluggable cross-replica IPC backend.
 *
 * When provided via `InProcessIPCConfig.backend`, `InProcessIPCPlugin`
 * delegates `send()`, `subscribe()`, and `readUnread()` to this backend,
 * making IPC visible across all replicas that share the same backing store.
 *
 * **In-process fallback:**
 * The concurrent-slot book-keeping (inbox Maps, dead-letter queue, sender filters)
 * remains in-process. The backend only handles message *transport*.
 * The `InMemoryIPCBackend` is the default — same behavior as before.
 *
 * **Ordering guarantee:**
 * The backend MUST deliver messages FIFO per mailbox. Redis LPUSH/LRANGE provides
 * this. Pub/sub channels (`subscribe`) are best-effort and may not preserve order
 * under high concurrency — use `drain()` for ordered replay.
 */
export interface DistributedIPCBackend {
  /**
   * Publish a message to a named mailbox, visible to all replicas.
   *
   * @param mailbox - The inbox name (same as the `to` field of IPCMessage).
   * @param message - The fully-formed message to publish.
   * @returns The new queue depth after the publish.
   */
  publish(mailbox: string, message: IPCMessage): Promise<number>;

  /**
   * Subscribe to messages arriving in a named mailbox.
   *
   * The handler is called for each message published AFTER this subscribe() call.
   * It MUST NOT be called for messages already in the queue — use drain() for those.
   *
   * @param mailbox - The inbox to watch.
   * @param handler - Called for each new message.
   * @returns Unsubscribe function.
   */
  subscribe(mailbox: string, handler: (message: IPCMessage) => void): () => void;

  /**
   * Drain and return all pending messages for a mailbox.
   *
   * Atomically removes and returns all queued messages (i.e., published but
   * not yet consumed). Used by `readUnread()` for polling-based consumption.
   *
   * @param mailbox - The inbox to drain.
   * @returns All pending messages, oldest first.
   */
  drain(mailbox: string): Promise<IPCMessage[]>;
}

/**
 * Default in-process implementation of DistributedIPCBackend.
 *
 * Same behavior as the built-in EventEmitter transport — messages are
 * only visible within a single Node.js process. Used when no backend is
 * configured (backward-compatible default).
 */
export class InMemoryIPCBackend implements DistributedIPCBackend {
  private readonly queues = new Map<string, IPCMessage[]>();
  private readonly listeners = new Map<string, Set<(msg: IPCMessage) => void>>();

  async publish(mailbox: string, message: IPCMessage): Promise<number> {
    if (!this.queues.has(mailbox)) this.queues.set(mailbox, []);
    const queue = this.queues.get(mailbox)!;
    queue.push(message);

    // Notify in-process subscribers
    for (const handler of this.listeners.get(mailbox) ?? []) {
      try {
        handler(message);
      } catch {
        /* handler errors must not affect delivery */
      }
    }

    return queue.length;
  }

  subscribe(mailbox: string, handler: (message: IPCMessage) => void): () => void {
    if (!this.listeners.has(mailbox)) this.listeners.set(mailbox, new Set());
    this.listeners.get(mailbox)!.add(handler);
    return () => this.listeners.get(mailbox)?.delete(handler);
  }

  async drain(mailbox: string): Promise<IPCMessage[]> {
    const queue = this.queues.get(mailbox) ?? [];
    this.queues.set(mailbox, []);
    return queue;
  }
}
