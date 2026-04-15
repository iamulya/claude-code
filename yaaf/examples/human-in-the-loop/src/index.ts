/**
 * Human-in-the-Loop Deployment Agent
 * ====================================
 * Demonstrates the `agent.step()` + `agent.resume()` stateless reducer API.
 *
 * This agent manages a deployment workflow where high-stakes tool calls
 * are suspended awaiting human approval before they execute.
 *
 * Architecture (12 Factor Agents — Factors 5, 6, 7, 12):
 *
 *   1. Human sends: "Deploy v1.2.3 to production"
 *   2. Agent calls step() → LLM decides to call deploy_to_production()
 *   3. Tool is marked requiresApproval → agent SUSPENDS
 *   4. Thread is serialized to disk (would be DB/Redis in real deployment)
 *   5. Human receives notification and approves/rejects via CLI prompt
 *   6. Thread is deserialized and agent.resume() continues from where it left off
 *   7. Tool executes → LLM summarizes → done
 *
 * Run:
 *   GEMINI_API_KEY=xxx npx tsx examples/human-in-the-loop/src/index.ts
 *   OPENAI_API_KEY=xxx npx tsx examples/human-in-the-loop/src/index.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import {
  Agent,
  createThread,
  serializeThread,
  deserializeThread,
  buildTool,
} from '../../../src/index.js'

// ── Tool Definitions ──────────────────────────────────────────────────────────

/** List available versions — safe, no approval needed */
const listVersionsTool = buildTool({
  name: 'list_versions',
  description: 'List available deployment versions from the registry',
  inputSchema: { type: 'object', properties: {}, required: [] },
  async call() {
    // Simulated registry
    return {
      versions: [
        { tag: 'v1.3.0', status: 'stable', date: '2025-04-14', changelog: 'Performance improvements' },
        { tag: 'v1.2.3', status: 'stable', date: '2025-04-10', changelog: 'Bug fixes' },
        { tag: 'v1.2.2', status: 'deprecated', date: '2025-04-01', changelog: 'Security patch' },
      ],
    }
  },
})

/** Get current deployment status — safe, no approval needed */
const getDeploymentStatusTool = buildTool({
  name: 'get_deployment_status',
  description: 'Get the current deployment status for an environment',
  inputSchema: {
    type: 'object',
    properties: {
      environment: { type: 'string', enum: ['staging', 'production'], description: 'Target environment' },
    },
    required: ['environment'],
  },
  async call({ environment }) {
    const statuses: Record<string, unknown> = {
      staging:    { version: 'v1.2.3', health: 'healthy', uptime: '12 days' },
      production: { version: 'v1.2.2', health: 'degraded', uptime: '25 days', warning: 'High memory usage' },
    }
    return statuses[environment] ?? { error: 'Unknown environment' }
  },
})

/** Run pre-deployment checks — safe, no approval needed */
const runPreflightChecksTool = buildTool({
  name: 'run_preflight_checks',
  description: 'Run pre-deployment validation checks for a version',
  inputSchema: {
    type: 'object',
    properties: {
      version: { type: 'string', description: 'Version tag to validate e.g. v1.3.0' },
      environment: { type: 'string', enum: ['staging', 'production'] },
    },
    required: ['version', 'environment'],
  },
  async call({ version, environment }) {
    await new Promise(r => setTimeout(r, 300)) // Simulate check
    return {
      version,
      environment,
      checks: {
        docker_image_exists: true,
        tests_passing: true,
        no_open_incidents: environment === 'staging' ? true : false, // Production has open incident
        rollback_plan_ready: true,
      },
      warnings: environment === 'production' ? ['Active incident P2-1234 in production'] : [],
      ready: environment === 'staging',
    }
  },
})

/**
 * Deploy to production — HIGH STAKES, requires human approval.
 * requiresApproval: true causes agent.step() to SUSPEND before this executes.
 */
