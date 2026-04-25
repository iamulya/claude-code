/**
 * Skill Usage Tracking — Exponential-decay usage scoring.
 *
 * Tracks skill invocation counts and recency to produce a composite
 * usage score. Used for:
 * - Prioritizing skills in the prompt section (most-used first)
 * - Analytics / telemetry (which skills are actually used)
 * - Future: auto-disable stale skills
 *
 * Scoring uses exponential half-life decay: a skill used 10 times last week
 * scores higher than one used 10 times a month ago. The half-life is
 * configurable but defaults to 7 days.
 *
 * @module skills/tracking
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type SkillUsageRecord = {
  /** Skill name (unique key) */
  name: string;
  /** Total invocation count (lifetime) */
  invocationCount: number;
  /** Timestamp of first invocation (epoch ms) */
  firstUsedAt: number;
  /** Timestamp of most recent invocation (epoch ms) */
  lastUsedAt: number;
};

export type SkillUsageTrackerConfig = {
  /**
   * Half-life for the exponential decay function (days).
   * After this many days, the recency factor drops to 0.5.
   * Default: 7 days.
   */
  halfLifeDays?: number;
  /**
   * Minimum recency factor. Prevents very old skills from scoring exactly 0.
   * Default: 0.01 (1%).
   */
  minRecencyFactor?: number;
};

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_HALF_LIFE_DAYS = 7;
const DEFAULT_MIN_RECENCY_FACTOR = 0.01;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ── SkillUsageTracker ────────────────────────────────────────────────────────

export class SkillUsageTracker {
  private readonly storage = new Map<string, SkillUsageRecord>();
  private readonly halfLifeDays: number;
  private readonly minRecencyFactor: number;

  constructor(config?: SkillUsageTrackerConfig) {
    this.halfLifeDays = config?.halfLifeDays ?? DEFAULT_HALF_LIFE_DAYS;
    this.minRecencyFactor = config?.minRecencyFactor ?? DEFAULT_MIN_RECENCY_FACTOR;
  }

  /**
   * Record a skill invocation.
   * Increments the count and updates the last-used timestamp.
   */
  record(name: string): void {
    const now = Date.now();
    const existing = this.storage.get(name);
    if (existing) {
      existing.invocationCount += 1;
      existing.lastUsedAt = now;
    } else {
      this.storage.set(name, {
        name,
        invocationCount: 1,
        firstUsedAt: now,
        lastUsedAt: now,
      });
    }
  }

  /**
   * Get the usage record for a specific skill.
   * Returns undefined if the skill has never been used.
   */
  get(name: string): SkillUsageRecord | undefined {
    return this.storage.get(name);
  }

  /**
   * Compute the usage score for a skill.
   *
   * Score = invocationCount × recencyFactor
   *
   * Where recencyFactor = max(0.5^(daysSinceLastUse / halfLifeDays), minRecencyFactor)
   *
   * A skill used 10 times today scores 10.0.
   * A skill used 10 times 7 days ago (with default half-life) scores 5.0.
   * A skill used 10 times 14 days ago scores 2.5.
   *
   * @returns 0 if the skill has never been used
   */
  score(name: string, now?: number): number {
    const record = this.storage.get(name);
    if (!record) return 0;

    const currentTime = now ?? Date.now();
    const daysSince = (currentTime - record.lastUsedAt) / MS_PER_DAY;
    const recencyFactor = Math.max(
      Math.pow(0.5, daysSince / this.halfLifeDays),
      this.minRecencyFactor,
    );

    return record.invocationCount * recencyFactor;
  }

  /**
   * Get all tracked skills sorted by score (highest first).
   */
  ranking(now?: number): Array<SkillUsageRecord & { score: number }> {
    const currentTime = now ?? Date.now();
    return Array.from(this.storage.values())
      .map((r) => ({ ...r, score: this.score(r.name, currentTime) }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Get names of all tracked skills.
   */
  trackedNames(): string[] {
    return Array.from(this.storage.keys());
  }

  /**
   * Number of tracked skills.
   */
  get size(): number {
    return this.storage.size;
  }

  /**
   * Clear all tracking data.
   */
  clear(): void {
    this.storage.clear();
  }

  /**
   * Export all records for serialization/persistence.
   */
  export(): SkillUsageRecord[] {
    return Array.from(this.storage.values());
  }

  /**
   * Import records (e.g. from persisted state).
   * Existing records for the same skill name are overwritten.
   */
  import(records: SkillUsageRecord[]): void {
    for (const record of records) {
      this.storage.set(record.name, { ...record });
    }
  }
}
