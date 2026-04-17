/**
 * Async Approvals — User-in-the-loop permission requests over channels.
 *
 * Extends YAAF's synchronous PermissionPolicy with async approval flows
 * where the agent asks the user (via WhatsApp, Telegram, etc.) before
 * running dangerous operations, and waits for their response.
 *
 * Inspired by OpenClaw's exec approval system.
 *
 * @example
 * ```ts
 * const approvals = new ApprovalManager({
 * requestApproval: async (request) => {
 * // Send to user via Telegram
 * await telegram.send(`⚠️ ${request.tool} wants to run:\n${request.description}\n\nReply "yes" or "no"`);
 * // Wait for user response (up to 5 min)
 * const response = await telegram.waitForReply(300_000);
 * return response.text.toLowerCase().includes('yes') ? 'approved' : 'denied';
 * },
 * });
 *
 * // Use in AgentRunner config
 * const runner = new AgentRunner({
 * ...config,
 * permissions: approvals.asPermissionPolicy(),
 * });
 * ```
 *
 * @module gateway/approvals
 */

import type { PermissionResult } from "../tools/tool.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type ApprovalRequest = {
  /** Tool requesting approval */
  tool: string;
  /** Human-readable description of what will happen */
  description: string;
  /** Risk level */
  risk: "low" | "medium" | "high" | "critical";
  /** The raw input arguments */
  args: Record<string, unknown>;
  /** Request timestamp */
  timestamp: number;
};

export type ApprovalDecision = "approved" | "denied" | "timeout";

export type ApprovalRecord = ApprovalRequest & {
  decision: ApprovalDecision;
  decidedAt: number;
  /** Duration in ms */
  durationMs: number;
};

export type ApprovalTransport = {
  /**
   * Send an approval request to the user and get their decision.
   * Must handle timeout internally (return 'timeout' if no response).
   */
  requestApproval(request: ApprovalRequest): Promise<ApprovalDecision>;
};

export type ApprovalManagerConfig = {
  /** Transport for sending approval requests (e.g., Telegram, Slack) */
  transport: ApprovalTransport;
  /**
   * Tools that always require approval, regardless of other policies.
   * Matches exact names or glob patterns.
   */
  alwaysRequire?: string[];
  /**
   * Tools that never require approval (bypass).
   * Matches exact names or glob patterns.
   */
  neverRequire?: string[];
  /**
   * Default risk level for tools not in explicit lists.
   * Default: 'medium'.
   */
  defaultRisk?: ApprovalRequest["risk"];
  /**
   * Auto-approve low-risk tools?
   * Default: false.
   */
  autoApproveLow?: boolean;
  /**
   * Maximum pending approvals. New requests are denied if exceeded.
   * Default: 5.
   */
  maxPending?: number;
};

// ── Manager ──────────────────────────────────────────────────────────────────

export class ApprovalManager {
  private readonly config: ApprovalManagerConfig;
  private history: ApprovalRecord[] = [];
  private pending = 0;
  /**
   * Maximum approval records to retain in memory.
   * The history array was previously unbounded — a long-lived manager accumulates
   * every approval including full tool args, causing steady memory growth.
   */
  private readonly maxHistory: number;

  constructor(config: ApprovalManagerConfig) {
    this.config = config;
    this.maxHistory =
      (config as ApprovalManagerConfig & { maxHistory?: number }).maxHistory ?? 1_000;
  }

  /**
   * Request approval for a tool invocation.
   */
  async requestApproval(
    toolName: string,
    description: string,
    args: Record<string, unknown> = {},
  ): Promise<ApprovalDecision> {
    // Check bypass list
    if (this.config.neverRequire?.some((p) => matchPattern(p, toolName))) {
      return "approved";
    }

    const risk = this.getRisk(toolName);

    // Auto-approve low risk if configured
    if (this.config.autoApproveLow && risk === "low") {
      return "approved";
    }

    // Check pending limit
    if (this.pending >= (this.config.maxPending ?? 5)) {
      return "denied";
    }

    const request: ApprovalRequest = {
      tool: toolName,
      description,
      risk,
      args,
      timestamp: Date.now(),
    };

    this.pending++;
    try {
      const decision = await this.config.transport.requestApproval(request);
      const record: ApprovalRecord = {
        ...request,
        decision,
        decidedAt: Date.now(),
        durationMs: Date.now() - request.timestamp,
      };
      // Evict oldest half when at capacity.
      if (this.history.length >= this.maxHistory) {
        this.history = this.history.slice(Math.floor(this.maxHistory / 2));
      }
      this.history.push(record);
      return decision;
    } finally {
      this.pending--;
    }
  }

  /**
   * Check if a tool requires approval.
   */
  requiresApproval(toolName: string): boolean {
    if (this.config.neverRequire?.some((p) => matchPattern(p, toolName))) {
      return false;
    }
    if (this.config.alwaysRequire?.some((p) => matchPattern(p, toolName))) {
      return true;
    }
    const risk = this.getRisk(toolName);
    if (this.config.autoApproveLow && risk === "low") return false;
    return true;
  }

  /**
   * Convert this approval manager into a YAAF PermissionPolicy.
   * Use this with AgentRunner's `permissions` config.
   */
  asPermissionPolicy(): {
    checkPermission(toolName: string, input: Record<string, unknown>): Promise<PermissionResult>;
  } {
    return {
      checkPermission: async (
        toolName: string,
        input: Record<string, unknown>,
      ): Promise<PermissionResult> => {
        if (!this.requiresApproval(toolName)) {
          return { behavior: "allow", updatedInput: input };
        }

        const description = `Tool "${toolName}" wants to execute with: ${JSON.stringify(input).slice(0, 200)}`;
        const decision = await this.requestApproval(toolName, description, input);

        if (decision === "approved") {
          return { behavior: "allow", updatedInput: input };
        }

        return {
          behavior: "deny",
          message:
            decision === "timeout"
              ? `Approval timed out for ${toolName}`
              : `User denied ${toolName}`,
        };
      },
    };
  }

  /** Get approval history. */
  getHistory(): readonly ApprovalRecord[] {
    return this.history;
  }

  /** Clear history. */
  clearHistory(): void {
    this.history = [];
  }

  private getRisk(toolName: string): ApprovalRequest["risk"] {
    if (this.config.alwaysRequire?.some((p) => matchPattern(p, toolName))) {
      return "high";
    }
    return this.config.defaultRisk ?? "medium";
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Simple glob-style pattern matching (supports * wildcard only) */
function matchPattern(pattern: string, value: string): boolean {
  if (pattern === value) return true;
  if (pattern === "*") return true;

  // Convert glob to regex
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(value);
}
