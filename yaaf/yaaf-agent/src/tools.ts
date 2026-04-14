/**
 * Code Intelligence Tools for the YAAF Expert Agent
 *
 * Uses buildTool() to produce properly-typed Tool instances that conform
 * to YAAF's full Tool interface (call, describe, permissions, etc.).
 *
 * All paths are sandboxed to the YAAF project root.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { execSync } from 'child_process'
import { buildTool, type Tool } from 'yaaf'

// ── Helpers ──────────────────────────────────────────────────────────────────

const YAAF_ROOT = path.resolve(import.meta.dirname, '..', '..')

function safePath(relativePath: string): string {
  const resolved = path.resolve(YAAF_ROOT, relativePath)
  if (!resolved.startsWith(YAAF_ROOT)) {
    throw new Error(`Path "${relativePath}" escapes the YAAF project root.`)
  }
  return resolved
}

function runCmd(cmd: string, cwd: string = YAAF_ROOT): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(cmd, { cwd, encoding: 'utf8', timeout: 60_000, maxBuffer: 1024 * 1024 })
    return { stdout, stderr: '', exitCode: 0 }
  } catch (err: any) {
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? err.message ?? '',
      exitCode: err.status ?? 1,
    }
  }
}

// ── read_file ────────────────────────────────────────────────────────────────

export const readFileTool: Tool = buildTool({
  name: 'read_file',
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: { type: 'string', description: 'Relative path from YAAF root' },
      start_line: { type: 'number', description: 'Start line (1-indexed, inclusive)' },
      end_line: { type: 'number', description: 'End line (1-indexed, inclusive)' },
    },
    required: ['path'],
  },
  maxResultChars: 100_000,
  describe: (input) => `Read ${(input as any).path}`,
  async call(input) {
    const args = input as Record<string, unknown>
    const filePath = safePath(args.path as string)
    const content = await fs.readFile(filePath, 'utf8')
    const lines = content.split('\n')
    const startLine = (args.start_line as number | undefined) ?? 1
    const endLine = (args.end_line as number | undefined) ?? lines.length
    const slice = lines.slice(startLine - 1, endLine)
    const numbered = slice.map((l, i) => `${startLine + i}: ${l}`).join('\n')
    return { data: `File: ${args.path} (${lines.length} lines total)\n${numbered}` }
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  prompt: () => 'Read the contents of a file in the YAAF source tree. Supports optional line ranges via start_line and end_line.',
})

// ── grep_search ──────────────────────────────────────────────────────────────

export const grepSearchTool: Tool = buildTool({
  name: 'grep_search',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: { type: 'string', description: 'Search pattern (literal string or regex)' },
      path: { type: 'string', description: 'Relative path to scope the search (default: whole project)' },
      includes: { type: 'string', description: 'File glob filter (default: *.ts)' },
      case_insensitive: { type: 'boolean', description: 'Case-insensitive search' },
    },
    required: ['query'],
  },
  maxResultChars: 50_000,
  describe: (input) => `Search for "${(input as any).query}"`,
  async call(input) {
    const args = input as Record<string, unknown>
    const query = args.query as string
    const searchPath = args.path ? safePath(args.path as string) : YAAF_ROOT
    const includes = (args.includes as string | undefined) ?? '*.ts'
    const caseFlag = args.case_insensitive ? '-i' : ''
    const escapedQuery = query.replace(/"/g, '\\"')
    const cmd = `grep -rnI ${caseFlag} --include="${includes}" "${escapedQuery}" "${searchPath}" | head -50`
    const { stdout } = runCmd(cmd)
    if (!stdout.trim()) return { data: `No matches found for "${query}"` }
    const results = stdout.split('\n').filter(Boolean).map(l => l.replace(YAAF_ROOT + '/', '')).join('\n')
    return { data: `Matches for "${query}":\n${results}` }
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  prompt: () => 'Search for a pattern across YAAF source files using grep. Returns matching lines with file paths and line numbers. Max 50 results.',
})

// ── list_dir ─────────────────────────────────────────────────────────────────

export const listDirTool: Tool = buildTool({
  name: 'list_dir',
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: { type: 'string', description: 'Relative path to list (default: project root)' },
    },
    required: [],
  },
  maxResultChars: 30_000,
  describe: (input) => `List ${(input as any).path ?? '.'}`,
  async call(input) {
    const args = input as Record<string, unknown>
    const dirPath = safePath((args.path as string) ?? '.')
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const lines: string[] = []
    for (const entry of entries) {
      if (['node_modules', 'dist', '.git'].includes(entry.name)) continue
      if (entry.isDirectory()) {
        lines.push(`📁 ${entry.name}/`)
      } else {
        const stat = await fs.stat(path.join(dirPath, entry.name))
        lines.push(`📄 ${entry.name} (${(stat.size / 1024).toFixed(1)}KB)`)
      }
    }
    return { data: `Contents of ${args.path ?? '.'}:\n${lines.join('\n')}` }
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  prompt: () => 'List files and subdirectories in the YAAF source tree. Skips node_modules, dist, and .git.',
})

// ── run_tsc ──────────────────────────────────────────────────────────────────

export const runTscTool: Tool = buildTool({
  name: 'run_tsc',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
  maxResultChars: 50_000,
  describe: () => 'Run TypeScript compiler check',
  async call() {
    const { stdout, stderr, exitCode } = runCmd('npx tsc --noEmit 2>&1')
    const output = (stdout + stderr).trim()
    if (exitCode === 0) return { data: '✅ TypeScript compilation: No errors.' }
    const errorMatch = output.match(/Found (\d+) error/)
    const errorCount = errorMatch ? errorMatch[1] : 'unknown'
    return { data: `❌ TypeScript compilation: ${errorCount} error(s)\n\n${output}` }
  },
  isReadOnly: () => true,
  prompt: () => 'Run `tsc --noEmit` on the YAAF project to check for type errors. Returns the compiler output.',
})

// ── run_tests ────────────────────────────────────────────────────────────────

export const runTestsTool: Tool = buildTool({
  name: 'run_tests',
  inputSchema: {
    type: 'object' as const,
    properties: {
      filter: { type: 'string', description: 'Optional test name filter' },
    },
    required: [],
  },
  maxResultChars: 100_000,
  describe: (input) => `Run tests${(input as any).filter ? ` (filter: ${(input as any).filter})` : ''}`,
  async call(input) {
    const args = input as Record<string, unknown>
    const filter = args.filter ? ` -- --grep "${args.filter}"` : ''
    const { stdout, stderr, exitCode } = runCmd(`npm test${filter} 2>&1`)
    const output = (stdout + stderr).trim()
    const summaryMatch = output.match(/Tests?\s+\d+\s+passed.*|Test Files\s+\d+\s+passed.*/g)
    const summary = summaryMatch ? summaryMatch.join('\n') : ''
    if (exitCode === 0) return { data: `✅ Tests passed.\n${summary}\n\n${output.slice(-500)}` }
    return { data: `❌ Test failures detected.\n${summary}\n\n${output}` }
  },
  isReadOnly: () => true,
  prompt: () => 'Run the YAAF test suite (vitest) and return results. Optionally filter by test name.',
})

