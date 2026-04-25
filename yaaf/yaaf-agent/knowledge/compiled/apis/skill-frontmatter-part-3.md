---
title: "SkillFrontmatter (Part 3: Examples)"
entity_type: api
part_of: "SkillFrontmatter"
part_number: 3
---
## Examples

### Example 1: In a Markdown Skill File

The `SkillFrontmatter` is defined as a YAML block at the top of a `.md` file.

`./skills/code-review.md`:
```markdown
---
name: code-review
description: Provides a structured checklist for reviewing pull requests.
version: "1.2.0"
always: true
tags:
  - "engineering"
  - "quality"
  - "code"
---
## Code Review Protocol

When reviewing a pull request, follow these steps:
1.  **Clarity**: Is the code's intent clear?
2.  **Correctness**: Does the code do what it says it does?
3.  **Security**: Are there any obvious vulnerabilities (e.g., XSS, SQL injection)?
...
```

### Example 2: Inline Definition

The `SkillFrontmatter` properties are used directly when defining a skill in code using the `defineSkill` function.

```typescript
import { defineSkill } from 'yaaf';

const securitySkill = defineSkill({
  // These properties conform to the SkillFrontmatter type
  name: 'security-review',
  description: 'OWASP security review checklist',
  always: false, // This skill must be explicitly requested

  // This is the instruction content
  instructions: `## Security Review Protocol
When reviewing code, always check for:
1. SQL injection vulnerabilities
2. XSS vulnerabilities
...`,
});
```
## See Also

- `Skill`: The complete type combining `SkillFrontmatter` and instruction content.
- `defineSkill`: A helper function for creating a `Skill` object inline.
- `loadSkills`: A function that loads skills from a directory, parsing their frontmatter.
- `SkillRegistry`: A class for managing a collection of skills at runtime.
## Sources

[Source 1]: src/skills.ts

---

[← Previous: Signature](skill-frontmatter-part-2.md) | 
*Part 3 of 3*