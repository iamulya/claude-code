/**
 * Content Replacement State — tracks file edits across compaction boundaries.
 *
 * Inspired by the main repo's edit tracking. When compaction drops old
 * messages, the system loses knowledge of which files were modified.
 * This tracker preserves that knowledge so it can be re-injected after
 * compaction.
 *
 * @example
 * ```ts
 * const tracker = new ContentReplacementTracker();
 *
 * // Agent edits a file:
 * tracker.recordEdit('src/auth.ts', {
 * type: 'modify',
 * summary: 'Added null check at line 42',
 * });
 *
 * // Before compaction, export the state:
 * const state = tracker.getEditSummary();
 * // → "Files modified this session:\n- src/auth.ts: Added null check at line 42\n..."
 *
 * // After compaction, inject as system context:
 * contextManager.addSection({ content: state, priority: 'medium' });
 * ```
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type EditType = "create" | "modify" | "delete" | "rename";

export type FileEdit = {
  type: EditType;
  summary: string;
  timestamp: number;
  /** Total number of edits to this file. */
  editCount: number;
};

export type ContentReplacementSnapshot = {
  files: Record<string, FileEdit>;
  savedAt: string;
};

// ── ContentReplacementTracker ────────────────────────────────────────────────

export class ContentReplacementTracker {
  private readonly files = new Map<string, FileEdit>();

  // ── Recording ──────────────────────────────────────────────────────────

  /** Record a file edit. */
  recordEdit(filePath: string, edit: { type: EditType; summary: string }): void {
    const existing = this.files.get(filePath);
    this.files.set(filePath, {
      type: edit.type,
      summary: edit.summary,
      timestamp: Date.now(),
      editCount: (existing?.editCount ?? 0) + 1,
    });
  }

  /** Record a file creation. */
  recordCreate(filePath: string, summary?: string): void {
    this.recordEdit(filePath, {
      type: "create",
      summary: summary ?? `Created ${filePath}`,
    });
  }

  /** Record a file deletion. */
  recordDelete(filePath: string, summary?: string): void {
    this.recordEdit(filePath, {
      type: "delete",
      summary: summary ?? `Deleted ${filePath}`,
    });
  }

  /** Record a file rename. */
  recordRename(oldPath: string, newPath: string): void {
    // Remove old entry, add new
    this.files.delete(oldPath);
    this.recordEdit(newPath, {
      type: "rename",
      summary: `Renamed from ${oldPath}`,
    });
  }

  // ── Queries ────────────────────────────────────────────────────────────

  /** Get edit info for a specific file, or null if not tracked. */
  getFileEdit(filePath: string): FileEdit | null {
    return this.files.get(filePath) ?? null;
  }

  /** Get all tracked file paths. */
  getTrackedFiles(): string[] {
    return [...this.files.keys()];
  }

  /** Get total number of tracked files. */
  get fileCount(): number {
    return this.files.size;
  }

  /** Check if any files have been modified this session. */
  get hasEdits(): boolean {
    return this.files.size > 0;
  }

  // ── Summary Generation ─────────────────────────────────────────────────

  /**
   * Generate a human-readable summary of all file edits.
   * This is designed to be injected into the system prompt after compaction,
   * so the agent retains knowledge of what it modified.
   */
  getEditSummary(): string {
    if (this.files.size === 0) return "";

    const lines: string[] = ["Files modified during this session:"];

    // Group by edit type
    const created: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];

    for (const [path, edit] of this.files) {
      const countSuffix = edit.editCount > 1 ? ` (${edit.editCount} edits)` : "";
      switch (edit.type) {
        case "create":
          created.push(` + ${path}${countSuffix}: ${edit.summary}`);
          break;
        case "delete":
          deleted.push(` - ${path}: ${edit.summary}`);
          break;
        case "rename":
          modified.push(` → ${path}${countSuffix}: ${edit.summary}`);
          break;
        default:
          modified.push(` * ${path}${countSuffix}: ${edit.summary}`);
          break;
      }
    }

    if (created.length > 0) {
      lines.push("\nCreated:");
      lines.push(...created);
    }
    if (modified.length > 0) {
      lines.push("\nModified:");
      lines.push(...modified);
    }
    if (deleted.length > 0) {
      lines.push("\nDeleted:");
      lines.push(...deleted);
    }

    return lines.join("\n");
  }

  /**
   * Compact summary — shorter version for tight context budgets.
   * Just lists file paths without summaries.
   */
  getCompactSummary(): string {
    if (this.files.size === 0) return "";

    const paths = [...this.files.keys()].sort();
    return `Files touched this session: ${paths.join(", ")}`;
  }

  // ── Persistence ────────────────────────────────────────────────────────

  /** Save tracker state for persistence across compaction. */
  save(): ContentReplacementSnapshot {
    const files: Record<string, FileEdit> = {};
    for (const [path, edit] of this.files) {
      files[path] = { ...edit };
    }
    return { files, savedAt: new Date().toISOString() };
  }

  /** Restore from a saved snapshot. */
  static restore(snapshot: ContentReplacementSnapshot): ContentReplacementTracker {
    // Validate snapshot keys against prototype-polluting strings.
    // If the snapshot was deserialized from untrusted JSON, a key like "__proto__"
    // could cause Object.prototype pollution via the spread { ...edit }. A Map
    // stores "__proto__" as a normal key, but we sanity-check anyway to prevent
    // future regressions if the storage layer changes.
    const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
    const tracker = new ContentReplacementTracker();
    for (const [path, edit] of Object.entries(snapshot.files)) {
      if (DANGEROUS_KEYS.has(path)) {
        console.warn(
          `[yaaf/contentReplacement] restore(): ignoring dangerous key "${path}" in snapshot.`,
        );
        continue;
      }
      tracker.files.set(path, { ...edit });
    }
    return tracker;
  }

  /** Clear all tracked edits. */
  reset(): void {
    this.files.clear();
  }
}
