/**
 * Permissions & Hooks Example
 *
 * Demonstrates:
 *   - PermissionPolicy: allow/deny/requireApproval rules with glob matching
 *   - cliApproval(): interactive approval prompt in the terminal
 *   - Hooks: beforeToolCall (observability + blocking), afterToolCall (audit log)
 *   - tool:blocked and tool:sandbox-violation events
 *
 * Run:
 *   GEMINI_API_KEY=...    npx tsx src/main.ts
 *   OPENAI_API_KEY=sk-... npx tsx src/main.ts
 */


import { buildTool, Agent, PermissionPolicy, cliApproval, type Hooks } from 'yaaf'

// ── Simulated file system tools ────────────────────────────────────────────────

const readTool = buildTool({
  name: 'read_file',
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string', description: 'File path to read' } },
    required: ['path'],
  },
  maxResultChars: 10_000,
  describe: ({ path }) => `Read ${path}`,
  async call({ path }) {
    // Simulated — returns fake content
    return {
      data: `Contents of ${String(path)}:\n\nThis is example file content.\nLine 2.\nLine 3.`,
    }
  },
  isReadOnly: () => true,
})

const writeTool = buildTool({
  name: 'write_file',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path to write' },
      content: { type: 'string', description: 'Content to write' },
    },
    required: ['path', 'content'],
  },
  maxResultChars: 500,
  describe: ({ path }) => `Write ${path}`,
  async call({ path, content }) {
    console.log(`    [write_file] Would write ${(content as string).length} bytes to ${path}`)
    return { data: `Successfully wrote to ${path}` }
  },
})

const deleteTool = buildTool({
  name: 'delete_file',
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string', description: 'File path to delete' } },
    required: ['path'],
  },
  maxResultChars: 200,
  describe: ({ path }) => `Delete ${path}`,
  async call({ path }) {
    return { data: `Deleted ${path}` }
  },
  isDestructive: () => true,
})

const execTool = buildTool({
  name: 'exec_command',
  inputSchema: {
    type: 'object',
    properties: { command: { type: 'string', description: 'Shell command to execute' } },
    required: ['command'],
  },
  maxResultChars: 5_000,
  describe: ({ command }) => `Run: ${command}`,
  async call({ command }) {
    return { data: `Simulated output of: ${command}\n(exit 0)` }
  },
})

// ── Audit log (in-memory) ─────────────────────────────────────────────────────

type AuditEntry = {
  ts: string
  tool: string
  args: Record<string, unknown>
  decision: 'allowed' | 'blocked' | 'approved'
  result?: string
  error?: string
}

const auditLog: AuditEntry[] = []

// ── Hooks ─────────────────────────────────────────────────────────────────────

const hooks: Hooks = {
  beforeToolCall: async (ctx) => {
    // Log every tool call before it runs
    console.log(`\n  [hook:before] ${ctx.toolName}(${JSON.stringify(ctx.arguments)})`)
    // Example: block any command containing 'rm -rf'
    if (
      ctx.toolName === 'exec_command' &&
      typeof ctx.arguments.command === 'string' &&
      ctx.arguments.command.includes('rm -rf')
    ) {
      auditLog.push({
        ts: new Date().toISOString(),
        tool: ctx.toolName,
        args: ctx.arguments,
        decision: 'blocked',
      })
      return { action: 'block', reason: 'rm -rf is never allowed by policy' }
    }
    return { action: 'continue' }
  },

  afterToolCall: async (ctx, result, error) => {
    const entry: AuditEntry = {
      ts: new Date().toISOString(),
      tool: ctx.toolName,
      args: ctx.arguments,
      decision: 'allowed',
      result: typeof result === 'string' ? result.slice(0, 100) : undefined,
      error: error?.message,
    }
    auditLog.push(entry)
    console.log(`  [hook:after]  ${ctx.toolName} → ${error ? `ERROR: ${error.message}` : 'OK'}`)
    return { action: 'continue' }
  },
}

// ── Permission Policy ─────────────────────────────────────────────────────────

