# Getting Started

## Installation

```bash
npm install yaaf
```

Or scaffold a new project:

```bash
npx yaaf init my-agent
cd my-agent
npm install
```

## Your First Agent

```typescript
import { Agent, buildTool } from 'yaaf';

// 1. Define tools
const greetTool = buildTool({
  name: 'greet',
  description: 'Greet someone by name',
  inputSchema: {
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
  },
  async call({ name }) {
    return { data: `Hello, ${name}! 👋` };
  },
  isReadOnly: () => true,
});

// 2. Create the agent
const agent = new Agent({
  name: 'Greeter',
  systemPrompt: 'You are a friendly greeter. Always greet the user by name.',
  tools: [greetTool],
});

// 3. Run
const response = await agent.run('Say hello to Alice');
console.log(response);
```

## Environment Setup

YAAF auto-detects your LLM provider from environment variables. Set **one** of these:

```bash
# Google Gemini (recommended — free tier, 1M token context)
export GOOGLE_API_KEY=your-key-here

# OpenAI
export OPENAI_API_KEY=sk-...

# Anthropic
export ANTHROPIC_API_KEY=sk-ant-...

# Groq (OpenAI-compatible, very fast)
export OPENAI_API_KEY=gsk_...
export OPENAI_BASE_URL=https://api.groq.com/openai/v1
export OPENAI_MODEL=llama-3.3-70b-versatile

# Ollama (local, no API key needed)
export OPENAI_API_KEY=ollama
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_MODEL=llama3.1
```

## CLI Commands

After installing YAAF globally or in your project:

```bash
# Scaffold a new project
yaaf init my-agent
yaaf init my-agent --template personal-assistant

# Development (interactive REPL)
yaaf dev

# Add components
yaaf add tool weather
yaaf add skill code-review

# Inspect context budget
yaaf context list

# Run in production mode
yaaf run

# Show project status
yaaf status
```

### `yaaf dev` Slash Commands

When running `yaaf dev`, these commands are available:

| Command | Description |
|---------|-------------|
| `/quit` | Exit the REPL |
| `/clear` | Clear screen and reset conversation |
| `/tools` | List available tools in the project |
| `/context` | Show system prompt sections and sizes |
| `/cost` | Show token usage and estimated cost |
| `/help` | Show all commands |

## Project Structure

After `yaaf init`, your project looks like this:

```
my-agent/
├── src/
│   ├── agent.ts          # Agent configuration and entry point
│   └── tools/
│       └── search.ts     # Tool definitions
├── skills/
│   └── SKILL.md          # Agent skill instructions
├── SOUL.md               # Agent personality (optional)
├── tests/
│   └── agent.test.ts     # Test scaffold
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

### Key Files

| File | Purpose |
|------|---------|
| `src/agent.ts` | Main agent — system prompt, tools, model config |
| `src/tools/*.ts` | One file per tool, each exports a `buildTool()` result |
| `skills/*.md` | Markdown instructions injected into the system prompt |
| `SOUL.md` | Agent personality — name, tone, rules (opt-in via `yaaf/gateway`) |
| `.yaaf/memory/` | Auto-managed memory storage (created at runtime) |

## Next Steps

- [Agent API](agent.md) — Full configuration reference
- [Tools](tools.md) — Building production-grade tools
- [CLI Runtime](cli-runtime.md) — Ship your agent as a CLI product
- [Server Runtime](server-runtime.md) — Ship as an HTTP API
