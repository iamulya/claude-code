/**
 * Agent — High-level abstraction over AgentRunner
 *
 * This is the primary API for creating agents. It handles:
 * - Auto-selecting an LLM provider from env vars or explicit config
 * - Creating the underlying AgentRunner
 * - Optional MemoryStore and ContextManager integration
 * - Permission policy enforcement
 * - Lifecycle hooks (before/after tool calls and LLM turns)
 * - Execution sandboxing (timeout, path guards, network blocking)
 * - Session persistence (crash recovery via .jsonl)
 * - Plan mode (think-first, approve-then-execute)
 * - Skills injection (markdown capability packs)
 * - A simple `.run()` → `string` interface
 *
 * @example
 * ```ts
 * const agent = new Agent({
 *   systemPrompt: 'You are a helpful travel assistant.',
 *   tools: createTravelTools(),
 *   permissions: new PermissionPolicy()
 *     .allow('search_*')
 *     .requireApproval('book_trip', 'Booking costs real money')
 *     .onRequest(cliApproval()),
 *   sandbox: projectSandbox(),
 *   hooks: {
 *     afterToolCall: async ({ toolName }, result) => {
 *       await auditLog.write({ tool: toolName, result });
 *       return { action: 'continue' };
 *     },
 *   },
 * });
 * ```
 */

import {
  AgentRunner,
  type AgentRunnerConfig,
  type RunnerEvents,
  type RunnerEventHandler,
  type ChatMessage,
  type ChatModel,
  type RunnerStreamEvent,
} from './agents/runner.js'
import type { Tool } from './tools/tool.js'
import type { Plugin, ToolProvider } from './plugin/types.js'
import type { MemoryStore } from './memory/memoryStore.js'
import type { MemoryStrategy, MemoryContext } from './memory/strategies.js'
import { ContextManager } from './context/contextManager.js'
import type { Hooks } from './hooks.js'
import type { PermissionPolicy } from './permissions.js'
import type { Sandbox } from './sandbox.js'
import type { Session } from './session.js'
import type { Skill } from './skills.js'
import { buildSkillSection } from './skills.js'
import type { SystemPromptBuilder } from './prompt/systemPrompt.js'
import { resolveModel, type ModelProvider } from './models/resolver.js'
import { resolveModelSpecs } from './models/specs.js'
import {
  startAgentRunSpan,
  endAgentRunSpan,
} from './telemetry/tracing.js'
import { ContextOverflowError } from './errors.js'
import { Logger } from './utils/logger.js'

const logger = new Logger('agent')

export type { ModelProvider }


// ── Plan Mode Config ──────────────────────────────────────────────────────────

export type PlanModeConfig = {
  /**
   * Called with the generated plan text. Return true to proceed with execution,
   * false to abort. If not provided, always proceeds.
   */
  onPlan?: (plan: string) => Promise<boolean> | boolean
  /**
   * Custom prompt to generate the plan. Default asks the agent to produce
   * a numbered list of steps without executing anything.
   */
  planningPrompt?: string
}

// ── Agent Config ─────────────────────────────────────────────────────────────

