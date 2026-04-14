/**
 * YAAF extension features test suite
 *
 * - ToolLoopDetector: loop detection and prevention
 * - Soul / Personality: SOUL.md parsing and system-prompt injection
 * - Gateway + Channels: inbound/outbound message routing and chunking
 * - Heartbeat: scheduled task execution
 * - ContextEngine: composable system-prompt building
 * - ApprovalManager: async human-in-the-loop approvals
 * - AgentRouter: named-agent routing and session isolation
 * - SkillRegistry: dynamic skill hot-reload
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ToolLoopDetector,
} from '../tools/loopDetector.js'
import {
  createSoul,
  parseSoulMd,
  applySoul,
} from '../agents/soul.js'
import {
  Gateway,
  ConsoleChannel,
  chunkResponse,
  CHANNEL_LIMITS,
  type Channel,
  type InboundMessage,
  type OutboundMessage,
} from '../gateway/channel.js'
import {
  Heartbeat,
} from '../automation/heartbeat.js'
import {
  ContextEngine,
} from '../agents/contextEngine.js'
import {
  ApprovalManager,
} from '../gateway/approvals.js'
import {
  AgentRouter,
} from '../agents/delegate.js'
import {
  SkillRegistry,
} from '../skills.js'

// ════════════════════════════════════════════════════════════════════════════
// O9: Tool Loop Detection
// ════════════════════════════════════════════════════════════════════════════

describe('ToolLoopDetector', () => {
  it('does not flag short histories', () => {
    const d = new ToolLoopDetector({ threshold: 3 })
    d.record('search', { q: 'hello' })
    d.record('search', { q: 'hello' })
    expect(d.isLooping()).toBe(false)
  })

  it('detects exact-repeat loops', () => {
    const d = new ToolLoopDetector({ threshold: 3 })
    d.record('search', { q: 'hello' })
    d.record('search', { q: 'hello' })
    d.record('search', { q: 'hello' })
    expect(d.isLooping()).toBe(true)

    const info = d.detect()
    expect(info.type).toBe('exact-repeat')
    expect(info.tools).toEqual(['search'])
  })

  it('different args prevent loop detection', () => {
    const d = new ToolLoopDetector({ threshold: 3 })
    d.record('search', { q: 'a' })
    d.record('search', { q: 'b' })
    d.record('search', { q: 'c' })
    expect(d.isLooping()).toBe(false)
  })

  it('different tools prevent loop detection', () => {
    const d = new ToolLoopDetector({ threshold: 3 })
    d.record('search', { q: 'hello' })
    d.record('read', { q: 'hello' })
    d.record('search', { q: 'hello' })
    expect(d.isLooping()).toBe(false)
  })

  it('generates warning message', () => {
    const d = new ToolLoopDetector({ threshold: 2 })
    d.record('search', { q: 'test' })
    d.record('search', { q: 'test' })

    const warning = d.getWarning()
    expect(warning).toContain('Loop detected')
    expect(warning).toContain('search')
  })

  it('returns empty warning when not looping', () => {
    const d = new ToolLoopDetector()
    expect(d.getWarning()).toBe('')
  })

  it('reset clears history', () => {
    const d = new ToolLoopDetector({ threshold: 2 })
    d.record('search', { q: 'test' })
    d.record('search', { q: 'test' })
    expect(d.isLooping()).toBe(true)

    d.reset()
    expect(d.isLooping()).toBe(false)
    expect(d.length).toBe(0)
  })

  it('respects window size', () => {
    const d = new ToolLoopDetector({ threshold: 3, windowSize: 5 })
    for (let i = 0; i < 10; i++) {
      d.record('search', { q: String(i) })
    }
    expect(d.length).toBe(5)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// O3: SOUL.md Personality
// ════════════════════════════════════════════════════════════════════════════

describe('Soul', () => {
  it('createSoul creates a soul object', () => {
    const soul = createSoul({
      name: 'Molty',
      personality: 'Cheerful space lobster',
      tone: 'casual',
      rules: ['Be helpful', 'Be concise'],
    })

    expect(soul.name).toBe('Molty')
    expect(soul.tone).toBe('casual')
    expect(soul.rules).toHaveLength(2)
  })

  it('parseSoulMd parses frontmatter + sections', () => {
    const md = `---
name: TestBot
tone: professional
---

# Personality
I am a helpful test bot.

# Rules
- Never lie
- Be concise

# Preferences
- language: English
- timezone: UTC
`
    const soul = parseSoulMd(md)
    expect(soul.name).toBe('TestBot')
    expect(soul.tone).toBe('professional')
    expect(soul.personality).toBe('I am a helpful test bot.')
    expect(soul.rules).toEqual(['Never lie', 'Be concise'])
    expect(soul.preferences?.language).toBe('English')
    expect(soul.preferences?.timezone).toBe('UTC')
  })

  it('parseSoulMd handles plain text without sections', () => {
    const soul = parseSoulMd('Just a simple personality description.')
    expect(soul.personality).toBe('Just a simple personality description.')
  })

  it('applySoul prepends identity to system prompt', () => {
    const soul = createSoul({
      name: 'TestBot',
      personality: 'Helpful and kind.',
      tone: 'casual',
      rules: ['Be honest'],
    })

    const result = applySoul('Help the user with their tasks.', soul)
    expect(result).toContain('You are TestBot')
    expect(result).toContain('Helpful and kind')
    expect(result).toContain('casual')
    expect(result).toContain('Be honest')
    expect(result).toContain('Help the user with their tasks.')
  })

  it('applySoul includes preferences', () => {
    const soul = createSoul({
      name: 'Bot',
      personality: '',
      preferences: { timezone: 'EST' },
    })

    const result = applySoul('Task', soul)
    expect(result).toContain('timezone: EST')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// O1 + O7: Gateway / Channels / Chunking
// ════════════════════════════════════════════════════════════════════════════

describe('Gateway', () => {
  /** In-memory test channel */
  class MockChannel implements Channel {
    readonly name: string
    handler: ((msg: InboundMessage) => Promise<void>) | null = null
    sent: OutboundMessage[] = []
    connected = false

    constructor(name = 'mock') { this.name = name }
    onMessage(handler: (msg: InboundMessage) => Promise<void>) { this.handler = handler }
    async send(msg: OutboundMessage) { this.sent.push(msg) }
    async start() { this.connected = true }
    async stop() { this.connected = false }
    isConnected() { return this.connected }

    async simulateMessage(text: string, senderId = 'user1') {
      if (!this.handler) throw new Error('No handler')
      await this.handler({
        id: `msg-${Date.now()}`,
        channelName: this.name,
        senderId,
        text,
      })
    }
  }

  it('routes messages from channel to agent and back', async () => {
    const channel = new MockChannel()
    const mockAgent = { run: async (text: string) => `Echo: ${text}` }

    const gw = new Gateway({ agent: mockAgent, channels: [channel] })
    await gw.start()

    await channel.simulateMessage('Hello!')

    expect(channel.sent).toHaveLength(1)
    expect(channel.sent[0]!.text).toBe('Echo: Hello!')

    await gw.stop()
    expect(channel.connected).toBe(false)
  })

  it('applies message filter', async () => {
    const channel = new MockChannel()
    const mockAgent = { run: async () => 'response' }

    const gw = new Gateway({
      agent: mockAgent,
      channels: [channel],
      messageFilter: (msg) => msg.text.includes('important'),
    })
    await gw.start()

    await channel.simulateMessage('not relevant')
    expect(channel.sent).toHaveLength(0)

    await channel.simulateMessage('important message')
    expect(channel.sent).toHaveLength(1)
  })

  it('handles errors gracefully', async () => {
    const channel = new MockChannel()
    const errors: Error[] = []
    const badAgent = { run: async () => { throw new Error('Agent crash') } }

    const gw = new Gateway({
      agent: badAgent,
      channels: [channel],
      onError: (err) => errors.push(err),
    })
    await gw.start()

    await channel.simulateMessage('trigger error')
    expect(errors).toHaveLength(1)
    expect(errors[0]!.message).toBe('Agent crash')
  })

  it('status() returns channel states', async () => {
    const ch1 = new MockChannel('telegram')
    const ch2 = new MockChannel('discord')
    const gw = new Gateway({ agent: { run: async () => '' }, channels: [ch1, ch2] })

    await gw.start()
    const status = gw.status()

    expect(status).toEqual([
      { channel: 'telegram', connected: true },
      { channel: 'discord', connected: true },
    ])
  })
})

