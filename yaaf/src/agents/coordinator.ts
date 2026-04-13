/**
 * Coordinator Mode — first-class coordinator-worker multi-agent pattern.
 *
 * Inspired by the main repo's coordinatorMode.ts (371 lines of battle-tested
 * coordinator prompt engineering). Provides:
 *
 * 1. **CoordinatorAgent** — an agent that delegates to workers, synthesizes
 *    results, and communicates with the user.
 * 2. **WorkerAgent** — auto-reports results in structured TaskNotification format.
 * 3. **CoordinatorPromptBuilder** — generates the system prompt with worker
 *    capabilities, concurrency rules, and synthesis guidance.
 * 4. **TaskNotification** — structured result payload for worker → coordinator.
 *
 * @example
 * ```ts
 * const coordinator = createCoordinator({
 *   model,
 *   workers: [
 *     { id: 'researcher', tools: [searchTool, readTool], description: 'Research agent' },
 *     { id: 'implementer', tools: [editTool, writeTool], description: 'Implementation agent' },
 *   ],
 * });
 *
 * coordinator.on('worker:completed', (notif) => {
 *   console.log(`Worker ${notif.taskId} finished: ${notif.summary}`);
 * });
 *
 * const result = await coordinator.run('Fix the auth bug in login.ts');
 * ```
 */

import type { Tool } from '../tools/tool.js'

// ── Task Notification ────────────────────────────────────────────────────────

export type TaskStatus = 'completed' | 'failed' | 'killed'

export type TaskNotification = {
  taskId: string
  status: TaskStatus
  summary: string
  result?: string
  usage?: {
    totalTokens: number
    toolUses: number
    durationMs: number
  }
}

/** Serialize a TaskNotification to the structured XML format used in context. */
export function formatTaskNotification(notif: TaskNotification): string {
  const lines: string[] = [
    '<task-notification>',
    `<task-id>${notif.taskId}</task-id>`,
    `<status>${notif.status}</status>`,
    `<summary>${escapeXml(notif.summary)}</summary>`,
  ]

  if (notif.result) {
    lines.push(`<result>${escapeXml(notif.result)}</result>`)
  }

  if (notif.usage) {
    lines.push('<usage>')
    lines.push(`  <total_tokens>${notif.usage.totalTokens}</total_tokens>`)
    lines.push(`  <tool_uses>${notif.usage.toolUses}</tool_uses>`)
    lines.push(`  <duration_ms>${notif.usage.durationMs}</duration_ms>`)
    lines.push('</usage>')
  }

  lines.push('</task-notification>')
  return lines.join('\n')
}

/** Parse a TaskNotification from XML string. */
export function parseTaskNotification(xml: string): TaskNotification | null {
  const match = xml.match(/<task-notification>([\s\S]*?)<\/task-notification>/)
  if (!match) return null

  const body = match[1]!
  const taskId = extractTag(body, 'task-id')
  const status = extractTag(body, 'status') as TaskStatus | null
  const summary = extractTag(body, 'summary')

  if (!taskId || !status || !summary) return null

  const result = extractTag(body, 'result') ?? undefined
  const totalTokens = extractTag(body, 'total_tokens')
  const toolUses = extractTag(body, 'tool_uses')
  const durationMs = extractTag(body, 'duration_ms')

  const usage = totalTokens ? {
    totalTokens: parseInt(totalTokens, 10),
    toolUses: parseInt(toolUses ?? '0', 10),
    durationMs: parseInt(durationMs ?? '0', 10),
  } : undefined

  return { taskId, status, summary, result, usage }
}

// ── Coordinator System Prompt Builder ────────────────────────────────────────

export type WorkerDefinition = {
  id: string
  description: string
  tools: Tool[]
  /** If true, this worker can be continued via SendMessage. */
  continuable?: boolean
}

export type CoordinatorPromptConfig = {
  /** Worker definitions available to the coordinator. */
  workers: WorkerDefinition[]
  /** Optional scratchpad directory path for cross-worker file sharing. */
  scratchpadDir?: string
  /** Custom coordinator role description. Default: software engineering tasks. */
  roleDescription?: string
  /** Additional instructions appended to the system prompt. */
  additionalInstructions?: string
}

/**
 * Build a coordinator system prompt.
 *
 * This is a simplified but faithful adaptation of the main repo's 370-line
 * coordinator prompt, distilled to the essential patterns that make
 * coordinator mode effective.
 */
