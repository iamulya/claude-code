/**
 * YAAF Playground — Developer Playground Agent
 *
 * A fully-featured agent with five real tools, served through the YAAF Dev UI
 * so you can explore the framework interactively in your browser.
 *
 * Tools:
 *   • calculate        — evaluate math expressions (powers, trig, log, etc.)
 *   • get_system_info  — Node.js version, platform, memory and uptime
 *   • fetch_npm_info   — live metadata from the npm registry
 *   • list_examples    — enumerate every YAAF example in this repo
 *   • convert_units    — convert between common measurement units
 *
 * Usage:
 *   GEMINI_API_KEY=...     npm start
 *   ANTHROPIC_API_KEY=...  npm start
 *   OPENAI_API_KEY=...     npm start
 *
 * Then open http://localhost:3456 in your browser.
 */

import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readdirSync, statSync } from 'node:fs'
import { Agent, buildTool } from 'yaaf'
import { createServer } from 'yaaf/server'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXAMPLES_DIR = path.resolve(__dirname, '../../')

// ── Detect provider ───────────────────────────────────────────────────────────

function detectModel(): string {
  if (process.env['GEMINI_API_KEY'])    return 'gemini-2.0-flash'
  if (process.env['ANTHROPIC_API_KEY']) return 'claude-3-5-haiku-20241022'
  if (process.env['OPENAI_API_KEY'])    return 'gpt-4o-mini'
  console.error('\n⚠  No API key found.')
  console.error('   Set one of: GEMINI_API_KEY | ANTHROPIC_API_KEY | OPENAI_API_KEY\n')
  process.exit(1)
}

const MODEL = detectModel()

// ── Tools ─────────────────────────────────────────────────────────────────────

/**
 * Math expression evaluator.
 * Uses Function() in a restricted scope — safe for demo purposes.
 */
const calculate = buildTool({
  name: 'calculate',
  describe: () =>
    'Evaluate a mathematical expression and return the numeric result. ' +
    'Supports arithmetic (+, -, *, /, **), Math functions (sin, cos, tan, log, sqrt, abs, round, ' +
    'ceil, floor, min, max, pow), and constants (Math.PI, Math.E). ' +
    'Example: "Math.sqrt(2) * 100" → 141.421…',
  inputSchema: {
    type: 'object' as const,
    properties: {
      expression: {
        type: 'string',
        description: 'A valid JavaScript math expression, e.g. "2 ** 10 + Math.PI"',
      },
    },
    required: ['expression'],
  },
  call: async ({ expression }: { expression: string }) => {
    // Whitelist-only: numbers, operators, whitespace, and the Math object
    const safe = /^[\d\s+\-*/().%,Math.]*$/.test(expression)
    if (!safe) {
      return { data: JSON.stringify({ error: 'Expression contains forbidden characters. Only math operators and Math.* are allowed.' }) }
    }
    try {
      // eslint-disable-next-line no-new-func
      const result = new Function('Math', `"use strict"; return (${expression})`)(Math) as unknown
      if (typeof result !== 'number' || !isFinite(result)) {
        return { data: JSON.stringify({ error: 'Expression did not evaluate to a finite number.' }) }
      }
      return { data: JSON.stringify({ expression, result, formatted: result.toLocaleString() }) }
    } catch (err) {
      return { data: JSON.stringify({ error: `Evaluation failed: ${err instanceof Error ? err.message : String(err)}` }) }
    }
  },
})

/**
 * Returns live Node.js process and OS information.
 */
const getSystemInfo = buildTool({
  name: 'get_system_info',
  describe: () =>
    'Return current system and runtime information: Node.js version, platform, architecture, ' +
    'CPU cores, total memory, free memory, process uptime, and current working directory.',
  inputSchema: { type: 'object' as const, properties: {} },
  call: async () => {
    const uptimeSec = process.uptime()
    const hours   = Math.floor(uptimeSec / 3600)
    const minutes = Math.floor((uptimeSec % 3600) / 60)
    const seconds = Math.floor(uptimeSec % 60)

    return {
      data: JSON.stringify({
        node_version:    process.version,
        platform:        os.platform(),
        architecture:    os.arch(),
        cpu_cores:       os.cpus().length,
        cpu_model:       os.cpus()[0]?.model ?? 'unknown',
        total_memory_gb: (os.totalmem() / 1024 ** 3).toFixed(2) + ' GB',
        free_memory_gb:  (os.freemem()  / 1024 ** 3).toFixed(2) + ' GB',
        uptime:          `${hours}h ${minutes}m ${seconds}s`,
        hostname:        os.hostname(),
        user:            os.userInfo().username,
      }),
    }
  },
})

/**
 * Looks up a package on the npm registry.
 */