// ── get_project_structure ────────────────────────────────────────────────────

export const getProjectStructureTool: Tool = buildTool({
  name: 'get_project_structure',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
  maxResultChars: 50_000,
  describe: () => 'Get YAAF project structure',
  async call() {
    const { stdout } = runCmd(
      `find . -type f \\( -name "*.ts" -o -name "*.md" \\) ` +
      `-not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.git/*" ` +
      `| sort`,
    )
    const files = stdout.trim().split('\n').filter(Boolean)
    const tree = new Map<string, string[]>()
    for (const f of files) {
      const dir = path.dirname(f)
      if (!tree.has(dir)) tree.set(dir, [])
      tree.get(dir)!.push(path.basename(f))
    }
    const lines: string[] = [`YAAF Project Structure (${files.length} files)\n`]
    for (const [dir, children] of [...tree.entries()].sort()) {
      lines.push(`📁 ${dir}/`)
      for (const child of children) lines.push(`   ${child}`)
    }
    return { data: lines.join('\n') }
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  prompt: () => 'Get a full map of all TypeScript and Markdown files in the YAAF project.',
})

// ── Export all tools ─────────────────────────────────────────────────────────

export const codeIntelligenceTools: Tool[] = [
  readFileTool,
  grepSearchTool,
  listDirTool,
  runTscTool,
  runTestsTool,
  getProjectStructureTool,
]
