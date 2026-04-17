/**
 * Streaming Tool Executor — Concurrent tool execution with ordering guarantees
 *
 * Inspired by the main repo's `StreamingToolExecutor.ts` (532 LoC). Executes
 * tools as they arrive from the streaming LLM response:
 *
 * - **Concurrency-safe tools** (`isConcurrencySafe = true`) run in parallel
 * - **Non-concurrent tools** get exclusive access (no other tools run simultaneously)
 * - **Results are yielded in order** even when tools finish out-of-order
 * - **Sibling abort** — if a tool errors, parallel siblings are cancelled
 * - **Progress messages** — tools can yield incremental updates
 *
 * @module agents/streamingExecutor
 */

import { findToolByName, type Tool, type ToolContext } from "../tools/tool.js";
import type { PermissionPolicy } from "../permissions.js";
import type { Sandbox } from "../sandbox.js";
import type { Hooks } from "../hooks.js";
import type { AccessPolicy, UserContext, DataScope } from "../iam/types.js";
import {
  dispatchBeforeToolCall,
  dispatchAfterToolCall,
  type HookEventCallbacks,
} from "../hooks.js";
import {
  startToolCallSpan,
  endToolCallSpan,
  startToolExecutionSpan,
  endToolExecutionSpan,
} from "../telemetry/tracing.js";
import type { ToolCall, ChatMessage } from "./runner.js";

// ── Types ────────────────────────────────────────────────────────────────────

type ToolStatus = "queued" | "executing" | "completed" | "yielded";

type TrackedTool = {
  id: string;
  call: ToolCall;
  status: ToolStatus;
  isConcurrencySafe: boolean;
  promise?: Promise<void>;
  result?: ToolExecutionResult;
  /** Cached parsed args to avoid redundant JSON.parse */
  parsedArgs: Record<string, unknown>;
};

export type ToolExecutionResult = {
  toolCallId: string;
  name: string;
  content: string;
  error?: boolean;
  durationMs: number;
};

// ── StreamingToolExecutor ────────────────────────────────────────────────────

export class StreamingToolExecutor {
  private readonly tracked: TrackedTool[] = [];
  private hasErrored = false;
  private discarded = false;
  /** Child abort controller — fires when a tool errors to cancel siblings */
  private readonly siblingAbort: AbortController;

  constructor(
    private readonly tools: readonly Tool[],
    private readonly toolContext: ToolContext,
    private readonly config: {
      permissions?: PermissionPolicy;
      accessPolicy?: AccessPolicy;
      user?: UserContext;
      hooks?: Hooks;
      sandbox?: Sandbox;
      messages: ChatMessage[];
      signal?: AbortSignal;
      hookCallbacks?: HookEventCallbacks;
      toolResultBoundaries?: boolean;
      /**
       * The outer agent-loop iteration index, for hooks that
       * implement per-iteration logic. Pass -1 (default) when unavailable
       * (e.g., called outside a loop context) so hooks can use -1 as a
       * sentinel meaning "iteration context not available".
       */
      iteration?: number;
    },
  ) {
    this.siblingAbort = new AbortController();
    // If the parent signal aborts, abort siblings too
    config.signal?.addEventListener("abort", () => this.siblingAbort.abort(), { once: true });
  }

  /**
   * Discard all pending tools. Called on streaming fallback.
   */
  discard(): void {
    this.discarded = true;
    this.siblingAbort.abort();
  }

  /**
   * Add a tool call to the execution queue. Starts immediately if conditions allow.
   */
  addTool(call: ToolCall): void {
    if (this.discarded) return;

    const tool = findToolByName(this.tools, call.name);
    let parsedArgs: Record<string, unknown>;
    try {
      parsedArgs = JSON.parse(call.arguments);
    } catch {
      // surface the malformed args error instead of silently converting to {}
      parsedArgs = {
        __parse_error__: `Malformed JSON arguments from LLM: ${call.arguments.slice(0, 200)}`,
      };
    }

    const isConcurrencySafe = tool
      ? (() => {
          try {
            return tool.isConcurrencySafe(parsedArgs);
          } catch {
            return false;
          }
        })()
      : false;

    this.tracked.push({
      id: call.id,
      call,
      status: "queued",
      isConcurrencySafe,
      // Cache parsed args to avoid redundant JSON.parse in collectResult
      parsedArgs,
    });

    // Attach .catch() so any uncaught processQueue exception aborts
    // siblings instead of silently hanging getAllResults() forever.
    this._enqueueProcess();
  }

