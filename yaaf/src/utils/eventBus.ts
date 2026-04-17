/**
 * Event Bus — Typed event emitter for framework-internal communication
 *
 * A generic, type-safe event bus used throughout the framework to decouple
 * subsystems. The orchestrator uses it for agent lifecycle events, the
 * task manager for status changes, etc.
 */

export type EventHandler<T = unknown> = (data: T) => void;

/**
 * Type-safe event emitter.
 *
 * @example
 * ```ts
 * type AppEvents = {
 * 'user:login': { userId: string };
 * 'task:complete': { taskId: string; result: unknown };
 * };
 *
 * const bus = new EventBus<AppEvents>();
 *
 * bus.on('user:login', ({ userId }) => {
 * console.log(`User ${userId} logged in`);
 * });
 *
 * bus.emit('user:login', { userId: '42' });
 * ```
 */
export class EventBus<Events extends Record<string, unknown> = Record<string, unknown>> {
  private handlers = new Map<keyof Events, Set<EventHandler>>();
  /**
   * Maximum listeners per event before emitting a leak warning.
   * Mirrors Node.js EventEmitter behavior. Default: 100.
   * Set to 0 to disable the check.
   */
  private readonly maxListeners: number;

  constructor(opts?: { maxListeners?: number }) {
    this.maxListeners = opts?.maxListeners ?? 100;
  }

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const set = this.handlers.get(event)!;
    set.add(handler as EventHandler);

    // Warn when listener count crosses the cap (leak detection).
    if (this.maxListeners > 0 && set.size > this.maxListeners) {
      console.warn(
        `[EventBus] Possible event listener leak: ${set.size} listeners on "${String(event)}". ` +
          `Consider calling the returned unsubscribe function to clean up unused subscriptions.`,
      );
    }

    return () => {
      this.handlers.get(event)?.delete(handler as EventHandler);
    };
  }

  /** Subscribe to an event, auto-unsubscribing after the first call. */
  once<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): () => void {
    const unsub = this.on(event, (data) => {
      unsub();
      handler(data);
    });
    return unsub;
  }

  /** Emit an event to all subscribers */
  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(data);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${String(event)}":`, err);
      }
    }
  }

  /** Remove all handlers for an event, or all handlers if no event specified */
  off<K extends keyof Events>(event?: K): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  /** Get the number of handlers for a specific event */
  listenerCount<K extends keyof Events>(event: K): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}
