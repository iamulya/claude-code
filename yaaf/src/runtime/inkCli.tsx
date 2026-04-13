/**
 * InkCLI — Premium terminal interface for YAAF agents.
 *
 * Uses Ink (React for terminals) to render:
 * - Live streaming text with cursor
 * - In-place tool call status spinners
 * - Interactive permission prompts
 * - Session stats footer
 * - Keyboard-driven input
 *
 * This is the premium alternative to the zero-dep `createCLI`.
 * Requires: `npm install ink react ink-text-input ink-spinner`
 *
 * @example
 * ```ts
 * import { Agent, toStreamableAgent } from 'yaaf';
 * import { createInkCLI } from 'yaaf/cli-ink';
 *
 * const agent = new Agent({ ... });
 * createInkCLI(toStreamableAgent(agent), {
 *   name: 'my-assistant',
 *   greeting: 'Hello! How can I help?',
 * });
 * ```
 *
 * @module runtime/inkCli
 */

import React, { useState, useEffect, useCallback } from 'react'
import { render, Box, Text, useInput, useApp } from 'ink'
import TextInput from 'ink-text-input'
import Spinner from 'ink-spinner'
import type { RuntimeStreamEvent, StreamableAgent } from './adapter.js'

// ── Types ────────────────────────────────────────────────────────────────────

export type InkCLIConfig = {
  /** Agent display name */
  name?: string
  /** Greeting message */
  greeting?: string
  /** Theme colors */
  theme?: Partial<InkCLITheme>
  /** Called before each agent run */
  beforeRun?: (input: string) => string | Promise<string>
  /** Called after each agent response */
  afterRun?: (input: string, response: string) => void | Promise<void>
}

export type InkCLITheme = {
  primary: string
  secondary: string
  accent: string
  error: string
  dim: string
}

type ToolStatus = {
  name: string
  startedAt: number
  durationMs?: number
  error?: boolean
  done: boolean
}

type Message = {
  role: 'user' | 'agent'
  text: string
}

// ── Default Theme ────────────────────────────────────────────────────────────

const DEFAULT_THEME: InkCLITheme = {
  primary: 'cyan',
  secondary: 'magenta',
  accent: 'green',
  error: 'red',
  dim: 'gray',
}

// ── Components ───────────────────────────────────────────────────────────────

/** Banner displayed at startup */
function Banner({ name, theme }: { name: string; theme: InkCLITheme }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={theme.primary} bold>
        {'  ╦ ╦╔═╗╔═╗╔═╗'}
      </Text>
      <Text color={theme.primary} bold>
        {'  ╚╦╝╠═╣╠═╣╠╣ '}
        <Text dimColor> {name}</Text>
      </Text>
      <Text color={theme.primary} bold>
        {'   ╩ ╩ ╩╩ ╩╚  '}
      </Text>
    </Box>
  )
}

/** Active tool call with spinner */
function ToolCallIndicator({ tools, theme }: { tools: ToolStatus[]; theme: InkCLITheme }) {
  if (tools.length === 0) return null

  return (
    <Box flexDirection="column" marginLeft={2} marginBottom={1}>
      {tools.map((tool) => (
        <Box key={tool.name + tool.startedAt}>
          {tool.done ? (
            <Text color={tool.error ? theme.error : theme.accent}>
              {tool.error ? '✗' : '✓'}{' '}
            </Text>
          ) : (
            <Text color={theme.primary}>
              <Spinner type="dots" />{' '}
            </Text>
          )}
          <Text color={theme.dim}>{tool.name}</Text>
          {tool.durationMs !== undefined && (
            <Text color={theme.dim}> ({(tool.durationMs / 1000).toFixed(1)}s)</Text>
          )}
        </Box>
      ))}
    </Box>
  )
}

/** Single chat message */
function ChatMessage({ msg, agentName, theme }: { msg: Message; agentName: string; theme: InkCLITheme }) {
  if (msg.role === 'user') {
    return (
      <Box marginBottom={1}>
        <Text color={theme.primary} bold>you ▸ </Text>
        <Text>{msg.text}</Text>
      </Box>
    )
  }

  return (
    <Box marginBottom={1} flexDirection="column">
      <Box>
        <Text color={theme.secondary} bold>{agentName} ▸ </Text>
      </Box>
      <Box marginLeft={2}>
        <Text>{msg.text}</Text>
      </Box>
    </Box>
  )
}

/** Streaming text with blinking cursor */
function StreamingText({ text, theme }: { text: string; theme: InkCLITheme }) {
  return (
    <Box marginBottom={1} flexDirection="column">
      <Box>
        <Text color={theme.secondary} bold>{'▸ '}</Text>
      </Box>
      <Box marginLeft={2}>
        <Text>{text}<Text color={theme.primary}>█</Text></Text>
      </Box>
    </Box>
  )
}

/** Footer with session stats */
function StatusBar({ messageCount, startedAt, tokens, theme }: {
  messageCount: number
  startedAt: Date
  tokens: { prompt: number; completion: number }
  theme: InkCLITheme
}) {
  const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000)
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  return (
    <Box borderStyle="single" borderColor={theme.dim} paddingX={1}>
      <Text color={theme.dim}>
        {messageCount} msgs
        {' · '}
        {mins > 0 ? `${mins}m${secs}s` : `${secs}s`}
        {tokens.prompt > 0 && ` · ↑${tokens.prompt} ↓${tokens.completion} tokens`}
        {' · '}
        /quit to exit
      </Text>
    </Box>
  )
}

// ── Main App ─────────────────────────────────────────────────────────────────

