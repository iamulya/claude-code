/**
 * Skills Example — Demonstrates all Skill features in YAAF
 *
 * Skills are markdown-based capability packs that extend an agent's system prompt
 * at runtime — without code changes. They define domain knowledge, workflows,
 * coding standards, and procedures as structured markdown with YAML frontmatter.
 *
 * This example covers:
 *   1. Loading skills from a directory  (loadSkills)
 *   2. Defining inline skills           (defineSkill)
 *   3. The SkillRegistry with events    (SkillRegistry)
 *   4. Always-on vs opt-in skills       (always: true/false + forcedNames)
 *   5. Dynamic skill registration       (registerDynamic)
 *   6. Passing skills to an Agent       (Agent({ skills }))
 *   7. buildSkillSection() internals    (raw prompt injection text)
 *
 * Run:
 *   GEMINI_API_KEY=... npm start
 *   # or: OPENAI_API_KEY=... npm start
 *   # or: LLM_BASE_URL=http://localhost:11434/v1 LLM_MODEL=qwen2.5:72b npm start
 */

import {
  Agent,
  buildTool,
  loadSkills,
  loadSkill,
  defineSkill,
  buildSkillSection,
  SkillRegistry,
} from 'yaaf';
import type { Skill } from 'yaaf';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.join(__dirname, '..', 'skills');

// ── Helpers ──────────────────────────────────────────────────────────────────

function header(title: string) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(70)}\n`);
}

function printSkill(skill: Skill) {
  console.log(`  📝 ${skill.name}`);
  if (skill.description) console.log(`     ${skill.description}`);
  console.log(`     always: ${skill.always ?? true}  |  tags: ${(skill.tags ?? []).join(', ') || '(none)'}`);
  if (skill.filePath) console.log(`     file: ${path.relative(process.cwd(), skill.filePath)}`);
  console.log(`     instructions: ${skill.instructions.length} chars`);
}


// ─────────────────────────────────────────────────────────────────────────────
// 1. loadSkills() — load all .md files from a directory
// ─────────────────────────────────────────────────────────────────────────────

header('1. Loading Skills from a Directory');

const dirSkills = await loadSkills(SKILLS_DIR);
console.log(`Loaded ${dirSkills.length} skills from ${path.relative(process.cwd(), SKILLS_DIR)}/\n`);

for (const skill of dirSkills) {
  printSkill(skill);
  console.log();
}


// ─────────────────────────────────────────────────────────────────────────────
// 2. loadSkill() — load a single skill file
// ─────────────────────────────────────────────────────────────────────────────

header('2. Loading a Single Skill');

const reviewSkill = await loadSkill(path.join(SKILLS_DIR, 'code-review.md'));
console.log('Loaded single skill:');
printSkill(reviewSkill);


// ─────────────────────────────────────────────────────────────────────────────
// 3. defineSkill() — inline skill definition (no file needed)
// ─────────────────────────────────────────────────────────────────────────────

header('3. Defining an Inline Skill');

const apiDesignSkill = defineSkill({
  name: 'api-design',
  description: 'REST API design guidelines',
  version: '1.0',
  always: true,
  tags: ['api', 'rest', 'design'],
  instructions: `
# API Design Guidelines

When designing or reviewing REST APIs, follow these rules:

## URL Structure
- Use nouns, not verbs: \`/users\`, not \`/getUsers\`
- Use plural resource names: \`/users\`, not \`/user\`
- Nest sub-resources: \`/users/:id/orders\`
- Use kebab-case for multi-word resources: \`/order-items\`

## HTTP Methods
| Method | Usage | Idempotent |
|--------|-------|-----------|
| GET    | Read  | Yes       |
| POST   | Create | No       |
| PUT    | Replace | Yes     |
| PATCH  | Partial update | No |
| DELETE | Remove | Yes      |

## Status Codes
- 200 OK — success with body
- 201 Created — resource created (include Location header)
- 204 No Content — success without body (DELETE)
- 400 Bad Request — invalid input
- 401 Unauthorized — not authenticated
- 403 Forbidden — authenticated but not authorized
- 404 Not Found — resource doesn't exist
- 409 Conflict — resource state conflict
- 422 Unprocessable Entity — validation failure
- 429 Too Many Requests — rate limited (include Retry-After)

## Error Response
\`\`\`json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Email format is invalid",
    "details": [{ "field": "email", "issue": "must contain @" }]
  }
}
\`\`\`
  `.trim(),
});