const permissions = new PermissionPolicy()
  // ✅ Read-only tools: always allowed
  .allow('read_file')
  // ✅ Exec: allowed but logged (hook handles blocking specific patterns)
  .allow('exec_command')
  // ⚠️  Write: require approval before running
  .requireApproval('write_file', 'write_file will modify files on disk')
  // ❌ Delete: always denied
  .deny('delete_file', 'file deletion is disabled by policy')
  // Wire up the CLI approval handler (prints the tool call, asks y/n)
  .onRequest(cliApproval())

// ── Colors ────────────────────────────────────────────────────────────────────

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', blue: '\x1b[34m', magenta: '\x1b[35m',
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${c.bold}${c.cyan}🔐 Permissions & Hooks Example${c.reset}`)
  console.log(`${c.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`)
  console.log(`\n${c.dim}Permission rules:`)
  console.log(`  ✅ read_file    — always allowed`)
  console.log(`  ✅ exec_command — allowed (hook blocks rm -rf)`)
  console.log(`  ⚠️  write_file  — requires interactive approval`)
  console.log(`  ❌ delete_file  — always denied${c.reset}\n`)

  const hasKey = !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY)

  if (!hasKey) {
    console.log(`${c.yellow}No API key set.${c.reset}`)
    console.log(`${c.dim}Set GEMINI_API_KEY or OPENAI_API_KEY to run the live agent demo.`)
    console.log(`\nThis example demonstrates:`)
    console.log(`  • PermissionPolicy — allow/deny/requireApproval per tool`)
    console.log(`  • cliApproval()    — interactive y/n prompt before write_file runs`)
    console.log(`  • Hooks            — beforeToolCall (blocking) + afterToolCall (audit)`)
    console.log(`  • tool:blocked     — event fired when a tool is denied`)
    console.log(`  • audit log        — every decision recorded in-memory${c.reset}\n`)
    return
  }

  const agent = new Agent({
    name: 'SecureAgent',
    systemPrompt: `You are a file system assistant. You can read files, write files, delete files, 
and run shell commands. Always explain what you are about to do before doing it.
When asked to demonstrate, try a variety of operations including some that might be restricted.`,
    tools: [readTool, writeTool, deleteTool, execTool],
    permissions,
    hooks,
    maxIterations: 10,
  })

  // Wire up agent events
  agent
    .on('tool:blocked', ({ name, reason }) => {
      console.log(`\n  ${c.yellow}🚫 BLOCKED${c.reset} ${name}: ${reason}`)
    })
    .on('tool:error', ({ name, error }) => {
      console.log(`\n  ${c.red}✗ ERROR${c.reset} ${name}: ${error}`)
    })

  const demoPrompts = [
    'Read the file /etc/hostname',
    'Run the command: echo "Hello from YAAF"',
    'Write "# Hello World" to /tmp/test.md',
    'Delete the file /tmp/test.md',
    'Run the command: rm -rf /tmp/important-data',
  ]

  console.log(`${c.dim}Running demo — trying various operations...${c.reset}\n`)

  for (const prompt of demoPrompts) {
    console.log(`\n${c.blue}▶ ${prompt}${c.reset}`)
    try {
      const response = await agent.run(prompt)
      console.log(`\n${c.green}Agent:${c.reset} ${response}`)
    } catch (err) {
      console.log(`\n${c.red}Error:${c.reset} ${err instanceof Error ? err.message : String(err)}`)
    }
    console.log(`${c.dim}${'─'.repeat(60)}${c.reset}`)
  }

  // Print audit log
  console.log(`\n${c.bold}${c.cyan}📋 Audit Log${c.reset}`)
  console.log(`${c.dim}${'─'.repeat(60)}${c.reset}`)
  for (const entry of auditLog) {
    const icon = entry.decision === 'blocked' ? '🚫' : entry.error ? '✗' : '✓'
    console.log(`${icon} [${entry.ts.split('T')[1]?.split('.')[0]}] ${entry.tool} → ${entry.decision}`)
  }
  console.log(`\n${c.dim}${auditLog.length} events recorded.${c.reset}\n`)
}

main().catch(err => { console.error(err); process.exit(1) })
