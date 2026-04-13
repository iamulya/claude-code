/**
 * Immutable State Store
 *
  * state container with:
 * - Immutable updates via updater functions
 * - Selector-based subscriptions (only re-notify when selected slice changes)
 * - No dependencies on React or any UI framework
 *
 * Design rationale:
  * the entire system. Components subscribe to slices via selectors, ensuring
 * minimal re-renders. This pattern avoids the complexity of Redux while
 * maintaining predictable state flow across agents, tools, and the UI.
 *
 * @example
 * ```ts
 * const store = createStore({ count: 0, name: 'agent-1' });
 *
 * // Subscribe to a slice
 * const unsub = store.subscribe(
 *   s => s.count,
 *   count => console.log('Count changed:', count)
 * );
 *
 * // Update immutably
 * store.setState(prev => ({ ...prev, count: prev.count + 1 }));
 * ```
 */

export type StoreSubscriber<T> = {
  /** Called with the full new state on every change */
  listener: (state: T) => void
  /** Optional selector — when provided, listener only fires when selected value changes */
  selector?: (state: T) => unknown
  /** Previous selected value for change detection */
  _prevSelected?: unknown
}

export type Store<T> = {
  /** Get the current state snapshot */
  getState(): T
  /** Update state via an updater function — must return a new object */
  setState(updater: (prev: T) => T): void
  /** Subscribe to all state changes. Returns an unsubscribe function. */
  subscribe(listener: (state: T) => void): () => void
  /**
   * Subscribe to a slice of state. The listener only fires when the
   * selected value changes (compared via Object.is).
   * Returns an unsubscribe function.
   */
  subscribe<S>(
    selector: (state: T) => S,
    listener: (selected: S, state: T) => void,
  ): () => void
}

/**
 * Create a new state store.
 *
 * @param initialState - The initial state value.
 * @param onChange - Optional callback fired after every state change.
 */
export function createStore<T>(
  initialState: T,
  onChange?: (args: { newState: T; oldState: T }) => void,
): Store<T> {
  let state = initialState
  const subscribers = new Set<StoreSubscriber<T>>()

  function getState(): T {
    return state
  }

  function setState(updater: (prev: T) => T): void {
    const oldState = state
    const newState = updater(oldState)

    // Skip if updater returned the same reference (no-op)
    if (Object.is(oldState, newState)) {
      return
    }

    state = newState
    onChange?.({ newState, oldState })

    // Notify subscribers — selector-based subs only fire on slice change
    for (const sub of subscribers) {
      if (sub.selector) {
        const newSelected = sub.selector(newState)
        if (!Object.is(sub._prevSelected, newSelected)) {
          sub._prevSelected = newSelected
          sub.listener(newState)
        }
      } else {
        sub.listener(newState)
      }
    }
  }

  // Overloaded subscribe
  function subscribe(
    selectorOrListener: ((state: T) => unknown) | ((state: T) => void),
    maybeListener?: (selected: unknown, state: T) => void,
  ): () => void {
    let sub: StoreSubscriber<T>

    if (maybeListener) {
      // subscribe(selector, listener)
      const selector = selectorOrListener as (state: T) => unknown
      const listener = maybeListener
      sub = {
        listener: (s: T) => listener(selector(s), s),
        selector,
        _prevSelected: selector(state),
      }
    } else {
      // subscribe(listener)
      sub = { listener: selectorOrListener as (state: T) => void }
    }

    subscribers.add(sub)
    return () => {
      subscribers.delete(sub)
    }
  }

  return { getState, setState, subscribe: subscribe as Store<T>['subscribe'] }
}
