/**
 * RouterChatModel — two-tier model routing for cost optimization.
 *
 * Routes tool calls to a fast/cheap model for simple work and a capable/expensive
 * model for complex reasoning. At a ~10:1 cost ratio (e.g. Flash vs Pro),
 * this typically reduces costs 3-7× with negligible quality loss.
 *
 *
 * @example
 * ```ts
 * const model = new RouterChatModel({
 * fast: new GeminiChatModel({ model: 'gemini-2.0-flash' }),
 * capable: new GeminiChatModel({ model: 'gemini-2.0-pro' }),
 * });
 *
 * // Or with a custom routing function
 * const model = new RouterChatModel({
 * fast: openaiModel('gpt-4o-mini'),
 * capable: openaiModel('gpt-4o'),
 * route: ({ messages, tools }) => {
 * // Use capable model when: many tools, long context, or complex ask
 * if ((tools?.length ?? 0) > 5) return 'capable';
 * if (messages.length > 20) return 'capable';
 * const lastMsg = messages.at(-1)?.content ?? '';
 * if (/plan|architect|design|refactor/i.test(lastMsg)) return 'capable';
 * return 'fast';
 * },
 * });
 * ```
 */

import type { ChatModel, ChatMessage, ChatResult, ToolSchema } from "../agents/runner.js";

// ── Router config ─────────────────────────────────────────────────────────────

export type RouterContext = {
  messages: ChatMessage[];
  tools?: ToolSchema[];
  iteration: number;
};

export type RoutingDecision = "fast" | "capable";

export type RouterConfig = {
  /** Cheap, fast model — used for simple/short requests. */
  fast: ChatModel;
  /** Capable, slower model — used for complex/long requests. */
  capable: ChatModel;
  /**
   * Routing function. Called before every LLM call.
   * Return 'fast' to use the cheap model, 'capable' for the better one.
   *
   * Default heuristic:
   * - Use 'capable' if: tools > 5, messages > 12, or content contains
   * planning/architecture keywords.
   * - Otherwise: 'fast'.
   */
  route?: (ctx: RouterContext) => RoutingDecision | Promise<RoutingDecision>;
  /**
   * Optional callback for observability — called after each routing decision.
   */
  onRoute?: (decision: RoutingDecision, ctx: RouterContext) => void;
};

// ── Default routing heuristic ─────────────────────────────────────────────────

const COMPLEX_KEYWORDS =
  /\b(plan|architect|design|refactor|restructure|analyze|audit|migrate|implement|create|build|generate)\b/i;

function defaultRoute(ctx: RouterContext): RoutingDecision {
  const { messages, tools, iteration } = ctx;

  // Context length — deep conversations signal complex work
  if (messages.length > 14) return "capable";

  // Many tools — complex multi-step task
  if ((tools?.length ?? 0) > 6) return "capable";

  // Subsequent iterations in a run — already complex
  if (iteration > 3) return "capable";

  // Last user message content analysis
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const content = typeof lastUser?.content === "string" ? lastUser.content : "";
  if (content.length > 800) return "capable";
  if (COMPLEX_KEYWORDS.test(content)) return "capable";

  return "fast";
}

// ── RouterChatModel ────────────────────────────────────────────────────────────

export class RouterChatModel implements ChatModel {
  private readonly fast: ChatModel;
  private readonly capable: ChatModel;
  private readonly routeFn: (ctx: RouterContext) => RoutingDecision | Promise<RoutingDecision>;
  private readonly onRoute?: (decision: RoutingDecision, ctx: RouterContext) => void;

  // Stats
  private fastCalls = 0;
  private capableCalls = 0;

  constructor(config: RouterConfig) {
    this.fast = config.fast;
    this.capable = config.capable;
    this.routeFn = config.route ?? defaultRoute;
    this.onRoute = config.onRoute;
  }

  complete(
    params: {
      messages: ChatMessage[];
      tools?: ToolSchema[];
      temperature?: number;
      maxTokens?: number;
      signal?: AbortSignal;
    },
    iteration = 0,
  ): Promise<ChatResult> {
    const ctx: RouterContext = { messages: params.messages, tools: params.tools, iteration };
    const decisionOrPromise = this.routeFn(ctx);

    const dispatch = (decision: RoutingDecision): Promise<ChatResult> => {
      this.onRoute?.(decision, ctx);
      if (decision === "fast") {
        // Cap at MAX_SAFE_INTEGER to prevent stats() corruption in
        // long-running server deployments (thousands of calls/minute).
        if (this.fastCalls < Number.MAX_SAFE_INTEGER) this.fastCalls++;
        return this.fast.complete(params);
      } else {
        if (this.capableCalls < Number.MAX_SAFE_INTEGER) this.capableCalls++;
        return this.capable.complete(params);
      }
    };

    if (typeof (decisionOrPromise as Promise<RoutingDecision>).then === "function") {
      return (decisionOrPromise as Promise<RoutingDecision>).then(dispatch);
    }
    return dispatch(decisionOrPromise as RoutingDecision);
  }

  /** Usage split: percentage routed to fast vs capable. */
  stats() {
    const total = this.fastCalls + this.capableCalls;
    return {
      fastCalls: this.fastCalls,
      capableCalls: this.capableCalls,
      total,
      fastPercent: total ? Math.round((this.fastCalls / total) * 100) : 0,
    };
  }
}

// ── Factory helpers ───────────────────────────────────────────────────────────

/**
 * Always use the capable model. No routing overhead.
 * Useful for disabling routing in production without changing call sites.
 */
export function alwaysCapable(capable: ChatModel): RouterChatModel {
  return new RouterChatModel({
    fast: capable,
    capable,
    route: () => "capable",
  });
}

/**
 * Always use the fast model. Useful for rapid iteration / development.
 */
export function alwaysFast(fast: ChatModel): RouterChatModel {
  return new RouterChatModel({ fast, capable: fast, route: () => "fast" });
}
