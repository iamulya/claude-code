/**
 * Agent Orchestrator — Multi-agent spawning and lifecycle management
 *
 * Handles spawning, coordinating, and managing the lifecycle of multiple
 * autonomous agents (teamHelpers, runAgent).
 *
 * Architecture overview:
 *
 * ```
 *                    ┌─────────────────────┐
 *                    │   Leader Agent       │
 *                    │   (Coordinator)      │
 *                    └─────────┬───────────┘
 *                              │
 *                 ┌────────────┼────────────┐
 *                 │            │            │
 *          ┌──────▼──────┐ ┌──▼─────┐ ┌────▼─────┐
 *          │ Worker #1   │ │Worker #2│ │Worker #3 │
 *          │ (Researcher)│ │(Coder) │ │(Reviewer)│
 *          └─────────────┘ └────────┘ └──────────┘
 * ```
 *
 * Key patterns:
 * 1. **Leader/Worker hierarchy** — A coordinator agent spawns worker agents
 * 2. **Independent AbortControllers** — Workers survive leader interrupts
 * 3. **Task-based work distribution** — Workers claim tasks from a shared list
 * 4. **Idle loop** — Workers don't exit after completing a task; they wait
 *    for new work or a shutdown request
 * 5. **Permission delegation** — Workers can escalate permission requests
 *    to the leader via the mailbox
 */

import { Mailbox, type MailboxMessage } from './mailbox.js'
import { TaskManager, type TaskState, type TaskType } from './taskManager.js'
import type { Tool } from '../tools/tool.js'
import { EventBus } from '../utils/eventBus.js'

// ── Types ────────────────────────────────────────────────────────────────────

/** Identity of a spawned agent */
export type AgentIdentity = {
  /** Unique agent ID (e.g., "researcher@my-team") */
  agentId: string
  /** Display name (e.g., "researcher") */
  agentName: string
  /** Team this agent belongs to */
  teamName: string
  /** UI color for this agent */
  color?: string
  /** Parent session/agent ID for hierarchy tracking */
  parentId?: string
}

/** Configuration for an agent's capabilities */
export type AgentDefinition = {
  /** Agent type name (e.g., "Researcher", "Coder") */
  type: string
  /** System prompt or prompt modifier */
  systemPrompt?: string
  /** How to apply the system prompt */
  systemPromptMode?: 'replace' | 'append'
  /** Model override for this agent */
  model?: string
  /** Tools this agent is allowed to use */
  allowedTools?: string[]
  /** Maximum conversation turns before stopping */
  maxTurns?: number
  /** Permission mode: 'default' | 'plan' (requires plan approval before acting) */
  permissionMode?: 'default' | 'plan'
  /** Custom metadata */
  metadata?: Record<string, unknown>
}

/** Agent runtime status */
export type AgentStatus =
  | 'spawning'
  | 'running'
  | 'idle'
  | 'waiting_permission'
  | 'completed'
  | 'failed'
  | 'killed'

/** Configuration for spawning a new agent */
export type SpawnConfig = {
  /** Display name for the agent */
  name: string
  /** Team name */
  teamName: string
  /** Initial prompt / task */
  prompt: string
  /** Agent definition (capabilities) */
  definition: AgentDefinition
  /** UI color */
  color?: string
  /** Model override */
  model?: string
  /**
   * Per-agent timeout in milliseconds.
   * If the agent doesn't complete within this time, it is killed.
   * Default: no timeout.
   */
  timeoutMs?: number
}

/** Result of spawning an agent */
export type SpawnResult = {
  success: boolean
  agentId: string
  taskId?: string
  error?: string
}

/**
 * The run function that the orchestrator calls to execute an agent.
 * Framework consumers provide this — it wraps their LLM query loop.
 */
export type AgentRunFn = (params: {
  identity: AgentIdentity
  definition: AgentDefinition
  prompt: string
  tools: readonly Tool[]
  signal: AbortSignal
  mailbox: Mailbox
  /** Send a message back to the leader */
  sendToLeader: (text: string, summary?: string) => Promise<void>
}) => Promise<{ success: boolean; error?: string }>

// ── Agent Orchestrator Events ────────────────────────────────────────────────

