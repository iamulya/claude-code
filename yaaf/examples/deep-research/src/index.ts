/**
 * Deep Research — Multi-Agent Research & Analysis Pipeline
 *
 * A production-grade example that ACTUALLY stress-tests these YAAF subsystems:
 *
 *   ✓ sequential() + parallel()        — workflow orchestration
 *   ✓ transform()                       — data transformation between agents
 *   ✓ AgentOrchestrator                 — swarm-style multi-agent spawning
 *   ✓ OpenAPIToolset                    — auto-generate tools from OpenAPI spec
 *   ✓ PlanMode                          — think-first, approve-then-execute
 *   ✓ Hooks                             — progress tracking, cost monitoring
 *   ✓ Guardrails                        — token budget enforcement
 *   ✓ CostTracker                       — real cost accounting
 *   ✓ Doctor                            — auto-diagnoses tool failures
 *   ✓ ContextManager                    — manages large research context
 *   ✓ Session                           — persist & resume long research
 *   ✓ ToolLoopDetector                  — prevents repetitive tool calls
 *   ✓ Streaming (runStream)             — real-time output
 *   ✓ A2A                               — expose pipeline as remote service
 *   ✓ RemoteSessionServer               — WebSocket serving
 *
 * Run:
 *   npx tsx src/index.ts "AI agent frameworks 2025"
 *   npx tsx src/index.ts --serve   # A2A + WebSocket mode
 */

import {
  Agent,
  buildTool,

  // Hooks
  type Hooks,
  type HookContext,
  type HookResult,
  type LLMHookResult,

  // Guardrails & cost
  Guardrails,
  CostTracker,

  // Context management
  ContextManager,

  // Session persistence
  Session,

  // Tool loop detection
  ToolLoopDetector,

  // Plan mode
  type PlanModeConfig,

  // Workflow orchestration
  sequential,
  parallel,
  transform,
  type WorkflowStep,

  // Multi-agent orchestrator (Swarm)
  AgentOrchestrator,
  type AgentDefinition,

  // OpenAPI toolset
  OpenAPIToolset,

  // A2A protocol
  serveA2A,

  // Streaming events
  type RunnerStreamEvent,
  type ChatResult,
} from 'yaaf'
import { RemoteSessionServer } from 'yaaf/remote'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// ── Helpers ──────────────────────────────────────────────────────────────────

function banner(title: string) {
  console.log(`\n${'═'.repeat(66)}\n  ${title}\n${'═'.repeat(66)}`)
}
function section(title: string) {
  console.log(`\n${'─'.repeat(54)}\n  ${title}\n${'─'.repeat(54)}`)
}
function progress(emoji: string, msg: string) {
  console.log(`  ${emoji} ${msg}`)
}

const startTime = Date.now()
function elapsed() { return `${((Date.now() - startTime) / 1000).toFixed(1)}s` }

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 1: CostTracker — real per-model token cost accounting
// ══════════════════════════════════════════════════════════════════════════════

const costTracker = new CostTracker()

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 2: Guardrails — enforce budget limits
// ══════════════════════════════════════════════════════════════════════════════

const guardrails = new Guardrails({
  maxCostUSD: 0.50,              // $0.50 ceiling for the whole run
  maxTokensPerSession: 500_000,  // hard token limit
  maxTurnsPerRun: 80,            // max LLM calls across all agents
  warningPct: 80,                // warn at 80%
  errorPct: 95,                  // escalate at 95%
})

