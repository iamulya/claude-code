/**
 * Guardrails & Cost Tracking Example
 *
 * Demonstrates:
 *   - Guardrails: soft warnings + hard blocks on cost, tokens, and turns
 *   - GuardrailConfig: maxCostUSD, maxTokensPerSession, maxTurnsPerRun
 *   - CostTracker: per-model pricing, totalCostUSD, getAllModelUsage()
 *   - Guardrails.enforce(): throw BudgetExceededError when limit breached
 *   - Guardrails.check(): inspect status non-throwingly
 *   - Guardrails.on(): subscribe to guardrail warning/error/blocked events
 *   - BudgetExceededError: catch and handle limit breaches
 *
 * Run:
 *   GEMINI_API_KEY=...    npx tsx src/index.ts
 *   OPENAI_API_KEY=sk-... npx tsx src/index.ts
 */

import {
  Agent,
  Guardrails,
  CostTracker,
  BudgetExceededError,
  buildTool,
  type GuardrailEvent,
} from 'yaaf'

// ─── helper ──────────────────────────────────────────────────────────────────

function banner(title: string) {
  console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`)
}

// ─── tools ───────────────────────────────────────────────────────────────────

let searchCount = 0
const webSearchTool = buildTool({
  name: 'web_search',
  inputSchema: {
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query'],
  },
  maxResultChars: 2000,
  describe: () => 'Search the web for information.',
  call: async (input: Record<string, unknown>) => {
    searchCount++
    return {
      data: `[Result ${searchCount}] Found articles about "${input.query}": ` +
            `AI coding assistants are growing rapidly with GitHub Copilot, Cursor, and Codeium leading.` +
            `Productivity gains of 30-55% reported in controlled studies.`
    }
  },
  isReadOnly: () => true,
})

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  // ── 1. CostTracker: per-model pricing ────────────────────────────────────
  banner('1. CostTracker Setup')

  // CostTracker accepts custom pricing overrides (in USD per 1M tokens)
  const costTracker = new CostTracker({
    // Known models are priced automatically — override if needed
    'gemini-2.0-flash': { inputPerMillion: 0.075, outputPerMillion: 0.30 },
    'gpt-4o-mini':      { inputPerMillion: 0.150, outputPerMillion: 0.60 },
  })

  console.log('\nCostTracker initialised with custom pricing for gemini-2.0-flash and gpt-4o-mini.')
  console.log('Costs are accumulated automatically from usage events.\n')

  // ── 2. Guardrails: hard limits ────────────────────────────────────────────
  banner('2. Guardrails Configuration')

  const guardrails = new Guardrails({
    maxCostUSD:           0.05,   // Hard stop at $0.05
    maxTokensPerSession:  8000,   // Stop if total tokens exceed 8000
    maxTurnsPerRun:       8,      // Max 8 LLM turns per run() call
    warningPct:           70,     // Warn at 70% of each limit
    errorPct:             90,     // Error event at 90% of each limit
  })

  console.log('Guardrails configured:')
  console.log('  Max cost:          $0.05')
  console.log('  Max tokens:        8,000')
  console.log('  Max turns/run:     8')
  console.log('  Warning at:        70%')
  console.log('  Error at:          90%')

  // Subscribe to guardrail events for real-time observability
  guardrails.on((event: GuardrailEvent) => {
    const icon = event.type === 'warning' ? '⚠️ ' : event.type === 'error' ? '🔴' : '⛔'
    const pct = event.type !== 'blocked' ? `${(event.pctUsed * 100).toFixed(0)}%` : 'over limit'
    console.log(`  ${icon} [${event.type.toUpperCase()}] ${event.resource}: ${event.current}/${event.limit} (${pct} used)`)
  })

  // ── 3. Wiring Guardrails to an Agent ─────────────────────────────────────
  banner('3. Agent Run with Guardrails Enforcement')

  const agent = new Agent({
    name: 'ResearchAgent',
    systemPrompt: 'You are a research assistant. Use web_search to research topics.',
    tools: [webSearchTool],
  })

  // Wire usage tracking: record tokens on every LLM response
  agent.on('usage', (usage) => {
    costTracker.record(
      // Agent exposes model name via config — we use a known name here
      'gemini-2.0-flash',
      {
        inputTokens:  usage.totalPromptTokens,
        outputTokens: usage.totalCompletionTokens,
      }
    )
  })

  // Wire turn tracking: record each iteration
  agent.on('iteration', ({ count }) => {
    guardrails.recordTurn()
  })

  try {
    console.log('\nRunning agent (research task)...')
    const result = await agent.run(
      'Research the current state of AI coding assistants. ' +
      'Use web_search to gather information and summarise the key tools and trade-offs.'
    )

    // Check guardrail status after run (non-throwing)
    const check = guardrails.check(costTracker)
    console.log(`\n✅ Run succeeded. Guardrail status: ${check.status}`)
    if (check.details.length > 0) {
      check.details.forEach(d =>
        console.log(`   ${d.resource}: ${(d.pctUsed * 100).toFixed(0)}% used`)
      )
    }

    console.log('\nResult preview:')
    console.log(result.slice(0, 400) + (result.length > 400 ? '...' : ''))
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      console.log(`\n⛔ Run terminated by guardrail: ${err.message}`)
    } else {
      throw err
    }
  }

  // ── 4. Cost Snapshot ─────────────────────────────────────────────────────
  banner('4. Cost Snapshot After Run')

  console.log('\nSession cost summary:')
  console.log(`  Total input tokens:  ${CostTracker.formatNumber(costTracker.totalInputTokens)}`)
  console.log(`  Total output tokens: ${CostTracker.formatNumber(costTracker.totalOutputTokens)}`)
  console.log(`  Total cost:          ${CostTracker.formatCost(costTracker.totalCostUSD)}`)

  const modelUsage = costTracker.getAllModelUsage()
  if (modelUsage.size > 0) {
    console.log('\n  By model:')
    for (const [model, usage] of modelUsage.entries()) {
      const cost = costTracker.getModelUsage(model)
      console.log(`    ${model}: ${CostTracker.formatNumber(usage.inputTokens + usage.outputTokens)} tokens`)
    }
  }

  // ── 5. Pre-flight enforce() pattern ───────────────────────────────────────
  banner('5. Pre-flight enforce() Pattern')

  console.log('\nSimulating a session that is close to its token budget...')

  const tightGuardrails = new Guardrails({
    maxCostUSD:          0.001,  // Very tight $0.001 cap
    maxTokensPerSession: 100,    // Tiny token budget
  })

  const nearLimitTracker = new CostTracker()
  // Simulate previous usage: 95 tokens
  nearLimitTracker.record('gemini-2.0-flash', { inputTokens: 70, outputTokens: 25 })

  console.log(`  Simulated usage so far: 95 tokens (limit: 100)`)

  try {
    // enforce() throws if any limit is breached — use before starting a run
    tightGuardrails.enforce(nearLimitTracker, 50 /* projected input tokens */)
    console.log('  ✅ Budget OK — safe to proceed')
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      console.log(`  ⛔ Pre-flight blocked: ${err.message}`)
      console.log('  → Agent run was prevented before any LLM call was made.')
    }
  }
}

main().catch(console.error)