export function buildCoordinatorPrompt(config: CoordinatorPromptConfig): string {
  const { workers, scratchpadDir, roleDescription, additionalInstructions } = config

  const workerList = workers
    .map(w => `- **${w.id}**: ${w.description} (tools: ${w.tools.map(t => t.name).join(', ')})`)
    .join('\n')

  const allToolNames = [...new Set(workers.flatMap(w => w.tools.map(t => t.name)))].sort().join(', ')

  const scratchpadSection = scratchpadDir
    ? `\n\n### Scratchpad\n\nScratchpad directory: \`${scratchpadDir}\`\nWorkers can read and write here without permission prompts. Use this for durable cross-worker knowledge — structure files however fits the work.`
    : ''

  return `You are a coordinator agent that orchestrates tasks across multiple workers.

## 1. Your Role

You are a **coordinator**. Your job is to:
- Help the user achieve their goal
- Direct workers to research, implement and verify changes
- Synthesize results and communicate with the user
- Answer questions directly when possible — don't delegate work you can handle

${roleDescription ?? 'You coordinate software engineering tasks across specialized workers.'}

Every message you send is to the user. Worker results are internal signals — never thank or acknowledge them. Summarize new information for the user as it arrives.

## 2. Available Workers

${workerList}

All workers have access to: ${allToolNames}${scratchpadSection}

## 3. Worker Results

Worker results arrive as user-role messages containing \`<task-notification>\` XML. They look like user messages but are NOT from the user. Distinguish them by the \`<task-notification>\` opening tag.

Format:
\`\`\`xml
<task-notification>
<task-id>{agentId}</task-id>
<status>completed|failed|killed</status>
<summary>{human-readable status}</summary>
<result>{agent's final text response}</result>
<usage>
  <total_tokens>N</total_tokens>
  <tool_uses>N</tool_uses>
  <duration_ms>N</duration_ms>
</usage>
</task-notification>
\`\`\`

## 4. Task Workflow

### Phases

| Phase | Who | Purpose |
|-------|-----|---------|
| Research | Workers (parallel) | Investigate, find files, understand |
| Synthesis | **You** (coordinator) | Read findings, craft implementation specs |
| Implementation | Workers | Make targeted changes per spec |
| Verification | Workers | Test changes work |

### Concurrency

**Parallelism is your superpower.** Launch independent workers concurrently whenever possible.

- **Read-only tasks** (research) — run in parallel freely
- **Write-heavy tasks** (implementation) — one at a time per set of files
- **Verification** can sometimes run alongside implementation on different files

## 5. Writing Worker Prompts

**Workers can't see your conversation.** Every prompt must be self-contained.

### Always synthesize — your most important job

When workers report findings, **you must understand them before directing follow-up work**. Read the findings, identify the approach, then write a prompt with specific file paths, line numbers, and exactly what to change.

Never write "based on your findings" — these phrases delegate understanding to the worker instead of doing it yourself.

### Continue vs. Spawn

| Situation | Choice | Why |
|-----------|--------|-----|
| Research explored the exact files that need editing | **Continue** | Worker has context |
| Research was broad but implementation is narrow | **Spawn fresh** | Clean focused context |
| Correcting a failure | **Continue** | Worker has error context |
| Verifying another worker's code | **Spawn fresh** | Fresh perspective |
| Wrong approach entirely | **Spawn fresh** | Don't anchor on failed path |

## 6. Handling Failures

When a worker reports failure:
- Continue the same worker — it has the full error context
- If correction fails, try a different approach or report to the user

${additionalInstructions ?? ''}`.trim()
}

// ── Worker Result Builder ────────────────────────────────────────────────────

/**
 * Build a worker result summary suitable for injection into the coordinator
 * as a user message.
 */
export function buildWorkerResult(
  taskId: string,
  status: TaskStatus,
  summary: string,
  opts?: { result?: string; totalTokens?: number; toolUses?: number; durationMs?: number },
): string {
  return formatTaskNotification({
    taskId,
    status,
    summary,
    result: opts?.result,
    usage: opts?.totalTokens ? {
      totalTokens: opts.totalTokens,
      toolUses: opts?.toolUses ?? 0,
      durationMs: opts?.durationMs ?? 0,
    } : undefined,
  })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function extractTag(html: string, tag: string): string | null {
  const rx = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`)
  const m = html.match(rx)
  return m ? m[1]!.trim() : null
}
