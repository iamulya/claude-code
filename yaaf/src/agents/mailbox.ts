/**
 * Agent Mailbox — File-based IPC for multi-agent swarms
 *
 * messaging system that enables agents to communicate without shared memory.
 *
 * Design rationale:
 * 1. **In-process** — agents in the same Node.js process (AsyncLocalStorage isolation)
 * 2. **Multi-process** — agents in separate tmux panes
 *
 * Both modes use the same mailbox protocol for communication. File-based
 * messaging was chosen because:
 * - Works across process boundaries (tmux panes, separate machines)
 * - Survives agent restarts (messages persist on disk)
 * - No need for a message broker or shared server
 * - Simple lock-based concurrency (proper-lockfile with retry)
 *
 * Each agent has an inbox file: `{baseDir}/{teamName}/inboxes/{agentName}.json`
 * Messages are appended to the inbox array. The recipient polls for unread
 * messages.
 */

import { readFile, writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

// ── Types ────────────────────────────────────────────────────────────────────

export type MailboxMessage = {
  /** Sender agent name */
  from: string;
  /** Message content (text or JSON-serialized structured message) */
  text: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Whether the recipient has read this message */
  read: boolean;
  /** Optional sender color for UI display */
  color?: string;
  /** Optional short summary for preview */
  summary?: string;
};

export type MailboxConfig = {
  /** Base directory for all team mailboxes */
  baseDir: string;
  /** Default team name (used when team isn't specified) */
  defaultTeam?: string;
  /** Polling interval in ms (default: 500) */
  pollIntervalMs?: number;
};

// ── Structured Message Types ─────────────────────────────────────────────────

export type IdleNotification = {
  type: "idle_notification";
  from: string;
  timestamp: string;
  idleReason?: "available" | "interrupted" | "failed";
  summary?: string;
  completedTaskId?: string;
  completedStatus?: "resolved" | "blocked" | "failed";
  failureReason?: string;
};

export type ShutdownRequest = {
  type: "shutdown_request";
  requestId: string;
  from: string;
  reason?: string;
  timestamp: string;
};

export type PermissionRequest = {
  type: "permission_request";
  requestId: string;
  agentId: string;
  toolName: string;
  toolUseId: string;
  description: string;
  input: Record<string, unknown>;
};

export type PermissionResponse = {
  type: "permission_response";
  requestId: string;
  subtype: "success" | "error";
  error?: string;
  updatedInput?: Record<string, unknown>;
};

// ── File Lock (simple implementation) ────────────────────────────────────────

/**
 * Validate agent and team names are safe for use as path segments.
 * Rejects any name containing characters outside [a-zA-Z0-9_-] to prevent
 * path traversal via agent identity fields.
 */
function validateMailboxName(name: string, label: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error(
      `Invalid ${label} "${name}": must contain only letters, digits, hyphens, and underscores`,
    );
  }
}

/**
 * Simple file-based lock using mkdir atomicity.
 * For production use, consider replacing with `proper-lockfile`.
 */
