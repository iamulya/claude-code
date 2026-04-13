# System Prompts

YAAF provides two levels of system prompt management:

## SystemPromptBuilder

Section-based, cache-aware prompt assembly.

```typescript
import { SystemPromptBuilder, defaultPromptBuilder } from 'yaaf';

const builder = new SystemPromptBuilder()
  // Static sections — cached for the session
  .addStatic('identity', () => 'You are a DevOps assistant.', 0)
  .addStatic('rules', () => `
## Rules
- Never delete production databases
- Always ask before modifying config files
- Use conventional commit format
`, 50)

  // Conditional sections
  .addWhen(
    () => process.env.DEBUG === '1',
    'debug-mode',
    () => '## Debug Mode\nEnable verbose reasoning and show internal state.',
  )

  // Dynamic sections — recomputed every turn
  .addDynamic('memory', () => memStore.buildPrompt(), 'memory updates per turn', 200)
  .addDynamic('timestamp', () => `Current time: ${new Date().toISOString()}`, 'time', 210)

const prompt = await builder.build();
```

### Cache Modes

| Mode | When Computed | Use Case |
|------|---------------|----------|
| `session` (default) | Once, cached until `reset()` | Identity, rules, skills |
| `turn` | Every `build()` call | Time, memory, context |
| `never` | Every call | Truly volatile data |

### Convenience Factories

```typescript
import {
  defaultPromptBuilder,
  envSection,
  rulesSection,
  identitySection,
  dateSection,
  fromSections,
} from 'yaaf';

const builder = defaultPromptBuilder('You are a code reviewer.');
// Pre-configured with identity, rules, and date sections

// Or compose from section factories:
const custom = fromSections([
  identitySection('You are a security auditor.'),
  dateSection(),
  envSection({ REGION: 'us-east-1', ENVIRONMENT: 'staging' }),
  rulesSection([
    'Always check for SQL injection',
    'Flag hardcoded credentials',
    'Review error handling',
  ]),
]);
```

---

## ContextEngine

Higher-level prompt manager that combines SystemPromptBuilder with memory, skills, and a Soul transform.

```typescript
import { ContextEngine, type SoulTransform } from 'yaaf';

const engine = new ContextEngine({
  basePrompt: 'You are a helpful assistant.',
  maxTokens: 4096,
});

// Add sections
engine.addSection('rules', '## Rules\n- Be concise\n- Be helpful');

// Add memory
engine.addMemory('Last session: discussed quantum computing.');

// Soul transform (opt-in)
const soulTransform: SoulTransform = (prompt) => {
  return `## Personality\nYou are warm and friendly.\n\n${prompt}`;
};
engine.setSoul(soulTransform);

// Build the final prompt
const prompt = engine.build();
```

---

## Soul (opt-in via yaaf/gateway)

Markdown-based agent personality definition.

```typescript
import { Soul, SoulConfig } from 'yaaf/gateway';

const soul = Soul.fromFile('./SOUL.md');
// Or inline:
const soul = new Soul({
  name: 'Atlas',
  role: 'Senior DevOps Engineer',
  personality: 'Precise, thorough, slightly dry humor.',
  rules: [
    'Always explain the why, not just the how',
    'Suggest monitoring for any infrastructure change',
  ],
});

const transform = soul.toTransform();
// Pass to ContextEngine
engine.setSoul(transform);
```

### SOUL.md Format

```markdown
# Atlas

## Role
Senior DevOps Engineer specializing in Kubernetes and CI/CD.

## Personality
- Precise and thorough
- Slightly dry humor
- Proactive about security

## Rules
- Always explain the "why" behind recommendations
- Suggest monitoring for any infrastructure change
- Default to least-privilege access patterns

## Tone
Professional but approachable. Uses analogies for complex concepts.
```
