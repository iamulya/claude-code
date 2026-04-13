/**
 * Tests for the YAAF CLI.
 *
 * Tests the init, add, and context commands.
 * Dev and run commands are integration-level (tested manually).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, readdir, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { initProject } from '../cli/init.js'
import { addComponent } from '../cli/add.js'
import { contextList } from '../cli/context.js'

// ── Helpers ──────────────────────────────────────────────────────────────────

let tempDir: string
let originalCwd: string

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'yaaf-test-'))
  originalCwd = process.cwd()
  process.chdir(tempDir)
})

afterEach(async () => {
  process.chdir(originalCwd)
  await rm(tempDir, { recursive: true, force: true })
})

// ════════════════════════════════════════════════════════════════════════════
// yaaf init
// ════════════════════════════════════════════════════════════════════════════

describe('yaaf init', () => {
  it('creates a project in a new directory', async () => {
    await initProject('test-agent')

    const dir = resolve(tempDir, 'test-agent')

    // Verify key files exist
    const pkg = JSON.parse(await readFile(resolve(dir, 'package.json'), 'utf-8'))
    expect(pkg.name).toBe('test-agent')
    expect(pkg.dependencies.yaaf).toBeDefined()

    // Verify directory structure
    const agentTs = await readFile(resolve(dir, 'src/agent.ts'), 'utf-8')
    expect(agentTs).toContain('test-agent')
    expect(agentTs).toContain("import { Agent } from 'yaaf'")

    // Verify tool scaffold
    const searchTs = await readFile(resolve(dir, 'src/tools/search.ts'), 'utf-8')
    expect(searchTs).toContain('buildTool')

    // Verify SOUL.md
    const soul = await readFile(resolve(dir, 'SOUL.md'), 'utf-8')
    expect(soul).toContain('test-agent')

    // Verify SKILL.md
    const skill = await readFile(resolve(dir, 'skills/SKILL.md'), 'utf-8')
    expect(skill).toContain('name: default')

    // Verify tsconfig
    const tsconfig = JSON.parse(await readFile(resolve(dir, 'tsconfig.json'), 'utf-8'))
    expect(tsconfig.compilerOptions.module).toBe('NodeNext')

    // Verify test template
    const testFile = await readFile(resolve(dir, 'tests/agent.test.ts'), 'utf-8')
    expect(testFile).toContain('vitest')

    // Verify .gitignore
    const gitignore = await readFile(resolve(dir, '.gitignore'), 'utf-8')
    expect(gitignore).toContain('node_modules')

    // Verify README
    const readme = await readFile(resolve(dir, 'README.md'), 'utf-8')
    expect(readme).toContain('test-agent')
  })

  it('errors on existing directory', async () => {
    await initProject('existing')
    await expect(initProject('existing')).rejects.toThrow(/already exists/)
  })

  it('creates project in current directory when no name given', async () => {
    await initProject()
    const pkg = JSON.parse(await readFile(resolve(tempDir, 'package.json'), 'utf-8'))
    expect(pkg).toBeDefined()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// yaaf add
// ════════════════════════════════════════════════════════════════════════════

describe('yaaf add', () => {
  it('adds a tool scaffold', async () => {
    await addComponent(['tool', 'weather'])

    const filePath = resolve(tempDir, 'src/tools/weather.ts')
    const content = await readFile(filePath, 'utf-8')

    expect(content).toContain("name: 'weather'")
    expect(content).toContain('buildTool')
    expect(content).toContain('weatherTool')
  })

  it('adds a tool with hyphenated name -> camelCase export', async () => {
    await addComponent(['tool', 'file-reader'])

    const filePath = resolve(tempDir, 'src/tools/file-reader.ts')
    const content = await readFile(filePath, 'utf-8')

    expect(content).toContain("name: 'file-reader'")
    expect(content).toContain('fileReaderTool')
  })

  it('errors on duplicate tool', async () => {
    await addComponent(['tool', 'weather'])
    await expect(addComponent(['tool', 'weather'])).rejects.toThrow(/already exists/)
  })

  it('adds a skill in directory format', async () => {
    await addComponent(['skill', 'security-review'])

    const filePath = resolve(tempDir, 'skills/security-review/SKILL.md')
    const content = await readFile(filePath, 'utf-8')

    expect(content).toContain('name: security-review')
    expect(content).toContain('# Security-review Skill')
  })

  it('errors on duplicate skill', async () => {
    await addComponent(['skill', 'analysis'])
    await expect(addComponent(['skill', 'analysis'])).rejects.toThrow(/already exists/)
  })

  it('shows help when too few args', async () => {
    // Should not throw, just log help
    await addComponent([])
    await addComponent(['tool'])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// yaaf context list
// ════════════════════════════════════════════════════════════════════════════

describe('yaaf context list', () => {
  it('handles empty project gracefully', async () => {
    // No files yet — should not throw
    await contextList()
  })

  it('finds SOUL.md', async () => {
    // Create a minimal project
    await initProject()
    await contextList()
    // Primarily checking it doesn't crash — visual output is console.log
  })

  it('finds skills and tools', async () => {
    await initProject()
    await addComponent(['tool', 'weather'])
    await addComponent(['skill', 'code-review'])
    await contextList()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// CLI main (command routing)
// ════════════════════════════════════════════════════════════════════════════

describe('CLI main', () => {
  // We import main but can't easily test it without process.argv mocking.
  // Instead test the individual commands above and verify compilation works.

  it('module exports main function', async () => {
    const mod = await import('../cli/index.js')
    expect(typeof mod.main).toBe('function')
  })

  it('--help does not throw', async () => {
    const mod = await import('../cli/index.js')
    await mod.main(['--help'])
  })

  it('--version does not throw', async () => {
    const mod = await import('../cli/index.js')
    await mod.main(['--version'])
  })

  it('unknown command sets exitCode', async () => {
    const mod = await import('../cli/index.js')
    process.exitCode = 0
    await mod.main(['unknown-command-xyz'])
    expect(process.exitCode).toBe(1)
    process.exitCode = 0
  })
})
