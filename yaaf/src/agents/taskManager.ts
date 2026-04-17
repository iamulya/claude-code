/**
 * Task Manager
 *
 * for tracking background work (agent runs, shell commands, workflows).
 *
 * Design rationale:
 * Each task has:
 * - A unique ID with a type prefix (b=bash, a=agent, t=teammate, w=workflow)
 * - A lifecycle: pending → running → completed | failed | killed
 * - An AbortController for cancellation
 * - Duration tracking with pause support
 *
 * Tasks are stored in the central state store (AppState.tasks) so any
 * component can observe their status. Terminal tasks (completed/failed/killed)
 * are evicted after a display timeout to keep the state clean.
 */

import { randomBytes } from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export type TaskType = "agent" | "bash" | "teammate" | "workflow" | "monitor" | "custom";

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "killed";

export type TaskState = {
  /** Unique task ID (e.g., "a3x7k9m2") */
  id: string;
  /** Task type */
  type: TaskType;
  /** Current lifecycle status */
  status: TaskStatus;
  /** Human-readable description */
  description: string;
  /** When the task was created */
  startTime: number;
  /** When the task reached a terminal state */
  endTime?: number;
  /** Total time spent paused (for accurate elapsed time) */
  totalPausedMs?: number;
  /** Whether the leader/UI has been notified of completion */
  notified: boolean;
  /** Abort controller for cancellation */
  abortController?: AbortController;
  /** Optional error message on failure */
  error?: string;
  /** Custom metadata bag */
  metadata?: Record<string, unknown>;
};

// ── Constants ────────────────────────────────────────────────────────────────

const TASK_ID_PREFIXES: Record<TaskType, string> = {
  agent: "a",
  bash: "b",
  teammate: "t",
  workflow: "w",
  monitor: "m",
  custom: "x",
};

// Case-insensitive-safe alphabet (digits + lowercase)
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** Duration to keep terminal tasks in state for UI display (5 seconds) */
export const TERMINAL_DISPLAY_MS = 5_000;

// ── Task Manager ─────────────────────────────────────────────────────────────

/**
 * Manages task lifecycle, creation, and cleanup.
 *
 * @example
 * ```ts
 * const tm = new TaskManager();
 *
 * // Create a task
 * const task = tm.create('agent', 'Research user query');
 *
 * // Start it
 * tm.transition(task.id, 'running');
 *
 * // Track progress
 * console.log(tm.getElapsedMs(task.id)); // elapsed time
 *
 * // Complete it
 * tm.transition(task.id, 'completed');
 *
 * // After TERMINAL_DISPLAY_MS, evict
 * tm.evictTerminal();
 * ```
 */
export class TaskManager {
  private tasks = new Map<string, TaskState>();
  private onChange?: (tasks: Map<string, TaskState>) => void;

  constructor(onChange?: (tasks: Map<string, TaskState>) => void) {
    this.onChange = onChange;
  }

  /** Generate a unique task ID with type prefix */
  private generateId(type: TaskType): string {
    const prefix = TASK_ID_PREFIXES[type] ?? "x";
    const bytes = randomBytes(8);
    let id = prefix;
    for (let i = 0; i < 8; i++) {
      id += ALPHABET[bytes[i]! % ALPHABET.length];
    }
    return id;
  }

  /** Notify listeners of state change */
  private notify(): void {
    this.onChange?.(new Map(this.tasks));
  }

  /** Create a new task in 'pending' status */
  create(type: TaskType, description: string, metadata?: Record<string, unknown>): TaskState {
    const id = this.generateId(type);
    const task: TaskState = {
      id,
      type,
      status: "pending",
      description,
      startTime: Date.now(),
      notified: false,
      abortController: new AbortController(),
      metadata,
    };
    this.tasks.set(id, task);
    this.notify();
    return task;
  }

  /** Get a task by ID */
  get(id: string): TaskState | undefined {
    return this.tasks.get(id);
  }

  /** Get all tasks */
  getAll(): TaskState[] {
    return [...this.tasks.values()];
  }

  /** Get tasks by type */
  getByType(type: TaskType): TaskState[] {
    return this.getAll().filter((t) => t.type === type);
  }

  /** Get tasks by status */
  getByStatus(status: TaskStatus): TaskState[] {
    return this.getAll().filter((t) => t.status === status);
  }

  /** Transition a task to a new status */
  transition(id: string, status: TaskStatus, error?: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    const updated: TaskState = {
      ...task,
      status,
      ...(isTerminal(status) ? { endTime: Date.now() } : {}),
      ...(error ? { error } : {}),
    };

    this.tasks.set(id, updated);
    this.notify();
    return true;
  }

  /** Kill a task (abort + transition to 'killed') */
  kill(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task || isTerminal(task.status)) return false;

    task.abortController?.abort();
    return this.transition(id, "killed");
  }

  /** Mark a task as notified (leader/UI has been informed) */
  markNotified(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      this.tasks.set(id, { ...task, notified: true });
    }
  }

  /** Get elapsed time for a task (accounting for pauses) */
  getElapsedMs(id: string): number {
    const task = this.tasks.get(id);
    if (!task) return 0;

    const endTime = task.endTime ?? Date.now();
    return endTime - task.startTime - (task.totalPausedMs ?? 0);
  }

  /** Remove terminal tasks older than TERMINAL_DISPLAY_MS */
  evictTerminal(): number {
    const now = Date.now();
    let evicted = 0;

    for (const [id, task] of this.tasks) {
      if (isTerminal(task.status) && task.endTime && now - task.endTime > TERMINAL_DISPLAY_MS) {
        // Clean up abort controller reference
        this.tasks.delete(id);
        evicted++;
      }
    }

    if (evicted > 0) this.notify();
    return evicted;
  }

  /** Remove a specific task */
  remove(id: string): boolean {
    const removed = this.tasks.delete(id);
    if (removed) this.notify();
    return removed;
  }

  /** Clear all tasks */
  clear(): void {
    this.tasks.clear();
    this.notify();
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Check if a status is terminal (will not transition further) */
export function isTerminal(status: TaskStatus): boolean {
  return status === "completed" || status === "failed" || status === "killed";
}
