/**
 * yaaf init — Scaffold a new agent project.
 *
 * Creates a fully working agent project with:
 * - TypeScript configuration
 * - Entry point with a sample agent
 * - Example tool
 * - SKILL.md template
 * - SOUL.md template
 * - Test scaffold
 *
 * @module cli/init
 */

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, basename } from "node:path";

// ── Styling ──────────────────────────────────────────────────────────────────

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

// ── Templates ────────────────────────────────────────────────────────────────

const PACKAGE_JSON = (name: string) =>
  JSON.stringify(
    {
      name,
      version: "0.1.0",
      type: "module",
      private: true,
      scripts: {
        dev: "yaaf dev",
        start: "yaaf run",
        build: "tsc",
        test: "vitest run",
      },
      dependencies: {
        yaaf: "^0.3.0",
      },
      devDependencies: {
        "@types/node": "^22.0.0",
        typescript: "^5.5.0",
        tsx: "^4.0.0",
        vitest: "^3.2.0",
      },
    },
    null,
    2,
  );

const TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      lib: ["ES2022"],
      outDir: "./dist",
      rootDir: "./src",
      strict: true,
      esModuleInterop: true,
      declaration: true,
      sourceMap: true,
      skipLibCheck: true,
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "dist"],
  },
  null,
  2,
);

const AGENT_TS = (name: string) => `/**
 * ${name} — YAAF Agent
 *
 * Edit this file to configure your agent's behavior,
 * tools, and system prompt.
 */

import { Agent } from 'yaaf';
import { searchTool } from './tools/search.js';

const agent = new Agent({
 systemPrompt: \`You are a helpful AI assistant called ${name}.
You are concise, friendly, and always try to be helpful.
If you don't know something, say so honestly.\`,

 tools: [searchTool],

 // Uncomment to configure:
 // model: 'gemini-2.5-flash',
 // maxIterations: 10,
});

// Run the agent
const input = process.argv.slice(2).join(' ') || 'Hello! What can you do?';
const response = await agent.run(input);
console.log(response);
`;

const SEARCH_TOOL = `/**
 * Example tool — web search.
 *
 * Replace this with your own tools. Each tool needs:
 * - A name and description (used by the LLM to decide when to call it)
 * - An input schema (validated before execution)
 * - An execute function
 */

import { buildTool } from 'yaaf';

export const searchTool = buildTool({
 name: 'search',
 description: 'Search the web for information. Use this when the user asks about current events or facts you are unsure about.',
 inputSchema: {
 type: 'object',
 properties: {
 query: {
 type: 'string',
 description: 'The search query',
 },
 },
 required: ['query'],
 },
 execute: async (input) => {
 // Replace with real search API (e.g., Brave, Tavily, SearXNG)
 return \`Search results for: "\${input.query}"\\n\\n[Replace this with a real search integration]\`;
 },
});
`;

const SKILL_MD = `---
name: default
description: Default agent skill
---

# Default Skill

You are a helpful assistant. Follow these guidelines:

1. Be concise and direct in your responses
2. If you're unsure about something, say so
3. When using tools, explain what you're doing and why
4. Format responses with markdown when it improves readability
`;

const SOUL_MD = (name: string) => `---
name: ${name}
tone: friendly
---

# Personality
You are ${name}, a helpful and knowledgeable AI assistant.
You are concise but thorough, friendly but professional.

# Rules
- Always be honest about what you know and don't know
- Never fabricate information
- Explain your reasoning when it's helpful
- Use tools when they would help answer the question

# Preferences
- language: English
- format: markdown
`;

const AGENT_TEST = (name: string) => `/**
 * Tests for ${name} agent.
 */

import { describe, it, expect } from 'vitest';

describe('${name}', () => {
 it('loads without errors', async () => {
 // Verify the agent module can be imported
 const mod = await import('../src/agent.js');
 expect(mod).toBeDefined();
 });

 // Add your agent-specific tests here
 // Example:
 // it('uses search tool when asked about current events', async () => {
 // const agent = createTestAgent({ tools: [searchTool] });
 // const response = await agent.run('What happened today?');
 // expect(response).toContain('search');
 // });
});
`;

const GITIGNORE = `node_modules/
dist/
.yaaf/
*.tsbuildinfo
`;

const README = (name: string) => `# ${name}

A YAAF-powered AI agent.

## Setup

\`\`\`bash
npm install
\`\`\`

Set your API key:

\`\`\`bash
export GOOGLE_API_KEY=your-key-here
# or
export OPENAI_API_KEY=your-key-here
# or
export ANTHROPIC_API_KEY=your-key-here
\`\`\`

## Development

\`\`\`bash
# Interactive REPL mode
npm run dev

# Run with a specific prompt
npx tsx src/agent.ts "What is the weather today?"

# Run tests
npm test
\`\`\`

## Project Structure

\`\`\`
${name}/
├── src/
│ ├── agent.ts # Agent configuration
│ └── tools/
│ └── search.ts # Tool definitions
├── skills/
│ └── SKILL.md # Agent skills
├── SOUL.md # Agent personality
├── tests/
│ └── agent.test.ts # Tests
└── package.json
\`\`\`

## Adding Tools

\`\`\`bash
yaaf add tool my-tool
\`\`\`

## Adding Skills

\`\`\`bash
yaaf add skill my-skill
\`\`\`

Built with [YAAF](https://github.com/yaaf) — Yet Another Agentic Framework.
`;

// ── Init Command ─────────────────────────────────────────────────────────────

export async function initProject(nameArg?: string): Promise<void> {
  const name = nameArg ?? basename(process.cwd());

  // Determine target directory
  const targetDir = nameArg ? resolve(process.cwd(), nameArg) : process.cwd();

  // Check if directory exists and is non-empty
  if (nameArg && existsSync(targetDir)) {
    throw new Error(`Directory "${nameArg}" already exists`);
  }

  console.log(`\n${CYAN}${BOLD}Creating ${name}...${RESET}\n`);

  // Create directories
  const dirs = ["", "src", "src/tools", "skills", "tests"];

  for (const dir of dirs) {
    const p = resolve(targetDir, dir);
    if (!existsSync(p)) {
      await mkdir(p, { recursive: true });
    }
  }

  // Write files
  const files: [string, string][] = [
    ["package.json", PACKAGE_JSON(name)],
    ["tsconfig.json", TSCONFIG],
    ["src/agent.ts", AGENT_TS(name)],
    ["src/tools/search.ts", SEARCH_TOOL],
    ["skills/SKILL.md", SKILL_MD],
    ["SOUL.md", SOUL_MD(name)],
    ["tests/agent.test.ts", AGENT_TEST(name)],
    [".gitignore", GITIGNORE],
    ["README.md", README(name)],
  ];

  for (const [file, content] of files) {
    const filePath = resolve(targetDir, file);
    await writeFile(filePath, content, "utf-8");
    console.log(` ${GREEN}✓${RESET} ${DIM}${file}${RESET}`);
  }

  console.log(`
${GREEN}${BOLD}✓ Project created!${RESET}

 ${BOLD}Next steps:${RESET}
 ${DIM}$${RESET} ${nameArg ? `cd ${nameArg}\n ${DIM}$${RESET} ` : ""}npm install
 ${DIM}$${RESET} export GOOGLE_API_KEY=your-key ${DIM}# or OPENAI_API_KEY${RESET}
 ${DIM}$${RESET} yaaf dev ${DIM}# Interactive REPL${RESET}
`);
}