  /**
   * Check if a tool can execute based on current concurrency state.
   */
  private canExecute(isConcurrencySafe: boolean): boolean {
    const executing = this.tracked.filter((t) => t.status === "executing");
    return (
      executing.length === 0 || (isConcurrencySafe && executing.every((t) => t.isConcurrencySafe))
    );
  }

  /**
   * Safe wrapper around processQueue() that catches exceptions and
   * aborts siblings so getAllResults() is never permanently hung.
   */
  private _enqueueProcess(): void {
    void this.processQueue().catch((err) => {
      this.hasErrored = true;
      this.siblingAbort.abort(
        `processQueue error: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  }

  /**
   * Process the queue, starting tools when concurrency allows.
   */
  private async processQueue(): Promise<void> {
    for (const tracked of this.tracked) {
      if (tracked.status !== "queued") continue;
      if (this.discarded) return;

      if (this.canExecute(tracked.isConcurrencySafe)) {
        await this.executeTool(tracked);
      } else if (!tracked.isConcurrencySafe) {
        // Non-concurrent tool must wait for exclusive access
        break;
      }
    }
  }

  /**
   * Execute a single tool call.
   */
  private async executeTool(tracked: TrackedTool): Promise<void> {
    tracked.status = "executing";
    const startTime = Date.now();

    const collectResult = async (): Promise<void> => {
      // Check if aborted before executing
      if (this.hasErrored || this.siblingAbort.signal.aborted || this.discarded) {
        tracked.result = {
          toolCallId: tracked.call.id,
          name: tracked.call.name,
          content: JSON.stringify({ error: "Cancelled: sibling tool errored or user interrupted" }),
          error: true,
          durationMs: 0,
        };
        tracked.status = "completed";
        return;
      }

      // Reuse parsed args from addTool instead of repeated JSON.parse
      const parsedArgs = { ...tracked.parsedArgs };

      // ── Permission check ──────────────────────────────────────────────
      const toolSpan = startToolCallSpan({ toolName: tracked.call.name, args: parsedArgs });

      if (this.config.permissions) {
        const outcome = await this.config.permissions.evaluate(tracked.call.name, parsedArgs);
        if (outcome.action === "deny") {
          endToolCallSpan({ blocked: true, blockReason: outcome.reason, durationMs: 0 });
          tracked.result = {
            toolCallId: tracked.call.id,
            name: tracked.call.name,
            content: JSON.stringify({ error: `Permission denied: ${outcome.reason}` }),
            error: true,
            durationMs: 0,
          };
          tracked.status = "completed";
          return;
        }
      }

      // ── IAM authorization check (identity-aware) ──────────────────────
      // Fail closed — when an accessPolicy is configured but no user
      // context is available, deny the call. Previously this was silently skipped,
      // meaning a misconfigured endpoint would expose all tools without auth.
      if (this.config.accessPolicy?.authorization) {
        if (!this.config.user) {
          endToolCallSpan({
            blocked: true,
            blockReason: "No user context provided",
            durationMs: 0,
          });
          tracked.result = {
            toolCallId: tracked.call.id,
            name: tracked.call.name,
            content: JSON.stringify({
              error:
                "Access denied: No user context provided. IAM policy requires authenticated user.",
            }),
            error: true,
            durationMs: 0,
          };
          tracked.status = "completed";
          return;
        }

        const startMs = Date.now();
        const decision = await this.config.accessPolicy.authorization.evaluate({
          user: this.config.user,
          toolName: tracked.call.name,
          arguments: parsedArgs,
        });

        // Audit callback
        this.config.accessPolicy.onDecision?.({
          user: this.config.user,
          toolName: tracked.call.name,
          arguments: parsedArgs,
          decision,
          timestamp: new Date(),
          durationMs: Date.now() - startMs,
        });

        if (decision.action === "deny") {
          endToolCallSpan({ blocked: true, blockReason: decision.reason, durationMs: 0 });
          tracked.result = {
            toolCallId: tracked.call.id,
            name: tracked.call.name,
            content: JSON.stringify({ error: `Access denied: ${decision.reason}` }),
            error: true,
            durationMs: 0,
          };
          tracked.status = "completed";
          return;
        }
      }

      // ── IAM data scoping ───────────────────────────────────────────────
      let resolvedScope: DataScope | undefined;
      if (this.config.accessPolicy?.dataScope && this.config.user) {
        resolvedScope = await this.config.accessPolicy.dataScope.resolve({
          user: this.config.user,
          toolName: tracked.call.name,
          arguments: parsedArgs,
        });
      }

      // ── beforeToolCall hook ───────────────────────────────────────────
      // Use the iteration supplied by the outer agent loop.
      // -1 is a sentinel meaning "iteration context not available" so that
      // hooks can distinguish "called from streaming executor" from "iteration 0".
      const hookCtx = {
        toolName: tracked.call.name,
        arguments: parsedArgs,
        messages: this.config.messages as readonly ChatMessage[],
        iteration: this.config.iteration ?? -1,
      };

      const beforeResult = await dispatchBeforeToolCall(
        this.config.hooks,
        hookCtx,
        this.config.hookCallbacks,
      );
      if (beforeResult.action === "block") {
        endToolCallSpan({ blocked: true, blockReason: beforeResult.reason, durationMs: 0 });
        tracked.result = {
          toolCallId: tracked.call.id,
          name: tracked.call.name,
          content: JSON.stringify({ error: `Blocked by hook: ${beforeResult.reason}` }),
          error: true,
          durationMs: 0,
        };
        tracked.status = "completed";
        return;
      }

      const effectiveArgs = beforeResult.action === "modify" ? beforeResult.arguments : parsedArgs;

      // ── Tool execution ────────────────────────────────────────────────
      const tool = findToolByName(this.tools, tracked.call.name);
      let toolResultStr: string;

      try {
        if (!tool) {
          toolResultStr = JSON.stringify({ error: `Unknown tool: ${tracked.call.name}` });
        } else {
          // Input validation (Gap #9)
          if (tool.validateInput) {
            const validation = await tool.validateInput(effectiveArgs, this.toolContext);
            if (!validation.valid) {
              toolResultStr = JSON.stringify({
                error: `Invalid input: ${validation.message}`,
              });
              const durationMs = Date.now() - startTime;
              endToolCallSpan({ error: `Validation failed: ${validation.message}`, durationMs });
              tracked.result = {
                toolCallId: tracked.call.id,
                name: tracked.call.name,
                content: toolResultStr,
                error: true,
                durationMs,
              };
              tracked.status = "completed";
              await dispatchAfterToolCall(
                this.config.hooks,
                hookCtx,
                undefined,
                new Error(validation.message),
                this.config.hookCallbacks,
              );
              return;
            }
          }

          const ctx: ToolContext = {
            ...this.toolContext,
            signal: this.siblingAbort.signal,
            messages: this.config.messages.map((m) => ({
              role: m.role,
              content: "content" in m ? m.content : "",
            })),
            // IAM: inject user context and resolved scope into tools
            extra: {
              ...this.toolContext.extra,
              ...(this.config.user ? { user: this.config.user } : {}),
              ...(resolvedScope ? { scope: resolvedScope } : {}),
              ...(this.config.user?.credentials
                ? { credentials: this.config.user.credentials }
                : {}),
            },
          };

          const execSpan = startToolExecutionSpan();

          let rawResult: unknown;
          if (this.config.sandbox) {
            try {
              const sandboxed = await this.config.sandbox.execute(
                tracked.call.name,
                effectiveArgs,
                async (args) => tool.call(args, ctx),
              );
              rawResult = sandboxed.value;
              endToolExecutionSpan(execSpan, { durationMs: sandboxed.durationMs });
            } catch (err) {
              endToolExecutionSpan(execSpan, {
                error: err instanceof Error ? err.message : String(err),
              });
              throw err;
            }
          } else {
            try {
              rawResult = await tool.call(effectiveArgs, ctx);
              endToolExecutionSpan(execSpan);
            } catch (err) {
              endToolExecutionSpan(execSpan, {
                error: err instanceof Error ? err.message : String(err),
              });
              throw err;
            }
          }

          // Handle both ToolResult<T> = { data: T } shape and plain string/object returns.
          // Tools should return { data: value } per the API contract, but we gracefully
          // handle plain strings and other shapes to avoid confusing runtime crashes.
          let rawData: unknown;
          if (typeof rawResult === "string") {
            rawData = rawResult;
          } else if (rawResult !== null && typeof rawResult === "object" && "data" in rawResult) {
            rawData = (rawResult as { data: unknown }).data;
          } else {
            rawData = rawResult;
          }
          toolResultStr =
            typeof rawData === "string"
              ? rawData
              : rawData === undefined || rawData === null
                ? ""
                : (JSON.stringify(rawData, null, 2) ?? String(rawData));

          // Truncate if needed
          if (tool.maxResultChars > 0 && toolResultStr.length > tool.maxResultChars) {
            toolResultStr =
              toolResultStr.slice(0, tool.maxResultChars) +
              `\n... [truncated, ${toolResultStr.length} chars total]`;
          }

          // Wrap in safe boundaries for indirect injection defense
          if (this.config.toolResultBoundaries) {
            const safeName = tracked.call.name.replace(/[\[\]]/g, "_");
            const safeContent = toolResultStr.replace(/\[\/TOOL_OUTPUT\]/g, "[/TOOL\\_OUTPUT]");
            toolResultStr = `[TOOL_OUTPUT:${safeName}]\n${safeContent}\n[/TOOL_OUTPUT]`;
          }
        }

        const durationMs = Date.now() - startTime;
        endToolCallSpan({ durationMs });
        await dispatchAfterToolCall(
          this.config.hooks,
          hookCtx,
          toolResultStr,
          undefined,
          this.config.hookCallbacks,
        );

        tracked.result = {
          toolCallId: tracked.call.id,
          name: tracked.call.name,
          content: toolResultStr,
          durationMs,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        toolResultStr = JSON.stringify({ error: errorMsg });
        const durationMs = Date.now() - startTime;
        endToolCallSpan({ error: errorMsg });

        // only abort siblings for non-read-only tool errors.
        // Read-only tool failures (ENOENT, grep no-match) should not cancel
        // concurrent siblings since their results are still valuable.
        const failedTool = findToolByName(this.tools, tracked.call.name);
        const isReadOnly = failedTool
          ? (() => {
              try {
                return failedTool.isReadOnly(parsedArgs);
              } catch {
                return false;
              }
            })()
          : false;
        if (!isReadOnly) {
          this.hasErrored = true;
          this.siblingAbort.abort("sibling_error");
        }

        await dispatchAfterToolCall(
          this.config.hooks,
          hookCtx,
          undefined,
          err instanceof Error ? err : new Error(errorMsg),
          this.config.hookCallbacks,
        );

        tracked.result = {
          toolCallId: tracked.call.id,
          name: tracked.call.name,
          content: toolResultStr,
          error: true,
          durationMs,
        };
      }

      tracked.status = "completed";
    };

    const promise = collectResult();
    tracked.promise = promise;

    // Use safe wrapper so processQueue errors don't hang getAllResults()
    void promise.finally(() => {
      this._enqueueProcess();
    });
  }

  /**
   * Yield completed results in order (non-blocking).
   */
  *getCompletedResults(): Generator<ToolExecutionResult, void> {
    if (this.discarded) return;

    for (const tracked of this.tracked) {
      if (tracked.status === "yielded") continue;

      if (tracked.status === "completed" && tracked.result) {
        tracked.status = "yielded";
        yield tracked.result;
      } else if (tracked.status === "executing" && !tracked.isConcurrencySafe) {
        // Non-concurrent tool is still executing — must maintain order
        break;
      }
    }
  }

  /**
   * Wait for all tools to complete and yield results in order.
   */
  async *getAllResults(): AsyncGenerator<ToolExecutionResult, void> {
    if (this.discarded) return;

    while (this.tracked.some((t) => t.status !== "yielded")) {
      // Yield any completed results
      for (const result of this.getCompletedResults()) {
        yield result;
      }

      // Wait for an executing tool to finish
      const executing = this.tracked.filter((t) => t.status === "executing" && t.promise);
      if (executing.length > 0) {
        await Promise.race(executing.map((t) => t.promise!));
      } else {
        // Process queue (may start new tools)
        await this.processQueue();
        // If nothing is executing and nothing is queued, we're done
        if (!this.tracked.some((t) => t.status === "executing" || t.status === "queued")) {
          break;
        }
      }
    }

    // Final yield of any remaining results
    for (const result of this.getCompletedResults()) {
      yield result;
    }
  }

  /** Check if there are any unfinished tools */
  get hasUnfinished(): boolean {
    return this.tracked.some((t) => t.status !== "yielded");
  }
}