export type AgentConfig = {
  /** Agent name for logging and identification */
  name?: string

  /**
   * The agent's system prompt — defines its role, rules, and personality.
   * Optional when `systemPromptProvider` is set (prompt resolved async).
   */
  systemPrompt?: string

  /** Tools the agent can call */
  tools?: readonly Tool[]

  /**
   * Pre-built ChatModel — skips provider auto-detection.
   * Takes priority over `provider`, `model`, `apiKey`.
   */
  chatModel?: ChatModel

  // ── Provider selection (ignored if chatModel is provided) ─────────────────

  /**
   * LLM provider. If omitted, auto-detected from env vars:
   *   GEMINI_API_KEY   → gemini
   *   OPENAI_API_KEY   → openai
   */
  provider?: ModelProvider | string

  /**
   * Model name.
   * Defaults per provider:
   *   gemini → gemini-2.0-flash
   *   openai → gpt-4o-mini
   */
  model?: string

  /**
   * API key. Defaults per provider:
   *   gemini → GEMINI_API_KEY env var
   *   openai → OPENAI_API_KEY env var
   */
  apiKey?: string

  /**
   * Base URL for OpenAI-compatible providers.
   * Example: 'http://localhost:11434/v1' for Ollama
   * Falls back to OPENAI_BASE_URL env var.
   */
  baseUrl?: string

  /** Vertex AI project (Gemini only) */
  project?: string

  /** Vertex AI location (Gemini only, default: us-central1) */
  location?: string

  // ── Runner config ─────────────────────────────────────────────────────────

  /** Max LLM round-trips before stopping (default: 15) */
  maxIterations?: number

  /** LLM temperature 0-2 (default: 0.2) */
  temperature?: number

  /** Max output tokens per LLM call (default: 4096) */
  maxTokens?: number

  // ── Safety & Control ──────────────────────────────────────────────────────

  /**
   * Permission policy — allow/deny/escalate tool calls before execution.
   * @see PermissionPolicy, allowAll(), denyAll(), cliApproval()
   */
  permissions?: PermissionPolicy

  /**
   * Lifecycle hooks — inspect, modify, or block tool calls and LLM turns.
   * @see Hooks
   */
  hooks?: Hooks

  /**
   * Sandbox — enforce timeouts, path guards, and network restrictions.
   * @see Sandbox, projectSandbox(), strictSandbox(), timeoutSandbox()
   */
  sandbox?: Sandbox

  // ── Persistence ───────────────────────────────────────────────────────────

  /**
   * Session — persist conversation history to disk and resume on restart.
   * @see Session.create(), Session.resume(), Session.resumeOrCreate()
   */
  session?: Session

  // ── Capabilities ──────────────────────────────────────────────────────────

  /**
   * Plan mode — agent produces a plan before executing, with optional
   * user approval gate.
   */
  planMode?: PlanModeConfig | true

  /**
   * Skills — markdown capability packs injected into the system prompt.
   * @see loadSkills(), defineSkill()
   */
  skills?: Skill[]

  /**
   * SystemPromptBuilder — a composable, section-based alternative to a raw
   * `systemPrompt` string. When provided, it is built asynchronously at
   * agent construction time. Mutually exclusive with `systemPrompt` —
   * if both are provided, `systemPromptProvider` takes precedence.
   *
   * @see SystemPromptBuilder, defaultPromptBuilder()
   *
   * @example
   * ```ts
   * const builder = new SystemPromptBuilder()
   *   .addStatic('identity', () => 'You are a coding assistant.')
   *   .addDynamic('memory', () => memStore.buildPrompt(), 'memory updates per turn');
   *
   * const agent = new Agent({ systemPromptProvider: builder, tools: [...] });
   * ```
   */
  systemPromptProvider?: SystemPromptBuilder | (() => Promise<string>)

  /**
   * MemoryStrategy integration. If provided, relevant memories are retrieved
   * and injected into the system prompt before each run.
   *
   * Replaces the deprecated `memory` (MemoryStore) field. Accepts any
   * `MemoryStrategy` including the factory helpers:
   * `sessionMemoryStrategy()`, `topicMemoryStrategy()`, `honchoMemoryStrategy()`.
   */
  memoryStrategy?: MemoryStrategy

  /**
   * @deprecated Use `memoryStrategy` instead.
   * MemoryStore integration (legacy). If provided and `memoryStrategy` is not
   * set, memories are injected via the store's `buildPrompt()` method.
   */
  memory?: MemoryStore

  /**
   * ContextManager integration. If provided, the agent uses it for
   * token-budget-aware context assembly and auto-compaction.
   *
   * Pass `'auto'` to have the agent create a ContextManager automatically
   * using the model's resolved context window and output token limits from
   * the built-in specs registry (recommended). This enables overflow recovery
   * and micro-compaction with zero manual configuration.
   *
   * @example Auto-managed context (recommended)
   * ```ts
   * const agent = new Agent({ model: 'gpt-4o', contextManager: 'auto' })
   * ```
   *
   * @example Manual configuration
   * ```ts
   * const agent = new Agent({
   *   contextManager: new ContextManager({
   *     contextWindowTokens: 128_000,
   *     maxOutputTokens: 16_384,
   *     strategy: new CompositeStrategy([new MicroCompactStrategy(), new SummarizeStrategy()]),
   *   }),
   * })
   * ```
   */
  contextManager?: ContextManager | 'auto'

  /**
   * Plugins — registered in order before the agent is used.
   *
   * Each plugin's `initialize()` is called during construction (sync path)
   * or `Agent.create()` (async path). `ToolProvider` plugins automatically
   * contribute their tools to the agent's tool list.
   *
   * The agent does NOT call `destroy()` automatically — call
   * `Agent.shutdown()` or manage lifecycle externally.
   *
   * @example
   * ```ts
   * const agent = await Agent.create({
   *   systemPrompt: '...',
   *   plugins: [
   *     new McpPlugin({ servers: [...] }),
   *     new AgentFSPlugin(),
   *   ],
   * });
   * ```
   */
  plugins?: Plugin[]
}