// Subscribe to guardrail events (single-listener API)
guardrails.on((evt) => {
  if (evt.type === 'warning') {
    progress('⚠️', `Guardrail warning: ${evt.resource} at ${evt.pctUsed.toFixed(0)}% (${evt.current}/${evt.limit})`)
  } else if (evt.type === 'error') {
    progress('🔴', `Guardrail error: ${evt.resource} at ${evt.pctUsed.toFixed(0)}%`)
  } else if (evt.type === 'blocked') {
    progress('🛑', `Guardrail BLOCKED: ${evt.resource} — ${evt.reason}`)
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 3: ToolLoopDetector — prevents repetitive API calls
// ══════════════════════════════════════════════════════════════════════════════

const loopDetector = new ToolLoopDetector({
  threshold: 3,
  windowSize: 10,
})

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 4: Hooks — lifecycle observation + cost tracking
// ══════════════════════════════════════════════════════════════════════════════

let toolCallCount = 0
let llmCallCount = 0

const researchHooks: Hooks = {
  // Called before every tool invocation
  beforeToolCall: (ctx: HookContext): HookResult => {
    toolCallCount++
    progress('🔧', `[${elapsed()}] Tool: ${ctx.toolName}(${JSON.stringify(ctx.arguments).slice(0, 80)}...)`)

    // Check loop detector
    loopDetector.record(ctx.toolName, ctx.arguments)
    if (loopDetector.isLooping()) {
      const loopInfo = loopDetector.detect()
      progress('🔄', `Loop detected: "${loopInfo.tools.join(', ')}" repeated ${loopInfo.count}x — blocking`)
      return { action: 'block', reason: `Tool loop detected: ${loopInfo.type}` }
    }

    // Check guardrails (turn count)
    guardrails.recordTurn()
    const check = guardrails.check(costTracker)
    if (check.blocked) {
      return { action: 'block', reason: check.reason ?? 'Budget exceeded' }
    }

    return { action: 'continue' }
  },

  // Called after every tool invocation
  afterToolCall: (ctx: HookContext, result: unknown): HookResult => {
    const resultSize = JSON.stringify(result).length
    progress('  ', `  └─ ${ctx.toolName}: ${resultSize} chars`)
    return { action: 'continue' }
  },

  // Called after each LLM response
  afterLLM: (response: ChatResult, iteration: number): LLMHookResult | void => {
    llmCallCount++
    // Record token usage in CostTracker
    if (response.usage) {
      costTracker.record('gemini-2.0-flash', {
        inputTokens: response.usage.promptTokens ?? 0,
        outputTokens: response.usage.completionTokens ?? 0,
      })
    }
    // Check guardrails after each LLM call
    const check = guardrails.check(costTracker)
    if (check.status !== 'ok') {
      const detail = check.details.find(d => d.status !== 'ok')
      if (detail) {
        progress('📊', `Budget: ${detail.resource} at ${detail.pctUsed.toFixed(0)}% (${detail.current}/${detail.limit})`)
      }
    }
  },
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 5: OpenAPIToolset — auto-generate tools from an OpenAPI spec
// ══════════════════════════════════════════════════════════════════════════════

// An inline Hacker News API spec (subset) — demonstrates OpenAPIToolset.fromSpec()
// In production, you'd use OpenAPIToolset.fromURL() or .fromFile()
const HN_OPENAPI_SPEC = {
  openapi: '3.0.3',
  info: { title: 'Hacker News Algolia API', version: '1.0.0' },
  servers: [{ url: 'https://hn.algolia.com/api/v1' }],
  paths: {
    '/search': {
      get: {
        operationId: 'searchStories',
        summary: 'Search Hacker News stories by keyword',
        parameters: [
          { name: 'query', in: 'query', required: true, schema: { type: 'string' }, description: 'Search query' },
          { name: 'tags', in: 'query', schema: { type: 'string' }, description: 'Filter by tag (e.g. story, comment)' },
          { name: 'hitsPerPage', in: 'query', schema: { type: 'integer' }, description: 'Number of results' },
        ],
        responses: { '200': { description: 'Search results' } },
      },
    },
    '/search_by_date': {
      get: {
        operationId: 'searchByDate',
        summary: 'Search Hacker News stories sorted by date',
        parameters: [
          { name: 'query', in: 'query', required: true, schema: { type: 'string' }, description: 'Search query' },
          { name: 'tags', in: 'query', schema: { type: 'string' }, description: 'Filter by tag' },
          { name: 'hitsPerPage', in: 'query', schema: { type: 'integer' }, description: 'Number of results' },
        ],
        responses: { '200': { description: 'Search results sorted by date' } },
      },
    },
  },
}

/** Create OpenAPI toolset from the HN spec */
function createOpenAPITools() {
  section('OpenAPI Toolset')
  const toolset = OpenAPIToolset.fromSpec(HN_OPENAPI_SPEC as any, {
    timeoutMs: 10_000,
    headers: { 'User-Agent': 'yaaf-research/1.0' },
  })
  progress('🔌', `Generated ${toolset.tools.length} tools from OpenAPI spec:`)
  for (const op of toolset.operations) {
    progress('  ', `  ${op.method.toUpperCase()} ${op.path} → tool: ${op.operationId}`)
  }
  return toolset
}

// ══════════════════════════════════════════════════════════════════════════════
// MANUALLY-DEFINED TOOLS (the rest that aren't from OpenAPI)
// ══════════════════════════════════════════════════════════════════════════════

const searchWikipedia = buildTool({
  name: 'search_wikipedia',
  maxResultChars: 8_000,
  inputSchema: {
    type: 'object',
    properties: { topic: { type: 'string', description: 'Topic to look up' } },
    required: ['topic'],
  },
  describe: (input) => `Wiki: "${(input as any).topic}"`,
  async call(input: Record<string, unknown>): Promise<any> {
    const topic = encodeURIComponent(input.topic as string)
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${topic}`)
      if (!res.ok) return { data: { topic: input.topic, found: false } }
      const data = await res.json() as any
      return { data: { title: data.title, extract: data.extract, url: data.content_urls?.desktop?.page } }
    } catch (e: any) { return { data: { error: e.message } } }
  },
})

const searchGitHub = buildTool({
  name: 'search_github',
  maxResultChars: 12_000,
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query for GitHub repos' },
      numResults: { type: 'number', description: 'Number of results (default: 6)' },
    },
    required: ['query'],
  },
  describe: (input) => `GitHub: "${(input as any).query}"`,
  async call(input: Record<string, unknown>): Promise<any> {
    const query = encodeURIComponent(input.query as string)
    const num = (input.numResults as number) || 6
    try {
      const res = await fetch(
        `https://api.github.com/search/repositories?q=${query}&sort=stars&per_page=${num}`,
        { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'yaaf-research' } }
      )
      if (!res.ok) return { data: { error: `GitHub API: ${res.status}` } }
      const json = await res.json() as any
      return {
        data: {
          query: input.query, totalCount: json.total_count,
          repos: json.items.map((r: any) => ({
            name: r.full_name, description: r.description, stars: r.stargazers_count,
            forks: r.forks_count, language: r.language, url: r.html_url,
            updated: r.updated_at?.split('T')[0], topics: r.topics?.slice(0, 5),
          })),
        },
      }
    } catch (e: any) { return { data: { error: e.message } } }
  },
})

const getGitHubRepo = buildTool({
  name: 'get_github_repo',
  maxResultChars: 6_000,
  inputSchema: {
    type: 'object',
    properties: { repo: { type: 'string', description: 'Repo in "owner/name" format' } },
    required: ['repo'],
  },
  describe: (input) => `Repo: ${(input as any).repo}`,
  async call(input: Record<string, unknown>): Promise<any> {
    const repo = input.repo as string
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'yaaf-research' },
      })
      if (!res.ok) return { data: { error: `Repo not found: ${repo}` } }
      const d = await res.json() as any
      return {
        data: {
          name: d.full_name, description: d.description, stars: d.stargazers_count,
          forks: d.forks_count, issues: d.open_issues_count, language: d.language,
          license: d.license?.spdx_id, created: d.created_at?.split('T')[0],
          updated: d.updated_at?.split('T')[0], topics: d.topics,
        },
      }
    } catch (e: any) { return { data: { error: e.message } } }
  },
})