const deployToProductionTool = buildTool({
  name: 'deploy_to_production',
  description: 'Deploy a version to the production environment. IRREVERSIBLE — requires approval.',
  inputSchema: {
    type: 'object',
    properties: {
      version: { type: 'string', description: 'Version tag to deploy e.g. v1.3.0' },
      reason: { type: 'string', description: 'Reason for deployment' },
    },
    required: ['version', 'reason'],
  },
  // This flag causes agent.step() to suspend for human approval
  requiresApproval: true,
  async call({ version, reason }) {
    console.log(`\n  🚀 Executing deployment of ${version} to production...`)
    await new Promise(r => setTimeout(r, 500)) // Simulate deployment
    return {
      status: 'success',
      version,
      environment: 'production',
      timestamp: new Date().toISOString(),
      deploymentId: `deploy_${Date.now()}`,
      url: `https://prod.example.com (running ${version})`,
    }
  },
} as Parameters<typeof buildTool>[0] & { requiresApproval: boolean })

/** Roll back production — also high stakes */
const rollbackTool = buildTool({
  name: 'rollback_production',
  description: 'Roll back production to the previous version',
  inputSchema: {
    type: 'object',
    properties: {
      reason: { type: 'string', description: 'Reason for rollback' },
    },
    required: ['reason'],
  },
  requiresApproval: true,
  async call({ reason }) {
    return {
      status: 'success',
      rolledBackTo: 'v1.2.2',
      reason,
      timestamp: new Date().toISOString(),
    }
  },
} as Parameters<typeof buildTool>[0] & { requiresApproval: boolean })

// ── Thread Persistence (file-backed, would be DB in production) ───────────────

const THREAD_FILE = path.join(process.cwd(), '.yaaf', 'hitl-demo-thread.json')

function saveThread(thread: ReturnType<typeof deserializeThread>): void {
  fs.mkdirSync(path.dirname(THREAD_FILE), { recursive: true })
  fs.writeFileSync(THREAD_FILE, serializeThread(thread), 'utf8')
  console.log(`  💾 Thread ${thread.id.slice(0, 8)} saved to disk (step ${thread.step})`)
}

function loadThread(): ReturnType<typeof deserializeThread> | null {
  try {
    return deserializeThread(fs.readFileSync(THREAD_FILE, 'utf8'))
  } catch {
    return null
  }
}

function clearThread(): void {
  try { fs.unlinkSync(THREAD_FILE) } catch { /* already gone */ }
}

// ── Human Approval via CLI ────────────────────────────────────────────────────

async function promptHuman(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => { rl.close(); resolve(answer.trim()) })
  })
}

// ── Main workflow ─────────────────────────────────────────────────────────────

