---
title: Skills
entity_type: concept
summary: Markdown-based capability packs that extend an agent's instructions and domain knowledge at runtime without code changes.
related_subsystems:
  - Agent
stub: false
compiled_at: 2026-04-16T14:12:42.272Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agent.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/skills.ts
confidence: 0.95
---

## What It Is
Skills are modular, markdown-based capability packs used to extend an agent's instructions, domain knowledge, and procedural capabilities at runtime. They allow developers to modify or enhance agent behavior without changing the underlying application code or the base system prompt.

Skills solve the problem of prompt bloat and rigid instruction sets by providing a structured way to:
- Add specific domain knowledge and constraints.
- Define reusable workflows and standard operating procedures.
- Provide few-shot demonstrations and examples for specific tasks.

## How It Works in YAAF
In YAAF, a Skill is represented by the `Skill` type, which combines metadata (frontmatter) with instruction content. These skills are typically stored as `.md` files on disk or defined inline within the application.

### The Skill Structure
A skill consists of two primary parts:
1.  **Frontmatter**: A YAML-like metadata block defining the skill's `name`, `description`, `version`, and behavior (such as whether it is `always` active).
2.  **Instructions**: The markdown content that contains the actual rules, knowledge, or examples to be injected.

### Injection Mechanism
When an `Agent` is initialized with a list of skills, the framework uses the `buildSkillSection` utility to compile these skills into a single text block. This block is then appended to the agent's effective system prompt. By default, any skill marked with `always: true` (the default state) is included in every run.

### Implementation Classes
- **`loadSkills(dir)`**: An asynchronous function that reads all markdown files in a directory and parses them into `Skill` objects.
- **`defineSkill(skill)`**: A utility for creating skills programmatically within TypeScript code.
- **`SkillRegistry`**: A management class that handles the loading, updating, and removal of skills, supporting events like `onLoad` and `onError`.

## Configuration
Skills are integrated into an agent via the `AgentConfig` object. They can be loaded from the filesystem or defined inline.

### Loading from Filesystem
```ts
import { Agent, loadSkills } from 'yaaf';

// Load all skills from a local directory
const skills = await loadSkills('./src/agent/skills');

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  skills,
});
```

### Inline Definition
Developers can define skills directly in code using `defineSkill`:
```ts
import { Agent, defineSkill } from 'yaaf';

const securitySkill = defineSkill({
  name: 'security-review',
  description: 'OWASP security review checklist',
  instructions: `
## Security Review Protocol
When reviewing code, always check for:
1. SQL injection vulnerabilities
2. XSS vulnerabilities
`,
});

const agent = new Agent({
  systemPrompt: 'You are a coding assistant.',
  skills: [securitySkill],
});
```

### Skill Metadata Fields
The `SkillFrontmatter` type supports the following fields:
- `name`: The unique identifier for the skill.
- `description`: A short summary of the skill's purpose.
- `version`: Versioning information for the capability pack.
- `always`: A boolean (defaulting to `true`) determining if the skill is automatically injected into the system prompt.
- `tags`: A list of strings used for filtering or searching within a `SkillRegistry`.

## See Also
- [[Agent]]
- [[SystemPromptBuilder]]