function InkCLIApp({ agent, config }: { agent: StreamableAgent; config: InkCLIConfig }) {
  const { exit } = useApp()
  const name = config.name ?? 'agent'
  const theme = { ...DEFAULT_THEME, ...config.theme }
  const startedAt = new Date()

  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [activeTools, setActiveTools] = useState<ToolStatus[]>([])
  const [tokens, setTokens] = useState({ prompt: 0, completion: 0 })
  const [showGreeting, setShowGreeting] = useState(!!config.greeting)

  // Hide greeting after first message
  useEffect(() => {
    if (messages.length > 0) setShowGreeting(false)
  }, [messages.length])

  const handleSubmit = useCallback(async (value: string) => {
    const text = value.trim()
    if (!text || isProcessing) return

    // Handle slash commands
    if (text === '/quit' || text === '/q' || text === '/exit') {
      exit()
      return
    }

    if (text === '/clear') {
      setMessages([])
      setInputValue('')
      return
    }

    if (text === '/help') {
      setMessages(prev => [...prev, {
        role: 'agent',
        text: 'Commands: /quit, /clear, /help',
      }])
      setInputValue('')
      return
    }

    // Add user message
    setMessages(prev => [...prev, { role: 'user', text }])
    setInputValue('')
    setIsProcessing(true)
    setStreamingText('')
    setActiveTools([])

    try {
      let processedInput = text
      if (config.beforeRun) {
        processedInput = await config.beforeRun(text)
      }

      if (agent.runStream) {
        // Streaming mode
        let fullText = ''

        for await (const event of agent.runStream(processedInput)) {
          switch (event.type) {
            case 'text_delta':
              if (event.text) {
                fullText += event.text
                setStreamingText(fullText)
              }
              break

            case 'tool_call_start':
              setActiveTools(prev => [...prev, {
                name: event.toolName ?? 'unknown',
                startedAt: Date.now(),
                done: false,
              }])
              break

            case 'tool_call_end':
              setActiveTools(prev => prev.map(t =>
                !t.done && t.name === (event.toolName ?? '')
                  ? { ...t, done: true, durationMs: event.durationMs, error: event.error }
                  : t,
              ))
              break

            case 'usage':
              if ('promptTokens' in event) {
                setTokens({
                  prompt: event.promptTokens,
                  completion: event.completionTokens,
                })
              }
              break

            case 'done':
              fullText = event.text ?? fullText
              break
          }
        }

        setMessages(prev => [...prev, { role: 'agent', text: fullText }])
        setStreamingText('')
      } else {
        // Batch mode
        const response = await agent.run(processedInput)
        setMessages(prev => [...prev, { role: 'agent', text: response }])
      }

      await config.afterRun?.(text, messages[messages.length - 1]?.text ?? '')
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'agent',
        text: `Error: ${err instanceof Error ? err.message : String(err)}`,
      }])
    } finally {
      setIsProcessing(false)
      setActiveTools([])
    }
  }, [isProcessing, agent, config, exit, messages])

  // Ctrl+C handling
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit()
    }
  })

  return (
    <Box flexDirection="column" padding={1}>
      <Banner name={name} theme={theme} />

      {showGreeting && (
        <Box marginBottom={1} marginLeft={2}>
          <Text color={theme.accent}>{config.greeting}</Text>
        </Box>
      )}

      {/* Message history */}
      {messages.map((msg, i) => (
        <ChatMessage key={i} msg={msg} agentName={name} theme={theme} />
      ))}

      {/* Active tool calls */}
      <ToolCallIndicator tools={activeTools} theme={theme} />

      {/* Streaming text */}
      {isProcessing && streamingText && (
        <StreamingText text={streamingText} theme={theme} />
      )}

      {/* Processing spinner (no streaming text yet) */}
      {isProcessing && !streamingText && activeTools.every(t => t.done) && (
        <Box marginBottom={1} marginLeft={2}>
          <Text color={theme.primary}>
            <Spinner type="dots" />
          </Text>
          <Text color={theme.dim}> Thinking...</Text>
        </Box>
      )}

      {/* Input */}
      {!isProcessing && (
        <Box>
          <Text color={theme.primary} bold>you ▸ </Text>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
          />
        </Box>
      )}

      {/* Status bar */}
      <Box marginTop={1}>
        <StatusBar
          messageCount={messages.filter(m => m.role === 'user').length}
          startedAt={startedAt}
          tokens={tokens}
          theme={theme}
        />
      </Box>
    </Box>
  )
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a premium Ink-based CLI for your agent.
 *
 * Renders a rich terminal interface with:
 * - Live streaming text with cursor indicator
 * - In-place tool call spinners that resolve to ✓/✗
 * - Token usage tracking in footer
 * - Slash commands: /quit, /clear, /help
 *
 * Requires: `npm install ink react ink-text-input ink-spinner`
 *
 * @example
 * ```ts
 * import { Agent, toStreamableAgent } from 'yaaf';
 * import { createInkCLI } from 'yaaf/cli-ink';
 *
 * const agent = new Agent({ systemPrompt: 'You are helpful.' });
 * createInkCLI(toStreamableAgent(agent), {
 *   name: 'my-bot',
 *   greeting: 'Hello! How can I help?',
 * });
 * ```
 */
export function createInkCLI(agent: StreamableAgent, config: InkCLIConfig = {}): void {
  const instance = render(
    <InkCLIApp agent={agent} config={config} />,
  )

  // Handle process exit
  instance.waitUntilExit().then(() => {
    process.exit(0)
  })
}