type OrchestratorEvents = {
  'agent:spawned': { identity: AgentIdentity; taskId: string }
  'agent:status_changed': { agentId: string; from: AgentStatus; to: AgentStatus }
  'agent:completed': { agentId: string; success: boolean; error?: string }
  'agent:message': { from: string; to: string; text: string }
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * Multi-agent orchestrator — spawns, tracks, and coordinates agent swarms.
 *
 * @example
 * ```ts
 * const orchestrator = new AgentOrchestrator({
 *   mailboxDir: '/tmp/agent-teams',
 *   defaultTeam: 'my-team',
 *   tools: [grepTool, readTool, writeTool],
 *   runAgent: async ({ identity, prompt, tools, signal, sendToLeader }) => {
 *     // Your LLM agent loop here
 *     const result = await myAgentLoop(prompt, tools, signal);
 *     await sendToLeader(result.summary, 'Task complete');
 *     return { success: true };
 *   },
 * });
 *
 * // Spawn workers
 * const r1 = await orchestrator.spawn({
 *   name: 'researcher',
 *   teamName: 'my-team',
 *   prompt: 'Find all TODO comments in the codebase',
 *   definition: { type: 'Researcher' },
 *   color: 'blue',
 * });
 *
 * const r2 = await orchestrator.spawn({
 *   name: 'coder',
 *   teamName: 'my-team',
 *   prompt: 'Implement the payment webhook handler',
 *   definition: { type: 'Coder', permissionMode: 'plan' },
 *   color: 'green',
 * });
 *
 * // Wait for all to finish
 * await orchestrator.waitForAll();
 *
 * // Or kill one
 * orchestrator.kill(r1.agentId);
 * ```
 */
export class AgentOrchestrator {
  private readonly mailbox: Mailbox
  private readonly taskManager: TaskManager
  private readonly events: EventBus<OrchestratorEvents>
  private readonly agents = new Map<string, {
    identity: AgentIdentity
    status: AgentStatus
    taskId: string
    definition: AgentDefinition
    abortController: AbortController
    promise?: Promise<void>
  }>()
  private readonly tools: readonly Tool[]
  private readonly runAgentFn: AgentRunFn
  private readonly leaderName: string

  constructor(config: {
    mailboxDir: string
    defaultTeam?: string
    tools: readonly Tool[]
    runAgent: AgentRunFn
    leaderName?: string
  }) {
    this.mailbox = new Mailbox({
      baseDir: config.mailboxDir,
      defaultTeam: config.defaultTeam,
    })
    this.taskManager = new TaskManager()
    this.events = new EventBus()
    this.tools = config.tools
    this.runAgentFn = config.runAgent
    this.leaderName = config.leaderName ?? 'team-lead'
  }

  /** Access the event bus for subscribing to orchestrator events */
  get on() {
    return this.events.on.bind(this.events)
  }

  /** Access the underlying mailbox */
  getMailbox(): Mailbox {
    return this.mailbox
  }

  /** Access the underlying task manager */
  getTaskManager(): TaskManager {
    return this.taskManager
  }

  /**
   * Spawn a new agent.
   *
   * Creates the agent's identity, registers a task, and starts the agent
   * run loop in the background. The agent communicates with the leader
   * via the mailbox.
   */
  async spawn(config: SpawnConfig): Promise<SpawnResult> {
    const agentId = `${config.name}@${config.teamName}`

    // Check for duplicate
    if (this.agents.has(agentId)) {
      return {
        success: false,
        agentId,
        error: `Agent ${agentId} already exists`,
      }
    }

    const identity: AgentIdentity = {
      agentId,
      agentName: config.name,
      teamName: config.teamName,
      color: config.color,
    }

    const abortController = new AbortController()
    const task = this.taskManager.create('teammate' as TaskType, `${config.name}: ${config.prompt.slice(0, 50)}...`)
    const taskId = task.id

    const agentState: {
      identity: AgentIdentity
      status: AgentStatus
      taskId: string
      definition: AgentDefinition
      abortController: AbortController
      promise?: Promise<void>
    } = {
      identity,
      status: 'spawning',
      taskId,
      definition: config.definition,
      abortController,
    }

    this.agents.set(agentId, agentState)
    this.events.emit('agent:spawned', { identity, taskId })

    // Start agent in background
    const promise = this.runAgentInBackground(agentId, config)
    agentState.promise = promise

    return { success: true, agentId, taskId }
  }

  /** Run agent in background, updating status throughout lifecycle */
  private async runAgentInBackground(
    agentId: string,
    config: SpawnConfig,
  ): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) return

    this.updateStatus(agentId, 'running')
    this.taskManager.transition(agent.taskId, 'running')

    // Per-agent timeout (Gap #13)
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined
    if (config.timeoutMs) {
      timeoutTimer = setTimeout(() => {
        if (agent.status === 'running' || agent.status === 'idle') {
          this.kill(agentId)
          this.events.emit('agent:completed', {
            agentId,
            success: false,
            error: `Agent timed out after ${config.timeoutMs}ms`,
          })
        }
      }, config.timeoutMs)
    }

    try {
      const result = await this.runAgentFn({
        identity: agent.identity,
        definition: config.definition,
        prompt: config.prompt,
        tools: this.tools,
        signal: agent.abortController.signal,
        mailbox: this.mailbox,
        sendToLeader: async (text, summary) => {
          await this.mailbox.send(
            this.leaderName,
            {
              from: config.name,
              text,
              color: config.color,
              summary,
            },
            config.teamName,
          )
          this.events.emit('agent:message', {
            from: config.name,
            to: this.leaderName,
            text,
          })
        },
      })

      if (result.success) {
        this.updateStatus(agentId, 'completed')
        this.taskManager.transition(agent.taskId, 'completed')
      } else {
        this.updateStatus(agentId, 'failed')
        this.taskManager.transition(agent.taskId, 'failed', result.error)
      }

      this.events.emit('agent:completed', {
        agentId,
        success: result.success,
        error: result.error,
      })
    } catch (err) {
      // Distinguish abort (user kill) from crash
      const isAbort = err instanceof Error && err.name === 'AbortError'
      if (isAbort && agent.status === 'killed') {
        // Already handled by kill()
        return
      }
      const errorMsg = err instanceof Error ? err.message : String(err)
      this.updateStatus(agentId, 'failed')
      this.taskManager.transition(agent.taskId, 'failed', errorMsg)
      this.events.emit('agent:completed', {
        agentId,
        success: false,
        error: errorMsg,
      })
    } finally {
      if (timeoutTimer) clearTimeout(timeoutTimer)
    }
  }

  /** Update an agent's status and emit an event */
  private updateStatus(agentId: string, newStatus: AgentStatus): void {
    const agent = this.agents.get(agentId)
    if (!agent) return

    const from = agent.status
    agent.status = newStatus
    this.events.emit('agent:status_changed', { agentId, from, to: newStatus })
  }

  /** Kill a specific agent */
  kill(agentId: string): boolean {
    const agent = this.agents.get(agentId)
    if (!agent) return false

    agent.abortController.abort()
    this.updateStatus(agentId, 'killed')
    this.taskManager.transition(agent.taskId, 'killed')
    return true
  }

  /** Kill all running agents */
  killAll(): void {
    for (const [id, agent] of this.agents) {
      if (agent.status === 'running' || agent.status === 'idle') {
        this.kill(id)
      }
    }
  }

  /** Get an agent's current status */
  getStatus(agentId: string): AgentStatus | undefined {
    return this.agents.get(agentId)?.status
  }

  /** Get all agent identities */
  getAgents(): AgentIdentity[] {
    return [...this.agents.values()].map(a => a.identity)
  }

  /** Get the count of running agents */
  get runningCount(): number {
    return [...this.agents.values()].filter(
      a => a.status === 'running' || a.status === 'idle',
    ).length
  }

  /** Wait for all agents to reach a terminal state */
  async waitForAll(timeoutMs?: number): Promise<void> {
    const promises = [...this.agents.values()]
      .filter(a => a.promise)
      .map(a => a.promise!)

    if (timeoutMs) {
      await Promise.race([
        Promise.allSettled(promises),
        new Promise(resolve => setTimeout(resolve, timeoutMs)),
      ])
    } else {
      await Promise.allSettled(promises)
    }
  }

  /** Wait for a specific agent to complete */
  async waitFor(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (agent?.promise) {
      await agent.promise
    }
  }

  /** Clean up completed agent state */
  cleanup(): void {
    for (const [id, agent] of this.agents) {
      if (
        agent.status === 'completed' ||
        agent.status === 'failed' ||
        agent.status === 'killed'
      ) {
        this.agents.delete(id)
      }
    }
    this.taskManager.evictTerminal()
  }

  /** Get a status summary of all agents (for debugging) */
  statusSummary(): string {
    const lines: string[] = []
    for (const [id, agent] of this.agents) {
      lines.push(`  ${id}: ${agent.status} (task: ${agent.taskId})`)
    }
    return lines.length > 0
      ? `Agents (${this.agents.size}):\n${lines.join('\n')}`
      : 'No agents'
  }
}