async function main() {
  // Build agent with all tools
  const agent = new Agent({
    systemPrompt: `You are a deployment agent that manages production deployments safely.

Your workflow:
1. Check the current deployment status
2. List available versions if needed
3. Run preflight checks before any deployment
4. Use deploy_to_production only when the user has explicitly confirmed and checks pass
5. Always explain warnings before proceeding

IMPORTANT: Production deployments are irreversible. Be cautious and transparent.`,
    tools: [
      listVersionsTool,
      getDeploymentStatusTool,
      runPreflightChecksTool,
      deployToProductionTool,
      rollbackTool,
    ],
  })

  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║     Human-in-the-Loop Deployment Agent (YAAF demo)        ║')
  console.log('║     Demonstrating: agent.step() + agent.resume()          ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  // Check if there's a suspended thread waiting for resume
  const existingThread = loadThread()
  if (existingThread?.suspended) {
    console.log(`⚠️  Found suspended thread ${existingThread.id.slice(0, 8)} from a previous run`)
    console.log(`   Suspended at step ${existingThread.step}: ${existingThread.suspended.type}\n`)

    if (existingThread.suspended.type === 'awaiting_approval') {
      const { pendingToolCall, args } = existingThread.suspended
      console.log(`🔒 Pending approval for: ${pendingToolCall.name}`)
      console.log(`   Arguments: ${JSON.stringify(args, null, 2)}\n`)

      const answer = await promptHuman('Approve this action? [y/N/reason]: ')

      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log('\n✅ Approved — resuming agent...\n')
        let result = await agent.resume(existingThread, { type: 'approved' })
        let thread = result.thread

        // Continue stepping until done or suspended again
        while (!thread.done && !thread.suspended) {
          const next = await agent.step(thread)
          thread = next.thread
          if (next.suspended) break
        }

        if (thread.done) {
          console.log('\n✅ Deployment complete!\n')
          console.log(thread.finalResponse)
          clearThread()
        } else if (thread.suspended) {
          saveThread(thread)
          console.log('\n⏸️  Agent suspended again — run again to continue')
        }
      } else {
        const reason = answer || 'Rejected by human operator'
        console.log(`\n❌ Rejected: "${reason}" — resuming agent with rejection...\n`)
        let result = await agent.resume(existingThread, { type: 'rejected', reason })
        let thread = result.thread

        while (!thread.done && !thread.suspended) {
          const next = await agent.step(thread)
          thread = next.thread
        }
        console.log('\n', thread.finalResponse)
        clearThread()
      }
      return
    }
  }

  // Fresh start
  const userRequest = process.argv[2]
    ?? 'Please deploy the latest stable version to production. Check the current state first.'

  console.log(`📋 Task: "${userRequest}"\n`)

  // Create a new thread
  let thread = createThread(userRequest)
  let stepCount = 0
  const maxSteps = 15

  // Step loop — run until done or suspended
  while (!thread.done && !thread.suspended && stepCount < maxSteps) {
    stepCount++
    process.stdout.write(`  Step ${stepCount}... `)

    const result = await agent.step(thread)
    thread = result.thread

    // Print any tool calls that happened (visible in messages)
    const lastMessages = thread.messages.slice(-(thread.messages.length - (stepCount === 1 ? 1 : 0)))
    for (const msg of lastMessages) {
      if (msg.role === 'assistant' && msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          console.log(`\n  🔧 Calling: ${tc.name}(${tc.arguments.slice(0, 60)}...)`)
        }
      } else if (msg.role === 'tool') {
        const preview = msg.content.slice(0, 100).replace(/\n/g, ' ')
        console.log(`  → ${msg.name}: ${preview}`)
      }
    }

    if (!thread.done && !thread.suspended) {
      process.stdout.write('↻\n')
    }
  }

  // Handle suspension
  if (thread.suspended) {
    console.log('\n')
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║                  ⏸️  AGENT SUSPENDED                       ║')
    console.log('╚════════════════════════════════════════════════════════════╝')

    if (thread.suspended.type === 'awaiting_approval') {
      const { pendingToolCall, args, message } = thread.suspended
      console.log(`\n🔒 ${message}`)
      console.log(`\n   Tool:      ${pendingToolCall.name}`)
      console.log(`   Arguments: ${JSON.stringify(args, null, 2)}`)

      // Save thread to disk so it can be resumed in a new process
      saveThread(thread)

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      const answer = await promptHuman('\n🧑 Approve this action? [y/N/reason to reject]: ')

      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log('\n✅ Approved — executing tool and continuing...\n')
        let result = await agent.resume(thread, { type: 'approved' })
        thread = result.thread

        while (!thread.done && !thread.suspended) {
          const next = await agent.step(thread)
          thread = next.thread
        }

        clearThread()
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('🎉 Final response:\n')
        console.log(thread.finalResponse)
      } else {
        const reason = answer || 'Rejected by operator'
        console.log(`\n❌ Rejected: "${reason}"\n`)
        let result = await agent.resume(thread, { type: 'rejected', reason })
        thread = result.thread

        while (!thread.done && !thread.suspended) {
          const next = await agent.step(thread)
          thread = next.thread
        }

        clearThread()
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('📝 Final response:\n')
        console.log(thread.finalResponse)
      }
    }

    else if (thread.suspended.type === 'awaiting_human_input') {
      console.log(`\n❓ Agent needs input:\n\n   ${thread.suspended.question}\n`)
      saveThread(thread)

      const answer = await promptHuman('Your response: ')
      let result = await agent.resume(thread, { type: 'human_input', response: answer })
      thread = result.thread

      while (!thread.done && !thread.suspended) {
        const next = await agent.step(thread)
        thread = next.thread
      }

      clearThread()
      console.log('\n', thread.finalResponse)
    }
  }

  // Done without suspension
  if (thread.done && !thread.suspended) {
    clearThread()
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n✅ Agent completed in', stepCount, 'step(s):\n')
    console.log(thread.finalResponse)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`\n📊 Thread summary: ${thread.messages.length} messages over ${thread.step} steps`)
    console.log(`   Thread ID: ${thread.id.slice(0, 8)}...`)
  }
}

main().catch(err => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