async function withFileLock<T>(
  lockPath: string,
  fn: () => Promise<T>,
  maxRetries = 10,
  retryDelayMs = 50,
): Promise<T> {
  let retries = 0;

  while (true) {
    try {
      await mkdir(lockPath, { recursive: false });
      // Successfully acquired the lock
      break;
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        "code" in err &&
        (err as NodeJS.ErrnoException).code === "EEXIST"
      ) {
        retries++;
        if (retries > maxRetries) {
          // Force-break stale lock then retry mkdir once rather than
          // assuming ownership. Two concurrent waiters both hitting maxRetries
          // would otherwise both set acquired=true and execute fn() in parallel.
          // Use recursive:true so the directory is removed even on macOS.
          try {
            await rm(lockPath, { recursive: true, force: true });
          } catch {
            /* ignore */
          }
          // One final acquisition attempt — if this also fails, throw.
          try {
            await mkdir(lockPath, { recursive: false });
            break; // acquired
          } catch {
            throw new Error(`Failed to acquire file lock after ${maxRetries} retries: ${lockPath}`);
          }
        } else {
          await new Promise((r) => setTimeout(r, retryDelayMs * (1 + Math.random())));
        }
      } else {
        throw err;
      }
    }
  }

  try {
    return await fn();
  } finally {
    // Use recursive:true so the lock directory is removed on all platforms
    try {
      await rm(lockPath, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

// ── Mailbox ──────────────────────────────────────────────────────────────────

/**
 * File-based agent mailbox system.
 *
 * @example
 * ```ts
 * const mailbox = new Mailbox({ baseDir: '/tmp/agent-teams' });
 *
 * // Agent "researcher" sends to "coordinator"
 * await mailbox.send('coordinator', {
 * from: 'researcher',
 * text: 'Found 3 relevant papers on RAG optimization',
 * summary: 'RAG papers found',
 * }, 'my-team');
 *
 * // Coordinator reads their inbox
 * const unread = await mailbox.readUnread('coordinator', 'my-team');
 * for (const msg of unread) {
 * console.log(`${msg.from}: ${msg.text}`);
 * }
 *
 * // Mark all as read
 * await mailbox.markAllRead('coordinator', 'my-team');
 * ```
 */
export class Mailbox {
  private readonly config: Required<MailboxConfig> & { maxMessages: number };

  constructor(config: MailboxConfig & { maxMessages?: number }) {
    this.config = {
      baseDir: config.baseDir,
      defaultTeam: config.defaultTeam ?? "default",
      pollIntervalMs: config.pollIntervalMs ?? 500,
      // Cap inbox size to prevent unbounded disk growth
      maxMessages: config.maxMessages ?? 1000,
    };
  }

  /** Get the path to an agent's inbox file */
  private inboxPath(agentName: string, teamName?: string): string {
    const team = teamName ?? this.config.defaultTeam;
    // Validate before using as path segments
    validateMailboxName(agentName, "agentName");
    validateMailboxName(team, "teamName");
    return join(this.config.baseDir, team, "inboxes", `${agentName}.json`);
  }

  /** Get the lock path for an inbox */
  private lockPath(inboxPath: string): string {
    return `${inboxPath}.lock`;
  }

  /** Ensure the inbox directory exists */
  private async ensureDir(teamName?: string): Promise<void> {
    const team = teamName ?? this.config.defaultTeam;
    await mkdir(join(this.config.baseDir, team, "inboxes"), {
      recursive: true,
    });
  }

  /** Read all messages from an agent's inbox */
  async readAll(agentName: string, teamName?: string): Promise<MailboxMessage[]> {
    const path = this.inboxPath(agentName, teamName);
    try {
      const content = await readFile(path, "utf-8");
      return JSON.parse(content) as MailboxMessage[];
    } catch {
      return [];
    }
  }

  /** Read only unread messages */
  async readUnread(agentName: string, teamName?: string): Promise<MailboxMessage[]> {
    const all = await this.readAll(agentName, teamName);
    return all.filter((m) => !m.read);
  }

  /** Send a message to an agent's inbox */
  async send(
    recipientName: string,
    message: Omit<MailboxMessage, "read" | "timestamp"> & {
      timestamp?: string;
    },
    teamName?: string,
  ): Promise<void> {
    await this.ensureDir(teamName);
    const path = this.inboxPath(recipientName, teamName);

    // Ensure inbox file exists
    try {
      await writeFile(path, "[]", { encoding: "utf-8", flag: "wx" });
    } catch (err: unknown) {
      if (
        !(err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "EEXIST")
      ) {
        throw err;
      }
    }

    await withFileLock(this.lockPath(path), async () => {
      const messages = await this.readAll(recipientName, teamName);
      messages.push({
        ...message,
        timestamp: message.timestamp ?? new Date().toISOString(),
        read: false,
      });
      // Trim oldest messages when inbox exceeds maxMessages to
      // prevent unbounded disk growth from misbehaving agents.
      const trimmed =
        messages.length > this.config.maxMessages
          ? messages.slice(messages.length - this.config.maxMessages)
          : messages;
      await writeFile(path, JSON.stringify(trimmed, null, 2), "utf-8");
    });
  }

  /** Mark a specific message as read by index */
  async markRead(agentName: string, messageIndex: number, teamName?: string): Promise<void> {
    const path = this.inboxPath(agentName, teamName);

    await withFileLock(this.lockPath(path), async () => {
      const messages = await this.readAll(agentName, teamName);
      if (messageIndex >= 0 && messageIndex < messages.length) {
        messages[messageIndex] = { ...messages[messageIndex]!, read: true };
        await writeFile(path, JSON.stringify(messages, null, 2), "utf-8");
      }
    });
  }

  /** Mark all messages as read */
  async markAllRead(agentName: string, teamName?: string): Promise<void> {
    const path = this.inboxPath(agentName, teamName);

    await withFileLock(this.lockPath(path), async () => {
      const messages = await this.readAll(agentName, teamName);
      for (const m of messages) m.read = true;
      await writeFile(path, JSON.stringify(messages, null, 2), "utf-8");
    });
  }

  /** Clear all messages from an inbox */
  async clear(agentName: string, teamName?: string): Promise<void> {
    const path = this.inboxPath(agentName, teamName);
    try {
      await writeFile(path, "[]", "utf-8");
    } catch {
      /* inbox may not exist */
    }
  }

  /**
   * Poll an inbox until a message matching the predicate arrives.
   * Returns the matching message and its index.
   */
  async waitForMessage(
    agentName: string,
    predicate: (msg: MailboxMessage) => boolean,
    teamName?: string,
    signal?: AbortSignal,
  ): Promise<{ message: MailboxMessage; index: number } | null> {
    while (!signal?.aborted) {
      const messages = await this.readAll(agentName, teamName);
      for (let i = 0; i < messages.length; i++) {
        if (!messages[i]!.read && predicate(messages[i]!)) {
          return { message: messages[i]!, index: i };
        }
      }
      await new Promise((r) => setTimeout(r, this.config.pollIntervalMs));
    }
    return null;
  }

  // ── Structured Message Helpers ─────────────────────────────────────────

  /** Send an idle notification to the team leader */
  async sendIdleNotification(
    leaderName: string,
    agentName: string,
    teamName?: string,
    options?: Partial<IdleNotification>,
  ): Promise<void> {
    const notification: IdleNotification = {
      type: "idle_notification",
      from: agentName,
      timestamp: new Date().toISOString(),
      ...options,
    };
    await this.send(leaderName, { from: agentName, text: JSON.stringify(notification) }, teamName);
  }

  /** Parse a structured message from raw text */
  static parseStructuredMessage(
    text: string,
  ): IdleNotification | ShutdownRequest | PermissionRequest | PermissionResponse | null {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.type === "string") {
        return parsed;
      }
    } catch {
      /* not structured */
    }
    return null;
  }
}