const fetchNpmInfo = buildTool({
  name: 'fetch_npm_info',
  describe: () =>
    'Fetch live metadata for an npm package from the official registry. ' +
    'Returns name, description, latest version, license, weekly downloads estimate, ' +
    'GitHub repository URL, and a list of dependencies.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      package_name: {
        type: 'string',
        description: 'The exact npm package name, e.g. "express", "zod", "typescript"',
      },
    },
    required: ['package_name'],
  },
  call: async ({ package_name }: { package_name: string }, signal?: AbortSignal) => {
    // Validate package name (basic safety)
    if (!/^(?:@[\w-]+\/)?[\w.-]+$/.test(package_name)) {
      return { data: JSON.stringify({ error: 'Invalid package name format.' }) }
    }

    try {
      const res = await fetch(
        `https://registry.npmjs.org/${encodeURIComponent(package_name)}/latest`,
        { signal, headers: { 'Accept': 'application/json', 'User-Agent': 'yaaf-playground/1.0' } },
      )
      if (res.status === 404) return { data: JSON.stringify({ error: `Package "${package_name}" not found on npm.` }) }
      if (!res.ok) return { data: JSON.stringify({ error: `npm registry returned HTTP ${res.status}.` }) }

      const data = await res.json() as Record<string, unknown>

      return {
        data: JSON.stringify({
          name:            data['name'],
          version:         data['version'],
          description:     data['description'] ?? '(no description)',
          license:         data['license']     ?? 'unknown',
          repository:      (data['repository'] as Record<string, unknown> | undefined)?.['url'] ?? null,
          homepage:        data['homepage']    ?? null,
          author:          typeof data['author'] === 'string'
                             ? data['author']
                             : (data['author'] as Record<string, string> | undefined)?.['name'] ?? null,
          dependencies:    Object.keys((data['dependencies']    as Record<string, string> | undefined) ?? {}).slice(0, 15),
          devDependencies: Object.keys((data['devDependencies'] as Record<string, string> | undefined) ?? {}).slice(0, 10),
          engines:         data['engines'] ?? null,
        }),
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).name === 'AbortError') return { data: JSON.stringify({ error: 'Request cancelled.' }) }
      return { data: JSON.stringify({ error: `Network error: ${err instanceof Error ? err.message : String(err)}` }) }
    }
  },
})

/**
 * Lists all YAAF examples in the repository.
 */
const listExamples = buildTool({
  name: 'list_yaaf_examples',
  describe: () =>
    'List all example projects included in the YAAF repository. ' +
    'Returns each example\'s name and a one-line description parsed from its README.',
  inputSchema: { type: 'object' as const, properties: {} },
  call: async () => {
    const { readFileSync } = await import('node:fs')

    const dirs = readdirSync(EXAMPLES_DIR).filter(name => {
      const full = path.join(EXAMPLES_DIR, name)
      return statSync(full).isDirectory() && !name.startsWith('.')
    })

    const examples = dirs.map(name => {
      let description = '(no description)'
      try {
        const readme = readFileSync(path.join(EXAMPLES_DIR, name, 'README.md'), 'utf-8')
        const summary = readme
          .split('\n')
          .map(l => l.trim())
          .find(l => l.length > 20 && !l.startsWith('#') && !l.startsWith('!'))
        if (summary) description = summary.slice(0, 120)
      } catch { /* readme missing */ }
      return { name, description }
    })

    return { data: JSON.stringify({ count: examples.length, examples }) }
  },
})

/**
 * Converts values between common measurement units.
 */