console.log('Defined inline skill:');
printSkill(apiDesignSkill);


// ─────────────────────────────────────────────────────────────────────────────
// 4. SkillRegistry — centralized registry with event callbacks
// ─────────────────────────────────────────────────────────────────────────────

header('4. SkillRegistry with Events');

const registry = new SkillRegistry({
  onLoad: (skill) => console.log(`  ✅ Loaded: "${skill.name}"`),
  onRemove: (name) => console.log(`  ❌ Removed: "${name}"`),
});

// Load a directory into the registry
await registry.loadDir(SKILLS_DIR);

// Register the inline skill
registry.register(apiDesignSkill);

console.log(`\nRegistry contains ${registry.list().length} skills:\n`);
for (const skill of registry.list()) {
  console.log(`  • ${skill.name} (always: ${skill.always})`);
}


// ─────────────────────────────────────────────────────────────────────────────
// 5. Always-on vs opt-in skills + buildSkillSection()
// ─────────────────────────────────────────────────────────────────────────────

header('5. Always-on vs Opt-in Skills');

const allSkills = registry.list();
const alwaysOn = allSkills.filter(s => s.always);
const optIn = allSkills.filter(s => !s.always);

console.log(`  Always-on (${alwaysOn.length}): ${alwaysOn.map(s => s.name).join(', ')}`);
console.log(`  Opt-in    (${optIn.length}): ${optIn.map(s => s.name).join(', ')}\n`);

// buildSkillSection() only includes always:true skills by default
const defaultSection = buildSkillSection(allSkills);
console.log(`  Default section includes ${(defaultSection.match(/## Skill:/g) ?? []).length} skills`);

// Force opt-in skills by name
const withCommit = buildSkillSection(allSkills, ['commit-message']);
console.log(`  With 'commit-message' forced: ${(withCommit.match(/## Skill:/g) ?? []).length} skills`);

// Show what gets injected into the system prompt
console.log('\n  --- Injected section preview (first 300 chars) ---');
console.log(`  ${defaultSection.slice(0, 300).replace(/\n/g, '\n  ')}...`);


// ─────────────────────────────────────────────────────────────────────────────
// 6. registerDynamic() — register a skill from raw markdown at runtime
// ─────────────────────────────────────────────────────────────────────────────

header('6. Dynamic Skill Registration');

const dynamicMarkdown = `---
name: incident-response
description: On-call incident response runbook
version: "1.0"
always: false
tags: ops, incident
---

# Incident Response Runbook

When the user reports a production incident, follow this protocol:

## Step 1: Assess
- What is broken? (service name, endpoint, error)
- When did it start? (timestamp, deploy correlation)
- Who is affected? (percentage of users, specific tenants)

## Step 2: Mitigate
- Can we rollback the last deploy?
- Can we feature-flag the broken path?
- Is there a known workaround?

## Step 3: Communicate
- Post to #incidents with: Summary, Impact, ETA
- Update status page if customer-facing

## Step 4: Resolve
- Fix the root cause (not just the symptom)
- Write a blameless post-mortem within 48h
`;

const dynamicSkill = registry.registerDynamic(dynamicMarkdown);
console.log('Registered dynamic skill from raw markdown:');
printSkill(dynamicSkill);
console.log(`\nRegistry now contains ${registry.list().length} skills`);


// ─────────────────────────────────────────────────────────────────────────────
// 7. Passing skills to an Agent — they get injected into the system prompt
// ─────────────────────────────────────────────────────────────────────────────

header('7. Agent with Skills');