// resolveProvider moved to src/models/resolver.ts — use resolveModel(config) directly.

// ── System prompt builder ─────────────────────────────────────────────────────

function buildSystemPromptSync(config: AgentConfig): string {
  // Only used by the sync constructor path — when no async provider is given
  let prompt = config.systemPrompt ?? ''
  if (config.skills && config.skills.length > 0) {
    prompt += buildSkillSection(config.skills)
  }
  return prompt
}

async function resolveSystemPrompt(config: AgentConfig): Promise<string> {
  // If a builder or async factory is provided, use it
  if (config.systemPromptProvider) {
    let prompt: string
    if (typeof config.systemPromptProvider === 'function') {
      prompt = await config.systemPromptProvider()
    } else {
      // SystemPromptBuilder
      prompt = await config.systemPromptProvider.build()
    }
    // Still apply skills on top
    if (config.skills && config.skills.length > 0) {
      prompt += buildSkillSection(config.skills)
    }
    return prompt
  }
  return buildSystemPromptSync(config)
}

// ── Plan mode helpers ─────────────────────────────────────────────────────────

const DEFAULT_PLANNING_PROMPT = `Before executing, produce a detailed numbered plan of the steps you will take. 
Do NOT execute any tools yet. Output only the plan — no preamble, no tool calls.
Format: a numbered list where each item is one concrete action.`

// ── Agent ────────────────────────────────────────────────────────────────────

/**
 * Agent — the primary API for creating autonomous agents.
 *
 * Wraps AgentRunner with auto-provider-selection, memory integration,
 * permissions, hooks, sandboxing, session persistence, plan mode, and skills.
 */
export class Agent {
  readonly name: string
  protected readonly runner: AgentRunner
  /** @deprecated Use memoryStrategy */
  private readonly legacyMemory?: MemoryStore
  private readonly memoryStrategy?: MemoryStrategy
  private readonly contextManager?: ContextManager
  private readonly session?: Session
  private readonly planMode?: PlanModeConfig
  protected readonly config: AgentConfig

  constructor(config: AgentConfig) {
    this.name = config.name ?? 'Agent'
    this.config = config
    // Support both the new memoryStrategy and the deprecated memory (MemoryStore) field
    this.memoryStrategy = config.memoryStrategy
    // contextManager is assigned below after model specs are resolved (supports 'auto')
    this.session = config.session
    this.planMode = config.planMode === true ? {} : config.planMode

    const chatModel = resolveModel(config)

    // Resolve LLM-specific context limits from the model specs registry.
    // The resolved model exposes contextWindowTokens / maxOutputTokens as
    // properties if it's one of our built-in classes; fall back to the
    // registry lookup by model name string otherwise.
    const modelSpecs = (() => {
      const m = chatModel as unknown as Record<string, unknown>
      if (typeof m.contextWindowTokens === 'number' && typeof m.maxOutputTokens === 'number') {
        return { contextWindowTokens: m.contextWindowTokens as number, maxOutputTokens: m.maxOutputTokens as number }
      }
      return resolveModelSpecs(config.model)
    })()

    // Resolve the contextManager — supports 'auto' shorthand.
    // 'auto' creates a ContextManager pre-configured with the model's
    // actual context window and output token limits from the registry,
    // enabling overflow recovery and micro-compaction with zero config.
    const resolvedContextManager: ContextManager | undefined =
      config.contextManager === 'auto'
        ? new ContextManager({
            contextWindowTokens: modelSpecs.contextWindowTokens,
            maxOutputTokens:     modelSpecs.maxOutputTokens,
            // 'truncate' needs no LLM — safe zero-dep default for auto mode
            compactionStrategy: 'truncate',
          })
        : config.contextManager

    // Merge ToolProvider plugin tools into the tools array
    const pluginTools: Tool[] = []
    for (const plugin of config.plugins ?? []) {
      const caps = plugin.capabilities as string[]
      if (caps.includes('tool_provider')) {
        pluginTools.push(...(plugin as unknown as ToolProvider).getTools())
      }
    }

    // Sync construction: resolve systemPromptProvider if it was pre-resolved
    // (via Agent.create()), otherwise fall back to inline systemPrompt string.
    // If you need async prompt resolution at construction time, use Agent.create().
    const systemPrompt = config.systemPromptProvider
      ? '[pending — use Agent.create() for async systemPromptProvider resolution]'
      : buildSystemPromptSync(config)

    const runnerConfig: AgentRunnerConfig = {
      model: chatModel,
      tools: [...(config.tools ?? []), ...pluginTools],
      systemPrompt,
      maxIterations: config.maxIterations,
      temperature: config.temperature,
      // If no explicit maxTokens, use the model-specific output token limit
      maxTokens: config.maxTokens ?? modelSpecs.maxOutputTokens,
      hooks: config.hooks,
      permissions: config.permissions,
      sandbox: config.sandbox,
      contextManager: resolvedContextManager,
    }

    this.runner = new AgentRunner(runnerConfig)
    // Assign once — readonly is settable anywhere in the constructor
    this.contextManager = resolvedContextManager

    // Restore session history if provided
    if (config.session && config.session.messageCount > 0) {
      for (const msg of config.session.getMessages()) {
        this.runner.addMessage(msg as ChatMessage)
      }
    }
  }

