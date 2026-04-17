/**
 * yaaf add — Scaffold new tools and skills.
 *
 * Usage:
 * yaaf add tool <name> Add a new tool
 * yaaf add skill <name> Add a new SKILL.md
 *
 * @module cli/add
 */

import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// ── Styling ──────────────────────────────────────────────────────────────────

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

// ── Templates ────────────────────────────────────────────────────────────────

function toolTemplate(name: string): string {
  const camelName = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  return `/**
 * ${name} tool
 *
 * Description: [Describe what this tool does]
 */

import { buildTool } from 'yaaf';

export const ${camelName}Tool = buildTool({
 name: '${name}',
 description: '[Describe when the LLM should use this tool]',
 inputSchema: {
 type: 'object',
 properties: {
 query: {
 type: 'string',
 description: '[Describe the input]',
 },
 },
 required: ['query'],
 },
 execute: async (input) => {
 // Implement your tool logic here
 return \`${name} result for: \${input.query}\`;
 },
});
`;
}

function skillTemplate(name: string): string {
  return `---
name: ${name}
description: [Describe what this skill adds to the agent]
---

# ${name.charAt(0).toUpperCase() + name.slice(1)} Skill

[Instructions for the agent when this skill is active]

## Guidelines

1. [First guideline]
2. [Second guideline]
3. [Third guideline]

## Examples

When asked about [topic], respond with [approach].
`;
}

// ── Add Command ──────────────────────────────────────────────────────────────

export async function addComponent(args: string[]): Promise<void> {
  if (args.length < 2) {
    console.log(`
${BOLD}Usage:${RESET}
 ${CYAN}yaaf add${RESET} tool <name> Add a new tool
 ${CYAN}yaaf add${RESET} skill <name> Add a new skill

${BOLD}Examples:${RESET}
 ${DIM}$${RESET} yaaf add tool weather
 ${DIM}$${RESET} yaaf add tool file-reader
 ${DIM}$${RESET} yaaf add skill security-review
`);
    return;
  }

  const [type, name] = args;

  switch (type) {
    case "tool":
      await addTool(name!);
      break;
    case "skill":
      await addSkill(name!);
      break;
    default:
      console.error(`${RED}Unknown component type: ${type}${RESET}`);
      console.log(` Supported types: tool, skill`);
      process.exitCode = 1;
  }
}

async function addTool(name: string): Promise<void> {
  const cwd = process.cwd();
  const toolsDir = resolve(cwd, "src/tools");
  const filePath = resolve(toolsDir, `${name}.ts`);

  if (existsSync(filePath)) {
    throw new Error(`Tool "${name}" already exists at src/tools/${name}.ts`);
  }

  // Ensure directory exists
  if (!existsSync(toolsDir)) {
    await mkdir(toolsDir, { recursive: true });
  }

  await writeFile(filePath, toolTemplate(name), "utf-8");

  console.log(`
 ${GREEN}✓${RESET} Created ${CYAN}src/tools/${name}.ts${RESET}

 ${BOLD}Next steps:${RESET}
 1. Edit ${DIM}src/tools/${name}.ts${RESET} with your tool logic
 2. Import it in your agent:

 ${DIM}import { ${name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())}Tool } from './tools/${name}.js';${RESET}
`);
}

async function addSkill(name: string): Promise<void> {
  const cwd = process.cwd();
  const skillsDir = resolve(cwd, "skills");
  const filePath = resolve(skillsDir, `${name}.md`);

  // Also support skills/<name>/SKILL.md format
  const dirPath = resolve(skillsDir, name);
  const skillMdPath = resolve(dirPath, "SKILL.md");

  if (existsSync(filePath) || existsSync(skillMdPath)) {
    throw new Error(`Skill "${name}" already exists`);
  }

  // Create as skills/<name>/SKILL.md (OpenClaw-compatible format)
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }

  await writeFile(skillMdPath, skillTemplate(name), "utf-8");

  console.log(`
 ${GREEN}✓${RESET} Created ${CYAN}skills/${name}/SKILL.md${RESET}

 ${BOLD}Next step:${RESET}
 Edit ${DIM}skills/${name}/SKILL.md${RESET} with your skill instructions.
 Skills are automatically injected into the system prompt.
`);
}