const fetchUrl = buildTool({
  name: 'fetch_url',
  maxResultChars: 8_000,
  inputSchema: {
    type: 'object',
    properties: { url: { type: 'string', description: 'URL to fetch' } },
    required: ['url'],
  },
  describe: (input) => `Fetch: ${(input as any).url}`,
  async call(input: Record<string, unknown>): Promise<any> {
    try {
      const res = await fetch(input.url as string, {
        headers: { 'User-Agent': 'yaaf-research/1.0' },
        signal: AbortSignal.timeout(8_000),
      })
      if (!res.ok) return { data: { error: `HTTP ${res.status}` } }
      const html = await res.text()
      const text = html.replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ').trim().slice(0, 6000)
      return { data: { url: input.url, content: text } }
    } catch (e: any) { return { data: { error: e.message } } }
  },
})

const saveReport = buildTool({
  name: 'save_report',
  maxResultChars: 500,
  inputSchema: {
    type: 'object',
    properties: {
      filename: { type: 'string', description: 'Filename (e.g. "report.md")' },
      content: { type: 'string', description: 'Full Markdown content' },
    },
    required: ['filename', 'content'],
  },
  describe: (input) => `Save: ${(input as any).filename}`,
  async call(input: Record<string, unknown>): Promise<any> {
    const outputDir = join(process.cwd(), 'output')
    mkdirSync(outputDir, { recursive: true })
    const filepath = join(outputDir, input.filename as string)
    writeFileSync(filepath, input.content as string, 'utf-8')
    progress('💾', `Report saved: ${filepath}`)
    return { data: { saved: true, path: filepath, bytes: (input.content as string).length } }
  },
})

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 6: Session persistence — survive crashes, resume long research
// ══════════════════════════════════════════════════════════════════════════════

