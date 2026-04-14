/**
 * Agent Swarm Example
 *
 * Demonstrates:
 *   - AgentOrchestrator: spawn, monitor, and kill agents as a managed pool
 *   - Mailbox: file-based inter-agent message passing (IPC)
 *   - TaskManager: track task lifecycle (pending → running → completed)
 *   - loop workflow: self-correcting refinement loop
 *   - EventBus: typed publish-subscribe for swarm coordination events
 *   - buildCoordinatorPrompt: coordinator-worker prompt pattern
 *
 * Architecture:
 *   Coordinator Agent
 *       ├── Research Worker  (web search + summarise)
 *       ├── Analysis Worker  (synthesise + critique)
 *       └── Writer Worker    (final report assembly)
 *
 * Run:
 *   GEMINI_API_KEY=...    npx tsx src/index.ts
 *   OPENAI_API_KEY=sk-... npx tsx src/index.ts
 */

import { tmpdir } from 'os'
import { join } from 'path'
import { mkdtemp } from 'fs/promises'
import {
  Agent,
  TaskManager,
  Mailbox,
  EventBus,
  loop,
  buildTool,
  buildCoordinatorPrompt,
  buildWorkerResult,
} from 'yaaf'

// ─── types ───────────────────────────────────────────────────────────────────

type SwarmEvents = {
  'worker:started':   { workerId: string; task: string }
  'worker:completed': { workerId: string; result: string; durationMs: number }
  'worker:failed':    { workerId: string; error: string }
  'swarm:complete':   { totalMs: number; workerCount: number }
}

// ─── tools ───────────────────────────────────────────────────────────────────

function makeResearchTool(workerId: string) {
  return buildTool({
    name: 'research',
    inputSchema: {
      type: 'object',
      properties: { topic: { type: 'string' } },
      required: ['topic'],
    },
    maxResultChars: 3000,
    describe: () => 'Research a topic and return key facts.',
    call: async (input: Record<string, unknown>) => {
      // Simulate async research
      await new Promise(r => setTimeout(r, 300))
      return {
        data: `[${workerId} research on "${input.topic}"]\n` +
              `• AI coding assistants are growing rapidly, with GitHub Copilot serving 1M+ developers\n` +
              `• Key players: Copilot, Cursor, Codeium, Tabnine, Amazon Q\n` +
              `• Adoption increases developer productivity by 30-55% in controlled studies\n` +
              `• Main concerns: code quality, security, IP ownership, over-reliance\n` +
              `• Enterprise adoption has tripled in 2025 vs 2024`
      }
    },
    isReadOnly: () => true,
  })
}

function makeAnalysisTool(workerId: string) {
  return buildTool({
    name: 'analyse',
    inputSchema: {
      type: 'object',
      properties: { content: { type: 'string' } },
      required: ['content'],
    },
    maxResultChars: 3000,
    describe: () => 'Critically analyse a piece of content.',
    call: async (input: Record<string, unknown>) => {
      await new Promise(r => setTimeout(r, 200))
      return {
        data: `[${workerId} analysis]\n` +
              `Strengths: Strong market momentum, clear productivity gains\n` +
              `Weaknesses: Security and IP concerns unresolved\n` +
              `Opportunities: Enterprise onboarding, IDE-native integrations\n` +
              `Risks: Regulatory pressure, model vendor lock-in\n` +
              `Verdict: Market is real and growing but consolidation expected`
      }
    },
    isReadOnly: () => true,
  })
}

// ─── worker factory ───────────────────────────────────────────────────────────

function createWorker(
  id: string,
  role: string,
  tools: ReturnType<typeof buildTool>[],
): Agent {
  return new Agent({
    name: id,
    systemPrompt: `You are the ${role} in a multi-agent research team.
Your ID is "${id}". Be concise and focus only on your role.
Always use your tools to gather information before responding.`,
    tools,
  })
}

// ─── helper ──────────────────────────────────────────────────────────────────

