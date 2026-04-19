/**
 * LRU Cache — Least-Recently-Used eviction cache.
 *
 * A simple, zero-dependency LRU cache built on `Map` iteration order.
 * ES2015+ Maps maintain insertion order, so the oldest entry is always
 * the first in the iteration order. On `get()`, we delete and re-insert
 * to move the entry to the "most recent" position.
 *
 * Used by `KBStore` for lazy document loading — full document bodies are
 * cached in an LRU with a configurable max size, while only frontmatter
 * metadata is held permanently in memory.
 *
 * @example
 * ```ts
 * const cache = new LRUCache<string, CompiledDocument>(100)
 * cache.set('concepts/attention', doc)
 * const doc = cache.get('concepts/attention') // moves to most-recent
 * ```
 *
 * @module knowledge/store/lruCache
 */

export class LRUCache<K, V> {
  private readonly max: number;
  private readonly maxBytes: number;
  private currentBytes = 0;
  private readonly map = new Map<K, V>();

  /**
   * @param max Maximum number of entries before eviction
   * @param maxBytes Maximum total byte size before eviction (default: no byte limit).
   *   For string values, size is approximated as `value.length * 2` (UTF-16).
   */
  constructor(max: number, maxBytes?: number) {
    if (max < 1) throw new Error("LRUCache max must be >= 1");
    this.max = max;
    this.maxBytes = maxBytes ?? Infinity;
  }

  /**
   * Get a value by key. Returns undefined if not found.
   * Moves the entry to the most-recently-used position.
   */
  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      // Move to end (most recent) by deleting and re-inserting
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }

  /**
   * Set a key-value pair. Evicts the least-recently-used entry
   * if the cache is at capacity (by count or byte size).
   */
  set(key: K, value: V): void {
    const newBytes = this.byteSize(value);

    // L-1: Skip caching if a single value exceeds the byte budget by itself.
    // Without this guard, inserting a 60MB document into a 50MB cache evicts
    // everything else down to 1 entry (the map.size>1 guard) and leaves the
    // cache permanently over budget. Every subsequent insert evicts one entry
    // but can never reduce below the oversized item.
    // Instead, silently drop the over-budget value (and evict existing entry
    // for that key if stale) so the cache stays coherent.
    if (newBytes > this.maxBytes) {
      const existing = this.map.get(key);
      if (existing !== undefined) {
        this.currentBytes -= this.byteSize(existing);
        this.map.delete(key);
      }
      return;
    }

    // If key already exists, adjust byte accounting before overwriting
    const existing = this.map.get(key);
    if (existing !== undefined) {
      this.currentBytes -= this.byteSize(existing);
    }
    // Delete first to update insertion order
    this.map.delete(key);
    this.map.set(key, value);
    this.currentBytes += newBytes;

    // Evict oldest entries while over capacity (count OR bytes).
    // L-1: guard changed from map.size > 1 to map.size > 0 so a newly inserted
    // item that pushes the cache over budget can be evicted if a subsequent
    // item replaces it and is itself within budget.
    while ((this.map.size > this.max || this.currentBytes > this.maxBytes) && this.map.size > 0) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) {
        const oldVal = this.map.get(oldest);
        if (oldVal !== undefined) {
          this.currentBytes -= this.byteSize(oldVal);
        }
        this.map.delete(oldest);
      } else {
        break;
      }
    }
  }

  /**
   * Check if a key exists in the cache.
   * Does NOT update the access order.
   */
  has(key: K): boolean {
    return this.map.has(key);
  }

  /**
   * Delete a key from the cache.
   * Returns true if the key was present.
   */
  delete(key: K): boolean {
    const existing = this.map.get(key);
    if (existing !== undefined) {
      this.currentBytes -= this.byteSize(existing);
    }
    return this.map.delete(key);
  }

  /** Clear all entries. */
  clear(): void {
    this.map.clear();
    this.currentBytes = 0;
  }

  /** Current number of entries in the cache. */
  get size(): number {
    return this.map.size;
  }

  /** Maximum number of entries before eviction. */
  get capacity(): number {
    return this.max;
  }

  /** Current approximate byte size of all cached values. */
  get byteSize_(): number {
    return this.currentBytes;
  }

  /** Estimate the byte size of a value. Uses UTF-8 byte length for strings (P0-6). */
  private byteSize(value: V): number {
    // P0-6: Buffer.byteLength is accurate for UTF-8 heap cost.
    // The previous `length * 2` (UTF-16) estimate was wrong:
    //   - Over-estimates ASCII by 2× (ASCII is 1 byte/char in UTF-8, not 2)
    //   - Under-estimates CJK for surrogate pairs (4 bytes in UTF-8, 4 code units in UTF-16)
    // For a CJK-heavy KB with the 50MB default cap this caused ~100MB actual RAM use.
    if (typeof value === "string") return Buffer.byteLength(value, "utf8");
    return 0;
  }
}