describe('chunkResponse', () => {
  it('returns single chunk for short text', () => {
    const chunks = chunkResponse('Hello!', 'telegram')
    expect(chunks).toEqual(['Hello!'])
  })

  it('splits long text at paragraph boundaries', () => {
    const longText = 'Paragraph 1.\n\n' + 'A'.repeat(5000) + '\n\n' + 'Paragraph 3 with more content.'
    const chunks = chunkResponse(longText, 'telegram')
    expect(chunks.length).toBeGreaterThan(1)
    // Every chunk should be under the limit
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(CHANNEL_LIMITS.telegram!.maxLength)
    }
  })

  it('handles unknown channels with default limit', () => {
    const chunks = chunkResponse('Short', 'unknown-channel')
    expect(chunks).toEqual(['Short'])
  })
})

describe('ConsoleChannel', () => {
  it('simulates messages', async () => {
    const ch = new ConsoleChannel()
    let received = ''
    ch.onMessage(async (msg) => { received = msg.text })

    await ch.start()
    expect(ch.isConnected()).toBe(true)

    await ch.simulateMessage('test message')
    expect(received).toBe('test message')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// O4: Heartbeat / Scheduling
// ════════════════════════════════════════════════════════════════════════════

describe('Heartbeat', () => {
  it('adds and lists tasks', () => {
    const hb = new Heartbeat({
      agent: { run: async () => '' },
      onOutput: async () => {},
    })

    hb.addTask({ id: 'morning', schedule: '0 8 * * *', prompt: 'Good morning!' })
    hb.addTask({ id: 'evening', schedule: '0 20 * * *', prompt: 'Good evening!' })

    expect(hb.getTasks()).toHaveLength(2)
    expect(hb.getTasks()[0]!.id).toBe('morning')
  })

  it('manages standing orders', () => {
    const hb = new Heartbeat({
      agent: { run: async () => '' },
      onOutput: async () => {},
    })

    hb.addStandingOrder({ id: 'email', instruction: 'Always check email first' })
    expect(hb.getStandingOrders()).toHaveLength(1)

    hb.removeStandingOrder('email')
    expect(hb.getStandingOrders()).toHaveLength(0)
  })

  it('trigger() runs a specific task', async () => {
    let received = ''
    const hb = new Heartbeat({
      agent: { run: async (input) => `Result: ${input}` },
      onOutput: async (text) => { received = text },
    })

    hb.addTask({ id: 'test', schedule: '0 0 * * *', prompt: 'Run test' })
    const result = await hb.trigger('test')

    expect(result).toContain('Run test')
    expect(received).toContain('Run test')
  })

  it('trigger() includes standing orders in prompt', async () => {
    let capturedInput = ''
    const hb = new Heartbeat({
      agent: { run: async (input) => { capturedInput = input; return 'ok' } },
      onOutput: async () => {},
    })

    hb.addStandingOrder({ id: 'rule1', instruction: 'Be polite' })
    hb.addTask({ id: 'test', schedule: '0 0 * * *', prompt: 'Hello!' })
    await hb.trigger('test')

    expect(capturedInput).toContain('Be polite')
    expect(capturedInput).toContain('Hello!')
  })

  it('start/stop lifecycle', () => {
    const hb = new Heartbeat({
      agent: { run: async () => '' },
      onOutput: async () => {},
      checkIntervalMs: 60000,
    })

    hb.start()
    expect(hb.isRunning()).toBe(true)

    hb.stop()
    expect(hb.isRunning()).toBe(false)
  })

  it('setTaskActive enables/disables tasks', () => {
    const hb = new Heartbeat({
      agent: { run: async () => '' },
      onOutput: async () => {},
    })

    hb.addTask({ id: 'test', schedule: '* * * * *', prompt: 'Hi' })
    expect(hb.getTasks()[0]!.active).toBe(true)

    hb.setTaskActive('test', false)
    expect(hb.getTasks()[0]!.active).toBe(false)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// O8: Context Engine
// ════════════════════════════════════════════════════════════════════════════

describe('ContextEngine', () => {
  it('builds system prompt from base', () => {
    const engine = new ContextEngine({ basePrompt: 'Help the user.' })
    expect(engine.build()).toBe('Help the user.')
  })

  it('applies soul transform to base prompt', () => {
    const engine = new ContextEngine({ basePrompt: 'Help the user.' })
    const soul = createSoul({ name: 'Bot', personality: 'Kind helper' })
    engine.setSoul((prompt) => applySoul(prompt, soul))

    const prompt = engine.build()
    expect(prompt).toContain('You are Bot')
    expect(prompt).toContain('Kind helper')
    expect(prompt).toContain('Help the user.')
  })

  it('adds skill sections', () => {
    const engine = new ContextEngine({ basePrompt: 'Base.' })
    engine.addSkill('weather', 'You can check the weather.')
    engine.addSkill('calendar', 'You can manage calendars.')

    const prompt = engine.build()
    expect(prompt).toContain('Skill: weather')
    expect(prompt).toContain('Skill: calendar')
  })

  it('adds memory context', () => {
    const engine = new ContextEngine({ basePrompt: 'Base.' })
    engine.addMemory('User prefers dark mode')

    const prompt = engine.build()
    expect(prompt).toContain('User prefers dark mode')
  })

  it('inspect() shows all sections', () => {
    const engine = new ContextEngine({ basePrompt: 'Base.' })
    engine.addSkill('weather', 'Weather skill')
    engine.addMemory('Memory data')

    const inspection = engine.inspect()
    expect(inspection.length).toBe(3) // Base + weather + memory
    expect(inspection[0]!.section).toBe('Base Prompt')
    expect(inspection.every(i => i.included)).toBe(true)
  })

  it('respects maxChars budget by dropping droppable sections', () => {
    const engine = new ContextEngine({ basePrompt: 'Base.', maxChars: 50 })
    engine.addSkill('weather', 'A'.repeat(100)) // Will be dropped (droppable)
    engine.addStandingOrders(['Important rule']) // Won't be dropped

    const prompt = engine.build()
    expect(prompt).not.toContain('AAAA')
    expect(prompt).toContain('Important rule')
  })

  it('removeSection works', () => {
    const engine = new ContextEngine({ basePrompt: 'Base.' })
    engine.addSkill('weather', 'Weather')
    engine.removeSection('skill:weather')

    expect(engine.build()).toBe('Base.')
  })

  it('addPreferences adds user preferences', () => {
    const engine = new ContextEngine({ basePrompt: 'Base.' })
    engine.addPreferences({ timezone: 'UTC', theme: 'dark' })

    const prompt = engine.build()
    expect(prompt).toContain('timezone: UTC')
    expect(prompt).toContain('theme: dark')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// O5: Async Approvals
// ════════════════════════════════════════════════════════════════════════════

describe('ApprovalManager', () => {
  it('auto-approves tools in neverRequire list', async () => {
    const am = new ApprovalManager({
      transport: { requestApproval: async () => 'denied' },
      neverRequire: ['read*'],
    })

    const result = await am.requestApproval('readFile', 'Reading a file', {})
    expect(result).toBe('approved')
  })

  it('sends approval request through transport', async () => {
    const am = new ApprovalManager({
      transport: { requestApproval: async () => 'approved' },
    })

    const result = await am.requestApproval('deleteFile', 'Deleting important.txt', {})
    expect(result).toBe('approved')
  })

  it('tracks approval history', async () => {
    const am = new ApprovalManager({
      transport: { requestApproval: async () => 'denied' },
    })

    await am.requestApproval('exec', 'Run command', {})
    expect(am.getHistory()).toHaveLength(1)
    expect(am.getHistory()[0]!.decision).toBe('denied')
  })

  it('auto-approves low risk when configured', async () => {
    const am = new ApprovalManager({
      transport: { requestApproval: async () => 'denied' },
      defaultRisk: 'low',
      autoApproveLow: true,
    })

    const result = await am.requestApproval('search', 'Search query', {})
    expect(result).toBe('approved')
  })

  it('enforces maxPending limit', async () => {
    let resolveApproval: () => void
    const pendingPromise = new Promise<void>(resolve => { resolveApproval = resolve })

    const am = new ApprovalManager({
      transport: {
        requestApproval: async () => {
          await pendingPromise
          return 'approved'
        },
      },
      maxPending: 1,
    })

    // First request blocks
    const first = am.requestApproval('exec', 'First', {})

    // Second should be denied (maxPending exceeded)
    const second = await am.requestApproval('exec', 'Second', {})
    expect(second).toBe('denied')

    // Clean up
    resolveApproval!()
    await first
  })

  it('asPermissionPolicy() returns YAAF-compatible policy', async () => {
    const am = new ApprovalManager({
      transport: { requestApproval: async () => 'approved' },
    })

    const policy = am.asPermissionPolicy()
    const result = await policy.checkPermission('exec', { command: 'ls' })
    expect(result.behavior).toBe('allow')
  })

  it('requiresApproval() checks configuration', () => {
    const am = new ApprovalManager({
      transport: { requestApproval: async () => 'approved' },
      neverRequire: ['read*'],
      alwaysRequire: ['exec'],
    })

    expect(am.requiresApproval('readFile')).toBe(false)
    expect(am.requiresApproval('exec')).toBe(true)
    expect(am.requiresApproval('write')).toBe(true) // default behavior
  })
})

// ════════════════════════════════════════════════════════════════════════════
// O6: Delegate Architecture
// ════════════════════════════════════════════════════════════════════════════

describe('AgentRouter', () => {
  const mockAgent = (name: string) => ({
    run: async (input: string) => `${name}: ${input}`,
  })

  it('routes by explicit mention', () => {
    const router = new AgentRouter()
    router.register({ id: 'writer', agent: mockAgent('writer') })
    router.register({ id: 'coder', agent: mockAgent('coder') })

    const entry = router.route({ text: 'fix this', mentionedAgent: 'coder' })
    expect(entry?.id).toBe('coder')
  })

  it('routes by text pattern', () => {
    const router = new AgentRouter()
    router.register({
      id: 'coder',
      agent: mockAgent('coder'),
      routes: [{ match: /code|function|bug/i }],
    })
    router.register({
      id: 'writer',
      agent: mockAgent('writer'),
      routes: [{ match: /write|essay|article/i }],
    })

    expect(router.route({ text: 'fix this bug' })?.id).toBe('coder')
    expect(router.route({ text: 'write an article' })?.id).toBe('writer')
  })

  it('falls back to default agent', () => {
    const router = new AgentRouter()
    router.register({ id: 'general', agent: mockAgent('general') })
    router.setDefault('general')

    const entry = router.route({ text: 'random question' })
    expect(entry?.id).toBe('general')
  })

  it('returns null when no match and no default', () => {
    const router = new AgentRouter()
    expect(router.route({ text: 'hello' })).toBeNull()
  })

  it('respects routing priority', () => {
    const router = new AgentRouter()
    router.register({
      id: 'specialist',
      agent: mockAgent('specialist'),
      routes: [{ match: /code/i, priority: 10 }],
    })
    router.register({
      id: 'generalist',
      agent: mockAgent('generalist'),
      routes: [{ match: /code/i, priority: 1 }],
    })

    expect(router.route({ text: 'code review' })?.id).toBe('specialist')
  })

  it('inactive agents are not routed to', () => {
    const router = new AgentRouter()
    router.register({
      id: 'coder',
      agent: mockAgent('coder'),
      active: true,
      routes: [{ match: /code/i }],
    })
    router.setActive('coder', false)

    expect(router.route({ text: 'code review' })).toBeNull()
  })

  it('presence() returns agent status', () => {
    const router = new AgentRouter()
    router.register({ id: 'a', agent: mockAgent('a'), displayName: 'Agent A' })
    router.register({ id: 'b', agent: mockAgent('b'), active: false })

    const presence = router.presence()
    expect(presence).toHaveLength(2)
    expect(presence[0]!.displayName).toBe('Agent A')
    expect(presence[0]!.active).toBe(true)
    expect(presence[1]!.active).toBe(false)
  })

  it('resolveSessionKey respects scope', () => {
    const router = new AgentRouter()
    router.register({ id: 'a', agent: mockAgent('a'), sessionScope: 'shared' })
    router.register({ id: 'b', agent: mockAgent('b'), sessionScope: 'per-channel-sender' })

    const msg = { text: 'hi', senderId: 'user1', channelName: 'telegram' }
    expect(router.resolveSessionKey('a', msg)).toBe('a:main')
    expect(router.resolveSessionKey('b', msg)).toBe('b:telegram:user1')
  })

  it('routes by channel filter', () => {
    const router = new AgentRouter()
    router.register({
      id: 'work',
      agent: mockAgent('work'),
      routes: [{ channels: ['slack'] }],
    })

    expect(router.route({ text: 'hi', channelName: 'slack' })?.id).toBe('work')
    expect(router.route({ text: 'hi', channelName: 'telegram' })).toBeNull()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// O2: Skill Hot-Reload (SkillRegistry extensions)
// ════════════════════════════════════════════════════════════════════════════

describe('SkillRegistry extensions', () => {
  it('registerDynamic() creates skill from markdown', () => {
    const registry = new SkillRegistry()
    const skill = registry.registerDynamic(`---
name: weather
description: Check the weather
---
Use the WeatherAPI to check weather conditions.
`)

    expect(skill.name).toBe('weather')
    expect(skill.description).toBe('Check the weather')
    expect(skill.instructions).toContain('WeatherAPI')
    expect(registry.get('weather')).toBeDefined()
  })

  it('fires onLoad event on register', () => {
    const loaded: string[] = []
    const registry = new SkillRegistry({
      onLoad: (skill) => loaded.push(skill.name),
    })

    registry.registerDynamic('---\nname: test\n---\nContent')
    expect(loaded).toEqual(['test'])
  })

  it('fires onRemove event on unregister', () => {
    const removed: string[] = []
    const registry = new SkillRegistry({
      onRemove: (name) => removed.push(name),
    })

    registry.registerDynamic('---\nname: test\n---\nContent')
    registry.unregister('test')
    expect(removed).toEqual(['test'])
  })

  it('clear() removes all skills', () => {
    const registry = new SkillRegistry()
    registry.registerDynamic('---\nname: a\n---\nA')
    registry.registerDynamic('---\nname: b\n---\nB')

    expect(registry.list()).toHaveLength(2)
    registry.clear()
    expect(registry.list()).toHaveLength(0)
  })
})
