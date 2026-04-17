# Skills Example

Demonstrates YAAF's **Skills** system — markdown-based capability packs that extend an agent's system prompt at runtime without code changes.

## What Are Skills?

Skills are `.md` files with YAML frontmatter. They define domain knowledge, coding standards, review checklists, workflows, and procedures that get injected into the agent's system prompt automatically.

```markdown
---
name: code-review
description: Systematic code review protocol
always: true
tags: security, review
---

# Code Review Protocol

When reviewing code, check for:
1. SQL injection vulnerabilities
2. XSS vulnerabilities
...
```

## Features Demonstrated

| Feature | API | Description |
|---------|-----|-------------|
| Load from directory | `loadSkills(dir)` | Load all `.md` skills from a folder |
| Load single file | `loadSkill(path)` | Load one skill by path |
| Inline definition | `defineSkill({...})` | Define a skill in code, no file needed |
| Skill registry | `SkillRegistry` | Centralized manager with load/remove events |
| Always-on skills | `always: true` | Injected into every prompt automatically |
| Opt-in skills | `always: false` | Only injected when explicitly activated by name |
| Dynamic registration | `registerDynamic(md)` | Add skills from raw markdown at runtime |
| Hot-reload | `registry.watch([dirs])` | Auto-reload when skill files change on disk |
| Agent integration | `Agent({ skills })` | Pass skills directly to an agent |
| Prompt injection | `buildSkillSection()` | Build the raw text that gets appended to the system prompt |

## Project Structure

```
skills/
├── skills/                    # Skill markdown files
│   ├── code-review.md         # Always-on: structured review checklist
│   ├── typescript-expert.md   # Always-on: TS best practices
│   └── commit-message.md      # Opt-in: conventional commit format
├── src/
│   ├── index.ts               # Main demo — all features
│   └── watch.ts               # Hot-reload watcher demo
├── package.json
└── README.md
```

## Run

```bash
cd examples/skills
npm install

# Main demo (shows all features, runs agent at the end)
GEMINI_API_KEY=... npm start

# Hot-reload watcher (create/edit/delete skill files live)
npm run watch
```

## Skill Frontmatter

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | string | filename | Display name |
| `description` | string | — | Short description |
| `version` | string | — | Version string |
| `always` | boolean | `true` | Inject into every prompt, or require explicit activation |
| `tags` | string[] | `[]` | Tags for filtering and search |

## How It Works

1. Skills are loaded from `.md` files or defined inline
2. Each skill's `instructions` (the markdown body after frontmatter) is the content that gets injected
3. `buildSkillSection(skills, forcedNames?)` produces the text block appended to the system prompt
4. `Agent({ skills })` calls `buildSkillSection()` automatically during prompt construction
5. Only `always: true` skills are included by default — opt-in skills require `forcedNames`
6. `SkillRegistry.watch()` monitors directories and hot-reloads on file changes
7. Individual skill files are capped at 256 KB; total skill section is capped at 64 KB