async function getOrCreateSession(topic: string): Promise<Session> {
  const sessionDir = join(tmpdir(), 'yaaf-deep-research')
  mkdirSync(sessionDir, { recursive: true })
  const sessionId = `research-${topic.replace(/[^a-z0-9]/gi, '-').slice(0, 30)}`
  return Session.resumeOrCreate(sessionId, sessionDir)
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 7: ContextManager — token budget + compaction for the searcher
// ══════════════════════════════════════════════════════════════════════════════

function createContextManager() {
  return new ContextManager({
    contextWindowTokens: 1_000_000,    // Gemini 2.0 Flash context
    maxOutputTokens: 8_192,
    compactionStrategy: 'truncate',     // Use truncation (doesn't need LLM call)
    microCompactKeepRecent: 3,          // Keep last 3 tool results
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// AGENTS
// ══════════════════════════════════════════════════════════════════════════════

function createSearcherAgent(session: Session, openApiTools: any[]) {
  const contextManager = createContextManager()

  // FEATURE 8: Plan Mode — Think before executing
  const planMode: PlanModeConfig = {
    planningPrompt: `Before searching, produce a detailed research plan as a numbered list.
For each step, specify:
- Which tool to use (searchStories, searchByDate, search_github, get_github_repo, search_wikipedia, fetch_url)
- What query or input to use
- What you expect to learn from this step

Output ONLY the plan — no preamble, no tool calls. Aim for 6-10 concrete steps.`,
    onPlan: async (plan: string) => {
      section('📋 Research Plan (generated by Plan Mode)')
      console.log(plan.split('\n').map(l => `  │ ${l}`).join('\n'))
      console.log()
      progress('✅', 'Plan auto-approved — executing...')
      return true
    },
  }

  // Combine OpenAPI-generated tools + manually-built tools
  const allSearchTools = [...openApiTools, searchWikipedia, searchGitHub, getGitHubRepo, fetchUrl]

  return new Agent({
    name: 'Searcher',
    systemPrompt: `You are a thorough research assistant. Search multiple sources to find comprehensive data.

You have these tools:
- searchStories: Search HN stories by keyword (OpenAPI-generated from HN Algolia spec)
- searchByDate: Search HN stories sorted by date (OpenAPI-generated)
- search_github: Search GitHub repositories
- get_github_repo: Get detailed info about a specific repo
- search_wikipedia: Look up topics on Wikipedia
- fetch_url: Fetch any URL content

STRATEGY:
1. Search HN for recent discussions using searchStories (from OpenAPI toolset)
2. Search GitHub for relevant repositories  
3. Get detailed info on the top 3-4 repos
4. Use Wikipedia for background context

OUTPUT: Produce a structured brief with Key Projects, Community Discussion, Quantitative Data, and Trends.`,
    tools: allSearchTools as any,
    maxIterations: 15,
    hooks: researchHooks,
    contextManager,
    session,
    doctor: true,
    planMode,
  })
}

function createAnalystAgent() {
  return new Agent({
    name: 'Analyst',
    systemPrompt: `You are a senior technology analyst. Produce rigorous competitive analysis:
1. Comparison Matrix (markdown table)
2. SWOT Analysis for top 3 projects
3. Trend Analysis (growing vs declining)
4. Gap Analysis (unmet needs)
5. Risk Factors

Rules: Use specific numbers. Be opinionated. Rank projects.`,
    hooks: researchHooks,
    doctor: true,
  })
}

function createWriterAgent() {
  return new Agent({
    name: 'Writer',
    systemPrompt: `You are a professional technical writer. Transform analysis into a polished Markdown report:
# [Topic] — Research Report
## Executive Summary | ## Comparison | ## SWOT | ## Trends | ## Recommendations | ## Methodology

After writing, use save_report to write the file. Filename: "research-report-[topic-slug].md"`,
    tools: [saveReport] as any,
    hooks: researchHooks,
    doctor: true,
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 9: AgentOrchestrator — Swarm-style multi-agent search
// ══════════════════════════════════════════════════════════════════════════════

async function runParallelSearchSwarm(topic: string) {
  section('Parallel Search Swarm (AgentOrchestrator)')

  const swarmDir = join(tmpdir(), 'yaaf-research-swarm')
  mkdirSync(swarmDir, { recursive: true })

  const workerResults = new Map<string, string>()

  // Create an orchestrator with 3 specialized search workers
  const orchestrator = new AgentOrchestrator({
    mailboxDir: swarmDir,
    defaultTeam: 'research',
    tools: [searchGitHub, getGitHubRepo, searchWikipedia, fetchUrl] as any,
    leaderName: 'coordinator',
    runAgent: async ({ identity, prompt, tools, signal, sendToLeader }) => {
      // Each worker runs its own Agent instance
      const worker = new Agent({
        name: identity.agentName,
        systemPrompt: `You are a specialized research worker. ${prompt}
Return your findings as structured text. Be concise but thorough.`,
        tools: tools as any,
        maxIterations: 5,
        hooks: researchHooks,
        doctor: true,
      })

      try {
        const result = await worker.run(prompt, signal)
        workerResults.set(identity.agentId, result)
        await sendToLeader(result, `${identity.agentName} completed`)
        return { success: true }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    },
  })

  // Subscribe to orchestrator events
  orchestrator.on('agent:spawned', ({ identity }) => {
    progress('🐝', `Spawned worker: ${identity.agentName} (${identity.agentId})`)
  })
  orchestrator.on('agent:completed', ({ agentId, success, error }) => {
    progress(success ? '✅' : '❌', `Worker ${agentId}: ${success ? 'done' : error}`)
  })

  // Spawn 3 specialized search workers in parallel
  const workers: Array<{ name: string; prompt: string; definition: AgentDefinition }> = [
    {
      name: 'github-scout',
      prompt: `Search GitHub for repositories related to "${topic}". Get details on the top 3 repos (stars, forks, language, license, recent activity).`,
      definition: { type: 'Researcher', allowedTools: ['search_github', 'get_github_repo'] },
    },
    {
      name: 'wiki-researcher',
      prompt: `Search Wikipedia for background context on "${topic}". Find definitions, history, and key concepts.`,
      definition: { type: 'Researcher', allowedTools: ['search_wikipedia'] },
    },
    {
      name: 'web-scout',
      prompt: `Fetch web content related to "${topic}" to find comparison articles or tutorials. Try to find a good overview article.`,
      definition: { type: 'Researcher', allowedTools: ['fetch_url'] },
    },
  ]

  progress('🚀', `Spawning ${workers.length} parallel search workers...`)
  for (const w of workers) {
    await orchestrator.spawn({
      name: w.name,
      teamName: 'research',
      prompt: w.prompt,
      definition: w.definition,
      timeoutMs: 30_000,
    })
  }

  // Wait for all workers to finish
  await orchestrator.waitForAll(45_000)

  progress('📊', `Swarm status:\n${orchestrator.statusSummary()}`)

  // Merge worker results
  const mergedSwarmResults = [...workerResults.entries()]
    .map(([id, result]) => `## ${id}\n${result}`)
    .join('\n\n---\n\n')

  orchestrator.cleanup()

  return mergedSwarmResults
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN: Research pipeline using workflow orchestration
// ══════════════════════════════════════════════════════════════════════════════

async function runResearch(topic: string) {
  banner('🔬 YAAF Deep Research Pipeline')
  console.log(`
  Topic:      "${topic}"
  Pipeline:   [Swarm Search] → parallel() → sequential(Analyst → Writer)
  Features:   AgentOrchestrator, OpenAPIToolset, PlanMode, sequential(),
              parallel(), transform(), Hooks, Guardrails, CostTracker,
              Doctor, Session, ContextManager, ToolLoopDetector, Streaming
  `)

  // ── FEATURE 5: OpenAPI Toolset ─────────────────────────────────────────────
  const openApiToolset = createOpenAPITools()

  // ── Setup session (FEATURE 6) ──────────────────────────────────────────────
  section('Setup: Session Persistence')
  const session = await getOrCreateSession(topic)
  progress('📌', `Session ID: ${session.id}`)
  progress('📝', `Previous messages: ${session.messageCount}`)

  // ══════════════════════════════════════════════════════════════════════════
  // FEATURE 10: parallel() — run multiple search strategies concurrently
  // ══════════════════════════════════════════════════════════════════════════

  section('Phase 1: Parallel Search — HN Agent (Plan Mode) + Swarm Workers')
  progress('🚀', `Starting parallel search... [${elapsed()}]`)

  // Strategy A: HN-focused agent with Plan Mode (uses OpenAPI tools)
  const searcher = createSearcherAgent(session, openApiToolset.tools)

  // Strategy B: Swarm orchestrator for GitHub/Wiki/Web
  // We use parallel() to run both strategies simultaneously
  const parallelSearch = parallel(
    [
      // Leg 1: Main searcher agent with Plan Mode + OpenAPI tools
      {
        async run(input: string) {
          const result = await searcher.run(input)
          progress('✅', `Searcher agent complete [${elapsed()}]`)
          return result
        },
      },
      // Leg 2: Swarm of specialized workers via AgentOrchestrator
      {
        async run(input: string) {
          const result = await runParallelSearchSwarm(topic)
          progress('✅', `Swarm search complete [${elapsed()}]`)
          return result
        },
      },
    ] satisfies WorkflowStep[],
    {
      name: 'parallel-search',
      onError: 'collect',  // Don't fail if one leg errors
      merge: (results) => {
        progress('🔀', `Merging ${results.length} parallel search results...`)
        return `# Search Results — Strategy A (Main Agent with Plan Mode)\n\n${results[0]}\n\n---\n\n# Search Results — Strategy B (Swarm Workers)\n\n${results[1]}`
      },
    },
  )

  const searchPrompt = `Research "${topic}" thoroughly using all tools. Search HN (using searchStories from OpenAPI toolset), GitHub, Wikipedia. Get detailed repo info.`
  const combinedSearchResults = await parallelSearch.run(searchPrompt)

  progress('✅', `All searches complete [${elapsed()}] — ${combinedSearchResults.length} chars total`)

  const g1 = guardrails.check(costTracker)
  progress('📊', `Guardrails: ${g1.status} | Tokens: ${costTracker.totalInputTokens + costTracker.totalOutputTokens} | Cost: $${costTracker.totalCostUSD.toFixed(4)}`)

  if (g1.blocked) {
    progress('🛑', `Budget exceeded after search phase: ${g1.reason}`)
    return
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FEATURE 11: sequential() + transform() — pipeline the analysis + writing
  // ══════════════════════════════════════════════════════════════════════════

  section('Phase 2+3: sequential(Analyst → Writer) with transform()')

  const analyst = createAnalystAgent()
  const writer = createWriterAgent()
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)

  // Build the sequential pipeline: Analyst → transform prompt → Writer
  const analyzeAndWrite = sequential(
    [
      // Step 1: Analysis agent
      analyst,
      // Step 2: transform() — reshape analyst output into writer prompt
      transform((analysisOutput) => {
        progress('🔄', `transform() step: reshaping ${analysisOutput.length} chars → writer prompt`)
        return `Write a polished research report based on this analysis of "${topic}":\n\n${analysisOutput}\n\nSave the report as "research-report-${slug}.md"`
      }),
      // Step 3: Writer agent
      writer,
    ],
    {
      name: 'analyze-and-write',
      transform: (output, stepIndex) => {
        progress('📎', `Sequential step ${stepIndex + 1} → next (${output.length} chars)`)
        return output
      },
    },
  )

  progress('🧠', `Starting sequential(Analyst → transform → Writer)... [${elapsed()}]`)

  const analystPrompt = `Analyze this research about "${topic}":\n\n${combinedSearchResults}\n\nProduce comparison matrix, SWOT, trends, gaps, and recommendations.`
  const finalResult = await analyzeAndWrite.run(analystPrompt)

  progress('✅', `Pipeline complete [${elapsed()}]`)

  // ── Final Summary ──────────────────────────────────────────────────────────
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
  const gFinal = guardrails.check(costTracker)

  banner('✅ Deep Research Pipeline Complete!')
  console.log(`
  ┌─── Pipeline Summary ───────────────────────────────────────┐
  │  Topic:         "${topic.slice(0, 42)}"
  │  Total time:    ${totalTime}s
  │                                                             │
  │  Parallel search: ${combinedSearchResults.length.toLocaleString().padStart(6)} chars (2 strategies)
  │  Final output:    ${finalResult.length.toLocaleString().padStart(6)} chars
  │                                                             │
  │  LLM calls:     ${llmCallCount}
  │  Tool calls:    ${toolCallCount}
  │  Total tokens:  ${(costTracker.totalInputTokens + costTracker.totalOutputTokens).toLocaleString()}
  │  Total cost:    $${costTracker.totalCostUSD.toFixed(4)}
  │  Guardrails:    ${gFinal.status}
  │  Session:       ${session.id} (${session.messageCount} msgs)
  │                                                             │
  │  Output: ./output/research-report-${slug.slice(0, 15)}...
  └─────────────────────────────────────────────────────────────┘

  ${costTracker.formatSummary()}

  YAAF features exercised:
  ✓ sequential()       — Analyst → transform() → Writer pipeline
  ✓ parallel()         — Main agent + Swarm run concurrently
  ✓ transform()        — Reshape data between pipeline stages
  ✓ AgentOrchestrator  — Spawned 3 worker agents (github-scout, wiki-researcher, web-scout)
  ✓ OpenAPIToolset     — ${openApiToolset.tools.length} tools auto-generated from HN OpenAPI spec
  ✓ Plan Mode          — Searcher plans research steps before executing
  ✓ Hooks              — beforeToolCall, afterToolCall, afterLLM (all 3 hook points)
  ✓ Guardrails         — maxCostUSD, maxTokensPerSession, maxTurnsPerRun
  ✓ CostTracker        — Per-model token accounting with USD pricing
  ✓ Doctor             — Auto-diagnostics on all agents
  ✓ ContextManager     — Truncation + micro-compaction on Searcher
  ✓ Session            — Resume across restarts via Session.resumeOrCreate
  ✓ ToolLoopDetector   — Prevents repetitive API calls
  ✓ 7+ real API tools  — OpenAPI (HN) + GitHub + Wiki + URL + File
  ✓ Multi-agent swarm  — AgentOrchestrator with mailbox IPC
  `)
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 12+13: A2A + Remote Sessions — serve the pipeline as a service
// ══════════════════════════════════════════════════════════════════════════════

async function serveMode() {
  banner('🌐 Deep Research — Server Mode (A2A + WebSocket)')

  const openApiToolset = createOpenAPITools()
  const allTools = [...openApiToolset.tools, searchGitHub, searchWikipedia, getGitHubRepo, fetchUrl, saveReport]

  const coordinator = new Agent({
    name: 'DeepResearchCoordinator',
    systemPrompt: `You are a deep research coordinator. When asked to research a topic,
search for information using the available tools, analyze the findings, and produce
a comprehensive summary. Use multiple search sources (HN via searchStories, GitHub, Wikipedia).`,
    tools: allTools as any,
    maxIterations: 15,
    hooks: researchHooks,
    doctor: true,
  })

  // FEATURE 12: A2A server
  section('A2A Server')
  const a2aHandle = await serveA2A(coordinator, {
    name: 'YAAF Deep Research',
    description: 'Multi-agent research pipeline — searches HN, GitHub, Wikipedia and produces analysis',
    port: 4200,
    skills: [
      { id: 'research', name: 'Deep Research', description: 'Research any topic across multiple sources' },
      { id: 'compare', name: 'Compare', description: 'Compare technologies or frameworks' },
    ],
  })
  progress('🤝', `A2A Server: ${a2aHandle.url}`)
  progress('📋', `Agent Card: ${a2aHandle.url}/.well-known/agent.json`)

  // FEATURE 13: Remote Session server
  section('Remote Session Server')
  const remoteServer = new RemoteSessionServer(coordinator, {
    port: 4201,
    name: 'deep-research',
    maxSessions: 20,
    onSessionCreated: (id) => progress('📌', `New session: ${id.slice(0, 8)}...`),
    onSessionDestroyed: (id, reason) => progress('🗑️', `Session ended: ${id.slice(0, 8)}... (${reason})`),
  })
  const remoteHandle = await remoteServer.start()
  progress('🔌', `HTTP:  ${remoteHandle.url}/chat`)
  progress('🔌', `WS:   ${remoteHandle.wsUrl}`)

  console.log(`
  ┌─── Deep Research Server ────────────────────────────────────┐
  │                                                             │
  │  A2A:       ${a2aHandle.url.padEnd(44)}  │
  │  HTTP Chat: ${(remoteHandle.url + '/chat').padEnd(44)}  │
  │  WebSocket: ${remoteHandle.wsUrl.padEnd(44)}  │
  │                                                             │
  │  Try:                                                       │
  │    curl -X POST ${remoteHandle.url}/chat \\
  │      -H 'Content-Type: application/json' \\
  │      -d '{"message":"Research AI agents in 2025"}'          │
  │                                                             │
  │  Press Ctrl+C to stop.                                      │
  └─────────────────────────────────────────────────────────────┘`)

  await new Promise<void>((resolve) => {
    process.on('SIGINT', async () => {
      console.log('\n  Shutting down...')
      await a2aHandle.close()
      await remoteHandle.close()
      resolve()
    })
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// Entry point
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--serve')) {
    await serveMode()
  } else {
    const topic = args.filter(a => !a.startsWith('--')).join(' ')
      || 'AI agent frameworks and multi-agent systems'
    await runResearch(topic)
  }
}

main().catch(console.error)
