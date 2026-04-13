/**
 * Session Persistence Example
 *
 * Demonstrates:
 *   - Session.resumeOrCreate(id, dir): load or create fresh
 *   - Conversation history survives process restarts (crash recovery)
 *   - session.append(): persist new turns incrementally
 *   - listSessions(dir): see all persisted sessions
 *   - pruneOldSessions(maxAgeMs, dir): housekeeping
 *
 * Run this example TWICE to see persistence in action:
 *   First run:  creates session, runs a conversation
 *   Second run: resumes the session, agent remembers the history
 *
 *   npx tsx src/main.ts                        # no API key — shows session files
 *   GEMINI_API_KEY=...    npx tsx src/main.ts   # full conversation
 *   OPENAI_API_KEY=sk-... npx tsx src/main.ts
 */

import { Agent, Session, listSessions, pruneOldSessions, buildTool } from 'yaaf'

// ── A simple counter tool (stateful, to prove persistence) ────────────────────

let callCount = 0

const counterTool = buildTool({
  name: 'increment_counter',
  inputSchema: {
    type: 'object',
    properties: {
      amount: { type: 'number', description: 'Amount to add to counter' },
    },
    required: [],
  },
  maxResultChars: 200,
  describe: (input) => `Increment counter by ${Number(input.amount ?? 1)}`,
  async call({ amount }) {
    callCount += Number(amount ?? 1)
    return { data: `Counter is now: ${callCount}` }
  },
})

// ── Colors ────────────────────────────────────────────────────────────────────

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${c.bold}${c.cyan}💾 Session Persistence Example${c.reset}`)
  console.log(`${c.dim}Run this twice to see conversation history survive restarts${c.reset}\n`)

  const sessionDir = '/tmp/yaaf-sessions-example'
  const sessionId = 'demo-session'
  const hasKey = !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY)

  if (!hasKey) {
    console.log(`${c.yellow}No API key set — demonstrating session file I/O only.${c.reset}`)
    console.log(`${c.dim}Set GEMINI_API_KEY or OPENAI_API_KEY for full conversation demo.${c.reset}\n`)
  }

  // ── List existing sessions ─────────────────────────────────────────────────
  // listSessions(dir) returns string[] of IDs
  const existingIds = await listSessions(sessionDir)
  if (existingIds.length > 0) {
    console.log(`${c.yellow}Found ${existingIds.length} existing session(s):${c.reset}`)
    for (const id of existingIds) {
      console.log(`  • ${id}`)
    }
    console.log()
  } else {
    console.log(`${c.dim}No existing sessions found. Starting fresh.${c.reset}\n`)
  }

  // ── Resume or create session ───────────────────────────────────────────────
  // Session.resumeOrCreate(id: string, dir?: string) — dir is a plain string
  const session = await Session.resumeOrCreate(sessionId, sessionDir)
  const isResuming = session.messageCount > 0

  if (isResuming) {
    console.log(`${c.green}✓ Resumed session "${sessionId}"${c.reset}`)
    console.log(`  ${session.messageCount} messages in history\n`)
  } else {
    console.log(`${c.cyan}✓ Created new session "${sessionId}"${c.reset}\n`)
  }

  // ── Create agent with session ──────────────────────────────────────────────
  const agentConfig = {
    name: 'PersistentAgent',
    systemPrompt: `You are a helpful assistant with memory across sessions.
You have access to a counter tool. When asked about session history,
reference the conversation history that has been loaded.`,
    tools: [counterTool],
    session,
  }

  // ── Run a conversation ─────────────────────────────────────────────────────
  const turns: string[] = isResuming
    ? [
        'What do you remember from our last conversation?',
        'Increment the counter by 5',
        'How many total turns have we had across all sessions?',
      ]
    : [
        'Hello! This is our first conversation. My name is Alice.',
        'Increment the counter by 3',
        'Remember this session ID for me: demo-session-abc-123',
      ]

  if (hasKey) {
    const agent = new Agent(agentConfig)

    for (const turn of turns) {
      console.log(`${c.blue}You:${c.reset} ${turn}`)
      const response = await agent.run(turn)
      console.log(`${c.green}Agent:${c.reset} ${response}\n`)

      // Persist this turn to the session file
      await session.append([
        { role: 'user', content: turn },
        { role: 'assistant', content: response },
      ])
    }
  } else {
    // No API key — write synthetic turns so the file demo still works
    console.log(`${c.dim}Writing ${turns.length} synthetic turns to session file...${c.reset}\n`)
    for (const turn of turns) {
      console.log(`${c.blue}You [simulated]:${c.reset} ${turn}`)
      const reply = `[Simulated reply to: "${turn.slice(0, 40)}..."]`
      console.log(`${c.green}Agent [simulated]:${c.reset} ${reply}\n`)
      await session.append([
        { role: 'user', content: turn },
        { role: 'assistant', content: reply },
      ])
    }
  }

  // ── Show session state ─────────────────────────────────────────────────────
  console.log(`${c.dim}${'─'.repeat(50)}${c.reset}`)
  console.log(`\n${c.bold}Session Status:${c.reset}`)
  console.log(`  ID:       ${session.id}`)
  console.log(`  Messages: ${session.messageCount}`)
  console.log(`  File:     ${sessionDir}/${sessionId}.jsonl`)

  // ── Housekeeping ──────────────────────────────────────────────────────────
  // pruneOldSessions(maxAgeMs, dir?) — prune sessions older than maxAgeMs
  const pruned = await pruneOldSessions(
    7 * 24 * 60 * 60 * 1000, // 7 days
    sessionDir,
  )
  if (pruned.length > 0) {
    console.log(`\n${c.dim}Pruned ${pruned.length} old session(s): ${pruned.join(', ')}${c.reset}`)
  }

  console.log(`\n${c.dim}Run this script again to resume the session!${c.reset}\n`)
}

main().catch(err => { console.error(err); process.exit(1) })