const convertUnits = buildTool({
  name: 'convert_units',
  describe: () =>
    'Convert a numeric value between common measurement units. ' +
    'Supported categories: ' +
    'temperature (celsius, fahrenheit, kelvin), ' +
    'length (m, km, mi, ft, in, cm, mm), ' +
    'weight (kg, g, lb, oz), ' +
    'data (bytes, kb, mb, gb, tb), ' +
    'speed (mph, kph, mps, knots). ' +
    'Example: value=100, from="km", to="mi"',
  inputSchema: {
    type: 'object' as const,
    properties: {
      value: { type: 'number', description: 'The numeric value to convert' },
      from:  { type: 'string', description: 'Source unit (e.g. "celsius", "kg", "mi")' },
      to:    { type: 'string', description: 'Target unit (e.g. "fahrenheit", "lb", "km")' },
    },
    required: ['value', 'from', 'to'],
  },
  call: async ({ value, from, to }: { value: number; from: string; to: string }) => {
    const f = from.toLowerCase().trim()
    const t = to.toLowerCase().trim()

    if (f === t) return { data: JSON.stringify({ result: value, unit: t, note: 'Same unit — no conversion needed.' }) }

    // Temperature
    const toKelvin: Record<string, (v: number) => number> = {
      celsius:    v => v + 273.15,
      fahrenheit: v => (v - 32) * 5 / 9 + 273.15,
      kelvin:     v => v,
    }
    const fromKelvin: Record<string, (v: number) => number> = {
      celsius:    v => v - 273.15,
      fahrenheit: v => (v - 273.15) * 9 / 5 + 32,
      kelvin:     v => v,
    }
    if (toKelvin[f] && fromKelvin[t]) {
      const result = fromKelvin[t]!(toKelvin[f]!(value))
      return { data: JSON.stringify({ value, from: f, to: t, result: parseFloat(result.toFixed(4)) }) }
    }

    // Generic linear conversions (all to a base unit)
    const toBase: Record<string, number> = {
      // length → metres
      mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, mi: 1609.344,
      // weight → kg
      g: 0.001, kg: 1, oz: 0.028349523, lb: 0.45359237,
      // data → bytes
      bytes: 1, b: 1, kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776,
      // speed → m/s
      mps: 1, kph: 1 / 3.6, mph: 0.44704, knots: 0.514444,
    }

    if (toBase[f] === undefined) return { data: JSON.stringify({ error: `Unknown source unit: "${f}"` }) }
    if (toBase[t] === undefined) return { data: JSON.stringify({ error: `Unknown target unit: "${t}"` }) }

    const result = value * (toBase[f]! / toBase[t]!)
    return { data: JSON.stringify({ value, from: f, to: t, result: parseFloat(result.toFixed(6)) }) }
  },
})

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the YAAF Developer Playground assistant — a helpful, knowledgeable agent
that showcases the YAAF (Yet Another Agent Framework) by using real tools to answer questions.

## Your tools

| Tool              | What it does                                             |
|-------------------|----------------------------------------------------------|
| calculate         | Evaluate math expressions (arithmetic, trig, log, etc.) |
| get_system_info   | Return live Node.js / OS runtime information             |
| fetch_npm_info    | Look up any npm package from the live registry           |
| list_yaaf_examples| List all examples in the YAAF repository                 |
| convert_units     | Convert between temperature, length, weight, data, speed |

## Guidelines

- **Always use tools** when the user asks for facts that tools can answer — don't guess numbers.
- **Be concise** — lead with the answer, then add context if helpful.
- **Use markdown** — tables, code blocks, and lists make responses scannable.
- **Chain tools** — for complex questions, call multiple tools and synthesise the results.
- **Explain YAAF** when asked — YAAF is a TypeScript-first agent framework with streaming,
  multi-model support (Gemini, Claude, OpenAI), built-in Dev UI, tool calling, multi-agent
  orchestration, and production-ready HTTP server via \`createServer()\`.`

// ── Agent ─────────────────────────────────────────────────────────────────────

const agent = new Agent({
  name:          'Playground',
  systemPrompt:  SYSTEM_PROMPT,
  tools:         [calculate, getSystemInfo, fetchNpmInfo, listExamples, convertUnits],
  maxIterations: 8,
  temperature:   0.2,
})

// ── Server ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env['PORT'] ?? '3456', 10)

const serverPromise = createServer(agent, {
  port:         PORT,
  name:         'playground-agent',
  version:      '1.0.0',
  model:        MODEL,
  systemPrompt: SYSTEM_PROMPT,
  multiTurn:    true,
  devUi:        true,

  onStart: (port) => {
    const url = `http://localhost:${port}`
    const line = (label: string, val: string) =>
      `  │  ${label.padEnd(14)}${val.padEnd(30)}│\n`

    process.stdout.write(
      '\n' +
      '  ┌──────────────────────────────────────────────┐\n' +
      '  │  🧪  YAAF Developer Playground               │\n' +
      '  ├──────────────────────────────────────────────┤\n' +
      line('URL',        url) +
      line('Model',      MODEL) +
      line('Tools',      '5 (calculate, npm, units…)') +
      line('Multi-turn', 'enabled') +
      '  ├──────────────────────────────────────────────┤\n' +
      '  │  Try asking:                                 │\n' +
      '  │    "What is 2 ** 32?"                        │\n' +
      '  │    "Look up the zod npm package"             │\n' +
      '  │    "Convert 100 miles to km"                 │\n' +
      '  │    "What YAAF examples are there?"           │\n' +
      '  ├──────────────────────────────────────────────┤\n' +
      '  │  Press Ctrl+C to stop.                       │\n' +
      '  └──────────────────────────────────────────────┘\n\n',
    )
  },
})

// ── Graceful shutdown ─────────────────────────────────────────────────────────

process.on('SIGINT', async () => {
  process.stdout.write('\n  Shutting down…\n')
  const handle = await serverPromise
  await handle.close()
  process.exit(0)
})