// A simple tool the agent can use
const analyzeCodeTool = buildTool({
  name: 'analyze_code',
  description: 'Analyze a code snippet for issues',
  inputSchema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'The code to analyze' },
      language: { type: 'string', description: 'Programming language' },
    },
    required: ['code', 'language'],
  },
  async call({ code, language }) {
    // Simulated analysis — in a real app this would call a linter/AST parser
    const issues = [];
    if (code.includes('any')) issues.push('Uses `any` type — prefer `unknown`');
    if (code.includes('console.log')) issues.push('Contains console.log — use a logger');
    if (!code.includes('try') && code.includes('await')) issues.push('Async code without try/catch');
    if (code.includes('eval(')) issues.push('CRITICAL: Uses eval() — potential code injection');
    return {
      language,
      lineCount: code.split('\n').length,
      issues: issues.length > 0 ? issues : ['No issues found'],
    };
  },
});

// Use only always-on skills plus the commit-message skill (forced)
const activeSkills = registry.list();

const agent = new Agent({
  systemPrompt: 'You are an expert software engineering assistant.',
  tools: [analyzeCodeTool],
  skills: activeSkills,
});

console.log(`Agent created with ${activeSkills.length} skills registered.`);
console.log('Always-on skills are injected into every prompt.');
console.log('Opt-in skills (commit-message, incident-response) are available but not injected by default.\n');

// Show the effective system prompt size
const effectiveSection = buildSkillSection(activeSkills);
console.log(`Skill section size: ${Buffer.byteLength(effectiveSection, 'utf8').toLocaleString()} bytes`);
console.log(`Skills injected into system prompt: ${(effectiveSection.match(/## Skill:/g) ?? []).length}`);

// Run the agent with a code review request
console.log('\n--- Running agent with a code review request ---\n');

const sampleCode = `
async function getUser(id: string) {
  const db = eval("require('database')");
  const user: any = await db.query("SELECT * FROM users WHERE id = " + id);
  console.log("Found user:", user);
  return user;
}
`;

try {
  const response = await agent.run(
    `Review this TypeScript code:\n\`\`\`typescript${sampleCode}\`\`\``,
  );
  console.log(response);
} catch (err) {
  // If no API key is set, the agent will fail — that's expected in a demo
  console.log(`⚠️  Agent run requires an LLM API key. Set GEMINI_API_KEY or OPENAI_API_KEY.`);
  console.log(`   Error: ${(err as Error).message.slice(0, 120)}`);
}


// ─────────────────────────────────────────────────────────────────────────────
// 8. buildSkillSection() with forcedNames — activating opt-in skills per-run
// ─────────────────────────────────────────────────────────────────────────────

header('8. Opt-in Skill Activation');

console.log('Building a prompt section with the opt-in "commit-message" skill forced:\n');

const commitSection = registry.buildSection(['commit-message']);
const skillCount = (commitSection.match(/## Skill:/g) ?? []).length;
console.log(`  Section contains ${skillCount} skills (always-on + forced opt-in)`);
console.log(`  Size: ${Buffer.byteLength(commitSection, 'utf8').toLocaleString()} bytes\n`);

// Show which skills are included
const skillNames = [...commitSection.matchAll(/## Skill: (\S+)/g)].map(m => m[1]);
console.log(`  Included: ${skillNames.join(', ')}`);


// ─────────────────────────────────────────────────────────────────────────────
// Cleanup
// ─────────────────────────────────────────────────────────────────────────────

header('Done');

console.log('Skills demo complete. Key takeaways:\n');
console.log('  • Skills are markdown files with YAML frontmatter');
console.log('  • loadSkills(dir) loads all .md files from a directory');
console.log('  • defineSkill({...}) creates inline skills without files');
console.log('  • SkillRegistry manages skills with load/unload events');
console.log('  • always:true skills are always injected; always:false are opt-in');
console.log('  • buildSkillSection(skills, forcedNames) controls injection');
console.log('  • Agent({ skills }) auto-injects active skills into the system prompt');
console.log('  • registerDynamic(markdown) adds skills at runtime from raw text');
console.log();
