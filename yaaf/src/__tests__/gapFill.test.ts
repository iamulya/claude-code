/**
 * Tests for Cost Tracker, Guardrails, Coordinator, Circuit Breaker,
 * Compaction Prompts, History Snipping, Content Replacement, Notifier,
 * and Scratchpad.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CostTracker } from '../utils/costTracker.js'
import { Guardrails, BudgetExceededError } from '../utils/guardrails.js'
import {
  buildCoordinatorPrompt,
  formatTaskNotification,
  parseTaskNotification,
  buildWorkerResult,
} from '../agents/coordinator.js'
import { CompactionCircuitBreaker } from '../context/circuitBreaker.js'
import { buildCompactionPrompt, stripAnalysisBlock, extractAnalysisBlock } from '../context/compactionPrompts.js'
import { snipHistory, deduplicateToolResults } from '../context/historySnip.js'
import { ContentReplacementTracker } from '../context/contentReplacement.js'
import { BufferNotifier, ConsoleNotifier, CompositeNotifier } from '../utils/notifier.js'
import { Scratchpad } from '../agents/scratchpad.js'

// ════════════════════════════════════════════════════════════════════════════
// Cost Tracker
// ════════════════════════════════════════════════════════════════════════════

describe('CostTracker', () => {
  let tracker: CostTracker

  beforeEach(() => {
    tracker = new CostTracker()
  })

  it('records usage and computes cost', () => {
    const cost = tracker.record('gpt-4o', { inputTokens: 1_000_000, outputTokens: 500_000 })
    expect(cost).toBeGreaterThan(0)
    expect(tracker.totalInputTokens).toBe(1_000_000)
    expect(tracker.totalOutputTokens).toBe(500_000)
    expect(tracker.totalCostUSD).toBe(cost)
  })

  it('tracks multiple models separately', () => {
    tracker.record('gpt-4o', { inputTokens: 1000, outputTokens: 500 })
    tracker.record('gpt-4o-mini', { inputTokens: 2000, outputTokens: 100 })

    expect(tracker.getAllModelUsage().size).toBe(2)
    expect(tracker.getModelUsage('gpt-4o')!.calls).toBe(1)
    expect(tracker.getModelUsage('gpt-4o-mini')!.calls).toBe(1)
  })

  it('accumulates calls to the same model', () => {
    tracker.record('gpt-4o', { inputTokens: 1000, outputTokens: 500 })
    tracker.record('gpt-4o', { inputTokens: 2000, outputTokens: 300 })

    const usage = tracker.getModelUsage('gpt-4o')!
    expect(usage.inputTokens).toBe(3000)
    expect(usage.outputTokens).toBe(800)
    expect(usage.calls).toBe(2)
  })

  it('marks unknown cost for unknown models', () => {
    tracker.record('my-custom-model', { inputTokens: 1000, outputTokens: 500 })
    expect(tracker.hasUnknownCost).toBe(true)
    expect(tracker.totalCostUSD).toBe(0)
  })

  it('formats cost strings', () => {
    expect(CostTracker.formatCost(0.0025)).toBe('$0.0025')
    expect(CostTracker.formatCost(1.55)).toBe('$1.55')
  })

  it('formats summary', () => {
    tracker.record('gpt-4o', { inputTokens: 5000, outputTokens: 2000 })
    const summary = tracker.formatSummary()
    expect(summary).toContain('Total cost:')
    expect(summary).toContain('Total tokens:')
  })

  it('save/restore round-trips', () => {
    tracker.record('gpt-4o', { inputTokens: 1000, outputTokens: 500 })
    const snapshot = tracker.save('session-1')

    const restored = CostTracker.restore(snapshot)
    expect(restored.totalInputTokens).toBe(1000)
    expect(restored.totalOutputTokens).toBe(500)
    expect(restored.totalCostUSD).toBe(tracker.totalCostUSD)
  })

  it('reset clears everything', () => {
    tracker.record('gpt-4o', { inputTokens: 1000, outputTokens: 500 })
    tracker.reset()
    expect(tracker.totalInputTokens).toBe(0)
    expect(tracker.totalCostUSD).toBe(0)
    expect(tracker.getAllModelUsage().size).toBe(0)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Guardrails
// ════════════════════════════════════════════════════════════════════════════

describe('Guardrails', () => {
  it('returns ok when under budget', () => {
    const guardrails = new Guardrails({ maxCostUSD: 10 })
    const tracker = new CostTracker()
    tracker.record('gpt-4o', { inputTokens: 1000, outputTokens: 500 })

    const result = guardrails.check(tracker)
    expect(result.status).toBe('ok')
    expect(result.blocked).toBe(false)
  })

  it('warns at warning threshold', () => {
    const guardrails = new Guardrails({
      maxTokensPerSession: 1000,
      warningPct: 80,
    })
    const tracker = new CostTracker({ 'test': { inputPerMillion: 0, outputPerMillion: 0 } })
    tracker.record('test', { inputTokens: 450, outputTokens: 400 }) // 850/1000 = 85%

    const result = guardrails.check(tracker)
    expect(result.status).toBe('warning')
    expect(result.blocked).toBe(false)
  })

  it('blocks when over budget', () => {
    const guardrails = new Guardrails({ maxTokensPerSession: 1000 })
    const tracker = new CostTracker({ 'test': { inputPerMillion: 0, outputPerMillion: 0 } })
    tracker.record('test', { inputTokens: 600, outputTokens: 500 }) // 1100/1000 > 100%

    const result = guardrails.check(tracker)
    expect(result.status).toBe('blocked')
    expect(result.blocked).toBe(true)
  })

  it('enforce() throws BudgetExceededError', () => {
    const guardrails = new Guardrails({ maxTurnsPerRun: 2 })
    const tracker = new CostTracker()
    guardrails.recordTurn()
    guardrails.recordTurn()
    guardrails.recordTurn() // Over limit

    expect(() => guardrails.enforce(tracker)).toThrow(BudgetExceededError)
  })

  it('emits events', () => {
    const guardrails = new Guardrails({ maxTurnsPerRun: 10, warningPct: 80 })
    const events: Array<{ type: string }> = []
    guardrails.on(e => events.push(e))

    const tracker = new CostTracker()
    // Record 9 turns (90% = error threshold at 95% not yet)
    for (let i = 0; i < 9; i++) guardrails.recordTurn()
    guardrails.check(tracker)

    expect(events.length).toBeGreaterThanOrEqual(1)
    expect(events[0]!.type).toBe('warning')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Coordinator
// ════════════════════════════════════════════════════════════════════════════

describe('Coordinator', () => {
  it('builds coordinator prompt with workers', () => {
    const prompt = buildCoordinatorPrompt({
      workers: [
        { id: 'researcher', description: 'Research agent', tools: [] },
        { id: 'implementer', description: 'Implementation', tools: [] },
      ],
    })

    expect(prompt).toContain('coordinator')
    expect(prompt).toContain('researcher')
    expect(prompt).toContain('implementer')
    expect(prompt).toContain('Parallelism')
  })

  it('includes scratchpad section when provided', () => {
    const prompt = buildCoordinatorPrompt({
      workers: [{ id: 'w1', description: 'Worker', tools: [] }],
      scratchpadDir: '/tmp/scratch',
    })

    expect(prompt).toContain('/tmp/scratch')
    expect(prompt).toContain('Scratchpad')
  })

  it('formats and parses task notifications', () => {
    const notif = {
      taskId: 'worker-1',
      status: 'completed' as const,
      summary: 'Fixed the auth bug',
      result: 'Modified login.ts lines 42-50',
    }

    const xml = formatTaskNotification(notif)
    expect(xml).toContain('<task-notification>')

    const parsed = parseTaskNotification(xml)
    expect(parsed).not.toBeNull()
    expect(parsed!.taskId).toBe('worker-1')
    expect(parsed!.status).toBe('completed')
    expect(parsed!.summary).toBe('Fixed the auth bug')
    expect(parsed!.result).toBe('Modified login.ts lines 42-50')
  })

  it('buildWorkerResult creates valid XML', () => {
    const xml = buildWorkerResult('w-1', 'completed', 'Done', { totalTokens: 5000 })
    const parsed = parseTaskNotification(xml)!
    expect(parsed.taskId).toBe('w-1')
    expect(parsed.usage!.totalTokens).toBe(5000)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Circuit Breaker
// ════════════════════════════════════════════════════════════════════════════

describe('CompactionCircuitBreaker', () => {
  it('starts closed', () => {
    const breaker = new CompactionCircuitBreaker()
    expect(breaker.isClosed).toBe(true)
    expect(breaker.isOpen).toBe(false)
  })

  it('opens after consecutive failures', () => {
    const breaker = new CompactionCircuitBreaker({ maxConsecutiveFailures: 3 })
    breaker.recordFailure()
    breaker.recordFailure()
    expect(breaker.isClosed).toBe(true)

    breaker.recordFailure()
    expect(breaker.isOpen).toBe(true)
  })

  it('resets on success', () => {
    const breaker = new CompactionCircuitBreaker({ maxConsecutiveFailures: 2 })
    breaker.recordFailure()
    breaker.recordFailure()
    expect(breaker.isOpen).toBe(true)

    breaker.recordSuccess()
    expect(breaker.isClosed).toBe(true)
    expect(breaker.failures).toBe(0)
  })

  it('auto-resets after timeout', async () => {
    const breaker = new CompactionCircuitBreaker({
      maxConsecutiveFailures: 1,
      autoResetMs: 10,
    })
    breaker.recordFailure()
    expect(breaker.isOpen).toBe(true)
    // Wait longer than the auto-reset timeout
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(breaker.isClosed).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Compaction Prompts
// ════════════════════════════════════════════════════════════════════════════

describe('Compaction Prompts', () => {
  it('builds full compaction prompt', () => {
    const prompt = buildCompactionPrompt()
    expect(prompt).toContain('CRITICAL: Respond with TEXT ONLY')
    expect(prompt).toContain('Primary Request and Intent')
    expect(prompt).toContain('<analysis>')
    expect(prompt).toContain('<summary>')
  })

  it('builds partial compaction prompt', () => {
    const prompt = buildCompactionPrompt({ partial: true })
    expect(prompt).toContain('recent messages')
  })

  it('strips analysis block', () => {
    const text = '<analysis>My analysis here</analysis>\n<summary>The actual summary</summary>'
    expect(stripAnalysisBlock(text)).toBe('The actual summary')
  })

  it('extractAnalysisBlock returns analysis content', () => {
    const text = '<analysis>My analysis</analysis><summary>Summary</summary>'
    expect(extractAnalysisBlock(text)).toBe('My analysis')
  })

  it('stripAnalysisBlock returns full text if no tags', () => {
    const text = 'Just plain text without tags'
    expect(stripAnalysisBlock(text)).toBe(text)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// History Snipping
// ════════════════════════════════════════════════════════════════════════════

describe('History Snipping', () => {
  it('snips old large tool results', () => {
    const messages = [
      // Old tool result (index 0, age = 25 from end)
      { role: 'tool', content: 'x'.repeat(500), toolName: 'read_file', toolCallId: 'tc1' },
      ...Array.from({ length: 24 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      })),
    ]

    const result = snipHistory(messages, {
      maxToolResultAge: 20,
      minSnipTokens: 50,
      keepRecent: 0,
    })

    expect(result.itemsRemoved).toBe(1)
    expect(result.tokensFreed).toBeGreaterThan(0)
    expect(result.snipped[0]!.content).toBe('[Old tool result cleared]')
  })

  it('keeps recent tool results', () => {
    const messages = [
      { role: 'tool', content: 'x'.repeat(500), toolCallId: 'tc1' },
      { role: 'user', content: 'hello' },
    ]

    const result = snipHistory(messages, {
      maxToolResultAge: 0,
      keepRecent: 5,
    })

    expect(result.itemsRemoved).toBe(0)
  })

  it('deduplicates identical tool results', () => {
    const messages = [
      { role: 'tool', content: 'Same output', toolName: 'cat', toolCallId: 'tc1' },
      { role: 'user', content: 'again' },
      { role: 'tool', content: 'Same output', toolName: 'cat', toolCallId: 'tc2' },
    ]

    const result = deduplicateToolResults(messages)
    expect(result.itemsRemoved).toBe(1)
    // The first occurrence is the duplicate (earlier one)
    expect(result.snipped[0]!.content).toContain('Duplicate')
    expect(result.snipped[2]!.content).toBe('Same output') // Last one preserved
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Content Replacement Tracker
// ════════════════════════════════════════════════════════════════════════════

describe('ContentReplacementTracker', () => {
  let tracker: ContentReplacementTracker

  beforeEach(() => {
    tracker = new ContentReplacementTracker()
  })

  it('tracks file edits', () => {
    tracker.recordEdit('src/auth.ts', { type: 'modify', summary: 'Added null check' })
    expect(tracker.fileCount).toBe(1)
    expect(tracker.hasEdits).toBe(true)
    expect(tracker.getFileEdit('src/auth.ts')!.type).toBe('modify')
  })

  it('tracks create/delete', () => {
    tracker.recordCreate('src/new.ts', 'Created new file')
    tracker.recordDelete('src/old.ts')

    expect(tracker.fileCount).toBe(2)
    expect(tracker.getFileEdit('src/new.ts')!.type).toBe('create')
    expect(tracker.getFileEdit('src/old.ts')!.type).toBe('delete')
  })

  it('generates edit summary', () => {
    tracker.recordCreate('src/new.ts', 'Created new file')
    tracker.recordEdit('src/auth.ts', { type: 'modify', summary: 'Added null check' })

    const summary = tracker.getEditSummary()
    expect(summary).toContain('Created:')
    expect(summary).toContain('Modified:')
    expect(summary).toContain('src/new.ts')
    expect(summary).toContain('src/auth.ts')
  })

  it('generates compact summary', () => {
    tracker.recordEdit('a.ts', { type: 'modify', summary: 'X' })
    tracker.recordEdit('b.ts', { type: 'modify', summary: 'Y' })

    const compact = tracker.getCompactSummary()
    expect(compact).toContain('a.ts')
    expect(compact).toContain('b.ts')
  })

  it('save/restore round-trips', () => {
    tracker.recordEdit('src/auth.ts', { type: 'modify', summary: 'Fix' })
    const snapshot = tracker.save()

    const restored = ContentReplacementTracker.restore(snapshot)
    expect(restored.fileCount).toBe(1)
    expect(restored.getFileEdit('src/auth.ts')!.summary).toBe('Fix')
  })

  it('counts multiple edits', () => {
    tracker.recordEdit('a.ts', { type: 'modify', summary: 'First' })
    tracker.recordEdit('a.ts', { type: 'modify', summary: 'Second' })

    expect(tracker.getFileEdit('a.ts')!.editCount).toBe(2)
    expect(tracker.getFileEdit('a.ts')!.summary).toBe('Second')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Notifier
// ════════════════════════════════════════════════════════════════════════════

describe('Notifier', () => {
  it('BufferNotifier stores notifications', async () => {
    const buffer = new BufferNotifier()
    await buffer.notify({ type: 'completed', title: 'Test', message: 'Done' })

    expect(buffer.notifications.length).toBe(1)
    expect(buffer.last!.title).toBe('Test')
  })

  it('CompositeNotifier fans out', async () => {
    const buf1 = new BufferNotifier()
    const buf2 = new BufferNotifier()
    const composite = new CompositeNotifier([buf1, buf2])

    await composite.notify({ type: 'failed', title: 'Error', message: 'Oops' })

    expect(buf1.notifications.length).toBe(1)
    expect(buf2.notifications.length).toBe(1)
  })

  it('BufferNotifier respects max size', async () => {
    const buffer = new BufferNotifier(2)
    await buffer.notify({ type: 'info', title: 'A', message: 'a' })
    await buffer.notify({ type: 'info', title: 'B', message: 'b' })
    await buffer.notify({ type: 'info', title: 'C', message: 'c' })

    expect(buffer.notifications.length).toBe(2)
    expect(buffer.notifications[0]!.title).toBe('B')
  })

  it('BufferNotifier clear works', async () => {
    const buffer = new BufferNotifier()
    await buffer.notify({ type: 'info', title: 'X', message: 'x' })
    buffer.clear()
    expect(buffer.notifications.length).toBe(0)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Scratchpad
// ════════════════════════════════════════════════════════════════════════════

describe('Scratchpad', () => {
  let scratch: Scratchpad

  beforeEach(() => {
    scratch = new Scratchpad({
      baseDir: `/tmp/yaaf-test-scratch-${Date.now()}`,
    })
  })

  it('write and read file', async () => {
    await scratch.write('test.txt', 'Hello World')
    const content = await scratch.read('test.txt')
    expect(content).toBe('Hello World')
    await scratch.destroy()
  })

  it('exists check', async () => {
    expect(await scratch.exists('nope.txt')).toBe(false)
    await scratch.write('yes.txt', 'hi')
    expect(await scratch.exists('yes.txt')).toBe(true)
    await scratch.destroy()
  })

  it('list files', async () => {
    await scratch.write('a.txt', 'aaa')
    await scratch.write('b.txt', 'bbb')
    const files = await scratch.list()
    expect(files.length).toBe(2)
    expect(files.map(f => f.name).sort()).toEqual(['a.txt', 'b.txt'])
    await scratch.destroy()
  })

  it('reject path traversal', async () => {
    await expect(scratch.write('../etc/passwd', 'evil')).rejects.toThrow('Invalid')
    await scratch.destroy()
  })

  it('remove file', async () => {
    await scratch.write('temp.txt', 'tmp')
    await scratch.remove('temp.txt')
    expect(await scratch.exists('temp.txt')).toBe(false)
    await scratch.destroy()
  })
})