function banner(title: string) {
  console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`)
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const swarmStart = Date.now()
  const mailboxDir = await mkdtemp(join(tmpdir(), 'yaaf-swarm-'))
  const topic = 'AI coding assistants in 2026'

  banner(`Starting Agent Swarm — Topic: "${topic}"`)

  // ── EventBus: typed swarm-wide event bus ─────────────────────────────────
  const bus = new EventBus<SwarmEvents>()
  bus.on('worker:started',   e => console.log(`  🚀 [${e.workerId}] started: ${e.task}`))
  bus.on('worker:completed', e => console.log(`  ✅ [${e.workerId}] done in ${e.durationMs}ms`))
  bus.on('worker:failed',    e => console.log(`  ❌ [${e.workerId}] failed: ${e.error}`))
  bus.on('swarm:complete',   e => console.log(`  🏁 Swarm done in ${e.totalMs}ms (${e.workerCount} workers)`))

  // ── TaskManager: track each worker task ──────────────────────────────────
  const tasks = new TaskManager((snapshot: Map<string, any>) => {
    const values = Array.from(snapshot.values())
    const running = values.filter(t => t.status === 'running').length
    const done    = values.filter(t => t.status === 'completed').length
    process.stdout.write(`\r  Tasks: ${done} completed, ${running} running     `)
  })

  // ── Mailbox: file-based IPC between workers ───────────────────────────────
  const mailbox = new Mailbox({ baseDir: mailboxDir, defaultTeam: 'research-swarm' })

  // ── Spawn workers ─────────────────────────────────────────────────────────
  banner('Phase 1: Research')

  const researchTask = tasks.create('agent', `Research: ${topic}`)
  const analysisTask = tasks.create('agent', `Analysis: ${topic}`)

  // ── Research worker ────────────────────────────────────────────────────────
  const researcher = createWorker('researcher', 'Research Specialist', [makeResearchTool('researcher')])
  tasks.transition(researchTask.id, 'running')
  bus.emit('worker:started', { workerId: 'researcher', task: `Research: ${topic}` })

  const researchStart = Date.now()
  let researchResult: string
  try {
    researchResult = await researcher.run(
      `Research the topic: "${topic}". Use the research tool to gather facts, then summarise them in bullet points.`
    )
    tasks.transition(researchTask.id, 'completed')
    bus.emit('worker:completed', { workerId: 'researcher', result: researchResult, durationMs: Date.now() - researchStart })
  } catch (err) {
    researchResult = 'Research failed'
    tasks.transition(researchTask.id, 'failed', String(err))
    bus.emit('worker:failed', { workerId: 'researcher', error: String(err) })
  }

  // Send research findings via mailbox to analyst
  await mailbox.send('analyst', {
    from: 'researcher',
    text: researchResult,
  })

  banner('Phase 2: Analysis')

  // ── Analysis worker: reads from mailbox ───────────────────────────────────
  const analyst = createWorker('analyst', 'Critical Analyst', [makeAnalysisTool('analyst')])
  tasks.transition(analysisTask.id, 'running')
  bus.emit('worker:started', { workerId: 'analyst', task: `Analyse research on: ${topic}` })

  // Read research from mailbox
  const inbox = await mailbox.readAll('analyst')
  const researchFromMailbox = inbox[0]?.text ?? researchResult

  const analysisStart = Date.now()
  let analysisResult: string
  try {
    analysisResult = await analyst.run(
      `Analyse this research using your analyse tool:\n\n${researchFromMailbox}`
    )
    tasks.transition(analysisTask.id, 'completed')
    bus.emit('worker:completed', { workerId: 'analyst', result: analysisResult, durationMs: Date.now() - analysisStart })
  } catch (err) {
    analysisResult = 'Analysis failed'
    tasks.transition(analysisTask.id, 'failed', String(err))
    bus.emit('worker:failed', { workerId: 'analyst', error: String(err) })
  }

  // ── Loop workflow: Writer with self-correction ─────────────────────────────
  banner('Phase 3: Writing (Self-Correcting Loop)')

  const writerTask = tasks.create('agent', `Write report: ${topic}`)
  tasks.transition(writerTask.id, 'running')
  bus.emit('worker:started', { workerId: 'writer', task: `Write final report on: ${topic}` })

  const writer = new Agent({
    name: 'writer',
    systemPrompt: `You are a professional technical writer. Write clear, structured reports.
Always start with a # heading, include sections for Overview, Key Findings, and Conclusion.
Keep the report under 300 words.`,
  })

  let iterationCount = 0

  const writingLoop = loop(
    [{
      // Step 1: draft or improve the report
      run: async (input: string) => {
        iterationCount++
        const prompt = iterationCount === 1
          ? `Write a structured report on "${topic}" using this research and analysis:\n\nRESEARCH:\n${researchResult}\n\nANALYSIS:\n${analysisResult}`
          : `Improve this report — make it more concise and add a concrete recommendation:\n\n${input}`
        return writer.run(prompt)
      },
    }],
    {
      maxIterations: 2,
      shouldExit: (result) => {
        // Exit if the report has all required sections
        return result.includes('#') &&
               result.toLowerCase().includes('conclusion') &&
               result.length > 200
      },
    }
  )

  const writerStart = Date.now()
  let finalReport: string
  try {
    finalReport = await writingLoop.run('')
    tasks.transition(writerTask.id, 'completed')
    bus.emit('worker:completed', {
      workerId: 'writer',
      result: finalReport,
      durationMs: Date.now() - writerStart,
    })
  } catch (err) {
    finalReport = 'Report generation failed'
    tasks.transition(writerTask.id, 'failed', String(err))
    bus.emit('worker:failed', { workerId: 'writer', error: String(err) })
  }

  // ── Final swarm status ─────────────────────────────────────────────────────
  console.log('\n') // clear progress line

  const allTasks = tasks.getAll()
  bus.emit('swarm:complete', {
    totalMs: Date.now() - swarmStart,
    workerCount: allTasks.length,
  })

  banner('Task Manager Final Status')
  allTasks.forEach(t => {
    const elapsed = tasks.getElapsedMs(t.id)
    console.log(`  [${t.status.toUpperCase().padEnd(10)}] ${t.description} (${elapsed}ms)`)
  })

  // ── Mailbox summary ────────────────────────────────────────────────────────
  banner('Mailbox Summary')

  const allMessages = await mailbox.readAll('analyst')
  console.log(`\n  Messages in analyst mailbox: ${allMessages.length}`)
  console.log(`  Message from: ${allMessages[0]?.from ?? 'none'}`)
  console.log(`  Mailbox dir: ${mailboxDir}`)

  // ── Final report ──────────────────────────────────────────────────────────
  banner('Final Report (Writer Output)')
  console.log('\n' + finalReport)
}

main().catch(console.error)