  /**
   * Async factory — use this instead of `new Agent()` when you need to
   * resolve a `systemPromptProvider` (i.e. a `SystemPromptBuilder`) at
   * construction time.
   *
   * @example
   * ```ts
   * const agent = await Agent.create({
   *   systemPromptProvider: myBuilder,
   *   tools: myTools,
   * });
   * ```
   */
  static async create(config: AgentConfig): Promise<Agent> {
    // Initialize plugins before building agent
    for (const plugin of config.plugins ?? []) {
      await plugin.initialize?.()
    }
    const resolvedPrompt = await resolveSystemPrompt(config)
    const resolvedConfig: AgentConfig = {
      ...config,
      systemPrompt: resolvedPrompt,
      systemPromptProvider: undefined,
    }
    return new Agent(resolvedConfig)
  }

  /**
   * Gracefully shut down all registered plugins.
   * Call this when you are done with the agent.
   */
  async shutdown(): Promise<void> {
    for (const plugin of this.config.plugins ?? []) {
      await plugin.destroy?.()
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Run one conversation turn.
   *
   * Automatically:
   * - Injects relevant memories into context (if memory is configured)
   * - Checks permission policy before tool calls
   * - Dispatches lifecycle hooks
   * - Runs tools inside sandbox (if configured)
   * - Applies plan mode (if configured) — plans before executing
   * - Persists messages to session (if configured)
   */
  async run(userMessage: string, signal?: AbortSignal): Promise<string> {
    // OTel: start a span for this run turn
    const runSpan = startAgentRunSpan({
      agentName:    this.name,
      userMessage,
    })

    // Build memory context prefix for this turn
    const memoryPrefix = await this.buildMemoryPrefix(userMessage, signal)

    // Plan mode: think first, then execute
    if (this.planMode) {
      try {
        const result = await this.runWithPlanMode(userMessage, signal, memoryPrefix)
        endAgentRunSpan({ responseLength: result.length })
        return result
      } catch (err) {
        endAgentRunSpan({ error: err instanceof Error ? err.message : String(err) })
        throw err
      }
    }

    // Gap #6 FIX: Inject memory as system prompt override (not fake messages)
    // Uses the runner's setSystemOverride() to prepend memory context
    // without polluting the conversation history.
    if (memoryPrefix) {
      this.runner.setSystemOverride(`## Relevant Memory\n${memoryPrefix}`)
    } else {
      this.runner.setSystemOverride(undefined)
    }

    // Gap #4 FIX: Wire ContextManager — check and trigger compaction before running
    if (this.contextManager) {
      try {
        const shouldCompact = this.contextManager.shouldCompact()
        if (shouldCompact) {
          logger.info('Auto-compaction triggered before turn')
          const compactionResult = await this.contextManager.compact()
          logger.info(
            `Compacted: ${compactionResult.messagesRemoved} messages removed, ` +
            `${compactionResult.tokensFreed} tokens freed`,
          )
        }
      } catch (err) {
        // Compaction failure is non-fatal — log and continue
        logger.warn('Auto-compaction failed', { error: err instanceof Error ? err.message : String(err) })
      }
    }

    // Gap #5 FIX: Context overflow recovery — catch overflow, compact, retry
    let response: string
    try {
      response = await this.runner.run(userMessage, signal)
    } catch (err) {
      // Check if this is a context overflow (prompt too long)
      if (this.isContextOverflow(err) && this.contextManager) {
        logger.warn('Context overflow detected — triggering emergency compaction')
        try {
          await this.contextManager.compact()
          // Retry after compaction
          response = await this.runner.run(userMessage, signal)
        } catch (retryErr) {
          endAgentRunSpan({ error: retryErr instanceof Error ? retryErr.message : String(retryErr) })
          throw retryErr
        }
      } else {
        endAgentRunSpan({ error: err instanceof Error ? err.message : String(err) })
        throw err
      }
    }

    // Sync runner messages to ContextManager for accurate tracking
    if (this.contextManager) {
      this.syncMessagesToContextManager()
    }

    // Persist to session
    if (this.session) {
      await this.session.append([
        { role: 'user', content: userMessage },
        { role: 'assistant', content: response },
      ])
    }

    endAgentRunSpan({ responseLength: response.length })
    return response
  }

  /**
   * Run one conversation turn in streaming mode.
   * Yields progressive events as tokens arrive from the LLM.
   *
   * @example
   * ```ts
   * for await (const event of agent.runStream('Hello')) {
   *   if (event.type === 'text_delta') process.stdout.write(event.content);
   *   if (event.type === 'tool_call_result') console.log('Tool:', event.name);
   * }
   * ```
   */
  async *runStream(
    userMessage: string,
    signal?: AbortSignal,
  ): AsyncGenerator<RunnerStreamEvent, void, undefined> {
    const runSpan = startAgentRunSpan({
      agentName: this.name,
      userMessage,
    })

    const memoryPrefix = await this.buildMemoryPrefix(userMessage, signal)

    // Inject memory as system prompt override
    if (memoryPrefix) {
      this.runner.setSystemOverride(`## Relevant Memory\n${memoryPrefix}`)
    } else {
      this.runner.setSystemOverride(undefined)
    }

    // Wire ContextManager compaction
    if (this.contextManager) {
      try {
        if (this.contextManager.shouldCompact()) {
          await this.contextManager.compact()
        }
      } catch { /* non-fatal */ }
    }

    let lastContent = ''
    try {
      for await (const event of this.runner.runStream(userMessage, signal)) {
        if (event.type === 'final_response') lastContent = event.content
        yield event
      }
    } catch (err) {
      endAgentRunSpan({ error: err instanceof Error ? err.message : String(err) })
      throw err
    }

    // Sync and persist
    if (this.contextManager) this.syncMessagesToContextManager()
    if (this.session) {
      await this.session.append([
        { role: 'user', content: userMessage },
        { role: 'assistant', content: lastContent },
      ])
    }

    endAgentRunSpan({ responseLength: lastContent.length })
  }

  /**
   * Listen to agent events.
   *
   * @example
   * ```ts
   * agent.on('tool:call', ({ name, arguments: args }) =>
   *   console.log('calling', name, args));
   * agent.on('tool:blocked', ({ name, reason }) =>
   *   console.log('blocked', name, reason));
   * ```
   */
  on<K extends keyof RunnerEvents>(
    event: K,
    handler: RunnerEventHandler<K>,
  ): this {
    this.runner.on(event, handler)
    return this // fluent
  }

  /** Reset the conversation history */
  reset(): this {
    this.runner.reset()
    return this
  }

  /** Number of messages in conversation history */
  get messageCount(): number {
    return this.runner.messageCount
  }

  /** Full conversation history */
  get history() {
    return this.runner.getHistory()
  }

  /**
   * The underlying AgentRunner — access for advanced use cases.
   * Prefer the Agent API over accessing this directly.
   */
  get runner_(): AgentRunner {
    return this.runner
  }

  // ── Plan Mode ─────────────────────────────────────────────────────────────

  private async runWithPlanMode(
    userMessage: string,
    signal?: AbortSignal,
    memoryPrefix?: string,
  ): Promise<string> {
    const planPrompt = this.planMode!.planningPrompt ?? DEFAULT_PLANNING_PROMPT
    const basePrompt = buildSystemPromptSync(this.config)
    const planSystemPrompt = memoryPrefix
      ? `${basePrompt}\n\n## Context\n${memoryPrefix}\n\n${planPrompt}`
      : `${basePrompt}\n\n${planPrompt}`

    // Step 1: Generate plan (no tools, reuses the already-resolved model)
    const plannerRunner = new AgentRunner({
      model: this.runner.model,   // reuse — no re-construction
      tools: [],
      systemPrompt: planSystemPrompt,
      maxIterations: 1,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    })

    const plan = await plannerRunner.run(userMessage, signal)

    // Step 2: Gate on user approval (if handler provided)
    if (this.planMode!.onPlan) {
      const approved = await this.planMode!.onPlan(plan)
      if (!approved) {
        return `[Plan not approved. Execution stopped.]\n\nProposed plan:\n${plan}`
      }
    }

    // Step 3: Execute with the plan injected as context
    const executionPrompt = `Here is the plan you approved:\n\n${plan}\n\nNow execute it step by step.`
    const response = await this.runner.run(executionPrompt, signal)

    // Persist to session
    if (this.session) {
      await this.session.append([
        { role: 'user', content: userMessage },
        { role: 'assistant', content: plan },
        { role: 'user', content: executionPrompt },
        { role: 'assistant', content: response },
      ])
    }

    return response
  }

  // ── Memory Integration ────────────────────────────────────────────────────

  /**
   * Build a memory context string to prepend to this turn's context.
   * Returns empty string if no memory is configured.
   *
   * Priority: MemoryStrategy (new) > MemoryStore (deprecated legacy).
   */
  private async buildMemoryPrefix(
    query: string,
    signal?: AbortSignal,
  ): Promise<string> {
    // New pluggable strategy path
    if (this.memoryStrategy) {
      try {
        const ctx: MemoryContext = {
          messages: this.runner.getHistory() as Array<{ role: string; content: string }>,
          currentQuery: query,
          totalTokens: this.runner.getHistory().reduce(
            (sum, m) => sum + Math.ceil(('content' in m && m.content ? m.content.length : 0) / 4),
            0,
          ),
          toolCallsSinceExtraction: 0,
          signal,
        }

        // Run extraction if strategy decides this turn triggers it
        if (await this.memoryStrategy.shouldExtract(ctx)) {
          await this.memoryStrategy.extract(ctx)
        }

        const retrieval = await this.memoryStrategy.retrieve(ctx)
        return retrieval.systemPromptSection
      } catch {
        // Memory is non-fatal
        return ''
      }
    }

    // Legacy MemoryStore path
    if (this.config.memory) {
      try {
        return this.config.memory.buildPrompt() ?? ''
      } catch {
        return ''
      }
    }

    return ''
  }

  // ── ContextManager Integration (Gap #4) ────────────────────────────────

  /**
   * Sync the runner's message history to the ContextManager.
   * This keeps the ContextManager's token tracking accurate.
   */
  private syncMessagesToContextManager(): void {
    if (!this.contextManager) return

    const history = this.runner.getHistory()
    // The ContextManager has its own message array.
    // We sync by ensuring the last N messages from the runner are tracked.
    // This is a one-way push — the runner is the source of truth.
    const cmMessageCount = this.contextManager.getMessageCount()
    const newMessages = history.slice(cmMessageCount)

    for (const msg of newMessages) {
      this.contextManager.addMessage({
        uuid: `runner-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: msg.role === 'tool' ? 'tool_result' : msg.role as 'user' | 'assistant' | 'system',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        timestamp: Date.now(),
        toolUseId: 'toolCallId' in msg ? (msg as { toolCallId: string }).toolCallId : undefined,
      })
    }
  }

  // ── Context Overflow Detection (Gap #5) ────────────────────────────────

  /**
   * Check if an error is a context overflow (prompt too long).
   * Heuristic: checks for known API error patterns from various providers.
   */
  private isContextOverflow(err: unknown): boolean {
    if (err instanceof ContextOverflowError) return true

    if (err instanceof Error) {
      const msg = err.message.toLowerCase()
      return (
        msg.includes('prompt is too long') ||
        msg.includes('prompt_too_long') ||
        msg.includes('context_length_exceeded') ||
        msg.includes('maximum context length') ||
        msg.includes('request too large') ||
        msg.includes('413')
      )
    }

    return false
  }
}

// ── Factory helpers ──────────────────────────────────────────────────────────

/**
 * Create a Gemini-powered agent in one line.
 */
export function geminiAgent(
  config: Omit<AgentConfig, 'provider'> & { model?: string },
): Agent {
  return new Agent({ ...config, provider: 'gemini' })
}

/**
 * Create an OpenAI-powered agent in one line.
 */
export function openaiAgent(
  config: Omit<AgentConfig, 'provider'> & { model?: string },
): Agent {
  return new Agent({ ...config, provider: 'openai' })
}

/**
 * Create a locally-hosted Ollama agent in one line.
 */
export function ollamaAgent(
  config: Omit<AgentConfig, 'provider' | 'baseUrl'> & { model: string },
): Agent {
  return new Agent({ ...config, provider: 'ollama' })
}
