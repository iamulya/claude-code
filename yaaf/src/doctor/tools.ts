/**
 * YAAF Doctor — Code Intelligence Tools
 *
 * Uses buildTool() to give the doctor agent the ability to read, search,
 * compile, test, and inspect a YAAF-based project.
 *
 * All paths are sandboxed to the developer's project root.
 * The tools work on ANY project that uses YAAF — not just the YAAF repo itself.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { execSync } from 'child_process'
import { buildTool, type Tool } from '../tools/tool.js'

// ── Helpers ──────────────────────────────────────────────────────────────────

function safePath(root: string, relativePath: string): string {
  const resolved = path.resolve(root, relativePath)
  if (!resolved.startsWith(root)) {
    throw new Error(`Path "${relativePath}" escapes the project root.`)
  }
  return resolved
}

function runCmd(
  cmd: string,
  cwd: string,
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(cmd, {
      cwd,
      encoding: 'utf8',
      timeout: 120_000,
      maxBuffer: 2 * 1024 * 1024,
    })
    return { stdout, stderr: '', exitCode: 0 }
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string; status?: number }
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? e.message ?? '',
      exitCode: e.status ?? 1,
    }
  }
}

// ── Input types for each tool ─────────────────────────────────────────────────

type ReadFileInput = {
  path: string
  start_line?: number
  end_line?: number
}

type GrepSearchInput = {
  query: string
  path?: string
  includes?: string
  case_insensitive?: boolean
}

type ListDirInput = {
  path?: string
}

type RunTestsInput = {
  filter?: string
}

// ── Tool Factory ─────────────────────────────────────────────────────────────
//
// All tools are created via a factory that receives the project root.
// This is critical — the developer's project root is NOT the YAAF repo.
//

export function createDoctorTools(projectRoot: string): Tool[] {
  const readFileTool = buildTool<ReadFileInput>({
    name: 'read_file',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Relative path from project root' },
        start_line: { type: 'number', description: 'Start line (1-indexed, inclusive)' },
        end_line: { type: 'number', description: 'End line (1-indexed, inclusive)' },
      },
      required: ['path'],
    },
    maxResultChars: 100_000,
    describe: ({ path: p }) => `Read ${p}`,
    async call({ path: p, start_line, end_line }) {
      const filePath = safePath(projectRoot, p)
      const content = await fs.readFile(filePath, 'utf8')
      const lines = content.split('\n')
      const startLine = start_line ?? 1
      const endLine = end_line ?? lines.length
      const slice = lines.slice(startLine - 1, endLine)
      const numbered = slice.map((l, i) => `${startLine + i}: ${l}`).join('\n')
      return { data: `File: ${p} (${lines.length} lines)\n${numbered}` }
    },
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
    prompt: () =>
      'Read the contents of a file in the project. Supports optional line ranges.',
  })

  const grepSearchTool = buildTool<GrepSearchInput>({
    name: 'grep_search',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search pattern' },
        path: {
          type: 'string',
          description: 'Relative path to scope the search (default: project root)',
        },
        includes: { type: 'string', description: 'File glob (default: *.ts)' },
        case_insensitive: { type: 'boolean', description: 'Case-insensitive search' },
      },
      required: ['query'],
    },
    maxResultChars: 50_000,
    describe: ({ query }) => `Search for "${query}"`,
    async call({ query, path: searchPath, includes = '*.ts', case_insensitive }) {
      const searchDir = searchPath
        ? safePath(projectRoot, searchPath)
        : projectRoot
      const caseFlag = case_insensitive ? '-i' : ''
      const escaped = query.replace(/"/g, '\\"')
      const cmd = `grep -rnI ${caseFlag} --include="${includes}" "${escaped}" "${searchDir}" | head -50`
      const { stdout } = runCmd(cmd, projectRoot)
      if (!stdout.trim()) return { data: `No matches found for "${query}"` }
      const results = stdout
        .split('\n')
        .filter(Boolean)
        .map((l) => l.replace(projectRoot + '/', ''))
        .join('\n')
      return { data: `Matches:\n${results}` }
    },
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
    prompt: () =>
      'Search for a pattern across project source files. Returns matching lines with paths and line numbers.',
  })

  const listDirTool = buildTool<ListDirInput>({
    name: 'list_dir',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Relative path to list (default: root)' },
      },
      required: [],
    },
    maxResultChars: 30_000,
    describe: ({ path: p }) => `List ${p ?? '.'}`,
    async call({ path: p = '.' }) {
      const dirPath = safePath(projectRoot, p)
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
      return { data: `Contents of ${p}:\n${lines.join('\n')}` }
    },
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
    prompt: () => 'List files and subdirectories.',
  })

  const runTscTool = buildTool({
    name: 'run_tsc',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    maxResultChars: 50_000,
    describe: () => 'Run TypeScript compiler check',
    async call() {
      const { stdout, stderr, exitCode } = runCmd('npx tsc --noEmit 2>&1', projectRoot)
      const output = (stdout + stderr).trim()
      if (exitCode === 0) return { data: '✅ TypeScript compilation: No errors.' }
      const errorMatch = output.match(/Found (\d+) error/)
      const count = errorMatch ? errorMatch[1] : 'unknown'
      return { data: `❌ TypeScript: ${count} error(s)\n\n${output}` }
    },
    isReadOnly: () => true,
    prompt: () => 'Run tsc --noEmit to check for TypeScript errors.',
  })

  const runTestsTool = buildTool<RunTestsInput>({
    name: 'run_tests',
    inputSchema: {
      type: 'object' as const,
      properties: {
        filter: { type: 'string', description: 'Optional test name filter' },
      },
      required: [],
    },
    maxResultChars: 100_000,
    describe: ({ filter }) =>
      `Run tests${filter ? ` (filter: ${filter})` : ''}`,
    async call({ filter }) {
      const filterArg = filter ? ` -- --grep "${filter}"` : ''
      const { stdout, stderr, exitCode } = runCmd(
        `npm test${filterArg} 2>&1`,
        projectRoot,
      )
      const output = (stdout + stderr).trim()
      if (exitCode === 0) return { data: `✅ Tests passed.\n\n${output.slice(-500)}` }
      return { data: `❌ Test failures detected.\n\n${output}` }
    },
    isReadOnly: () => true,
    prompt: () => 'Run the project test suite and return results.',
  })

  const getStructureTool = buildTool({
    name: 'get_project_structure',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    maxResultChars: 50_000,
    describe: () => 'Get project structure',
    async call() {
      const { stdout } = runCmd(
        `find . -type f \\( -name "*.ts" -o -name "*.md" -o -name "*.json" \\) ` +
          `-not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.git/*" ` +
          `| sort | head -200`,
        projectRoot,
      )
      const files = stdout.trim().split('\n').filter(Boolean)
      return { data: `Project (${files.length} files):\n${files.join('\n')}` }
    },
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
    prompt: () => 'Get the full file tree of the project (TS, MD, JSON files).',
  })

  return [
    readFileTool,
    grepSearchTool,
    listDirTool,
    runTscTool,
    runTestsTool,
    getStructureTool,
  ]
}
