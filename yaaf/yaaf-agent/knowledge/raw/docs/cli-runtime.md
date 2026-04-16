# CLI Runtime

Ship your YAAF agent as a polished CLI product — like `claude`, `aider`, or `codex`.

## Two Options

| | `createCLI` | `createInkCLI` |
|---|---|---|
| Import | `yaaf/cli-runtime` | `yaaf/cli-ink` |
| Dependencies | **Zero** | `ink`, `react`, `ink-text-input`, `ink-spinner` |
| Streaming | Appends to stdout | **Live re-rendering** with cursor |
| Tool calls | Text output | **In-place spinners** → ✓/✗ |
| Stats | Manual `/cost` | **Persistent footer** with live counters |
| Best for | Minimal, lightweight CLIs | Premium, Claude Code-style UX |

## createCLI (Zero Dependencies)

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createCLI } from 'yaaf/cli-runtime';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  tools: [searchTool, weatherTool],
});

createCLI(toStreamableAgent(agent), {
  // Display
  name: 'my-assistant',
  greeting: '👋 Hello! How can I help?',
  promptString: 'you ▸ ',
  agentPrefix: 'bot ▸ ',

  // Streaming
  streaming: true,

  // History persistence
  dataDir: '~/.my-assistant',
  maxHistory: 500,

  // Custom theme
  theme: {
    promptColor: '\x1b[36m',   // cyan
    agentColor: '\x1b[35m',    // magenta
    systemColor: '\x1b[2m',    // dim
    errorColor: '\x1b[31m',    // red
  },

  // Hooks
  beforeRun: async (input) => {
    // Inject context, transform input
    return input;
  },
  afterRun: async (input, response) => {
    // Analytics, logging
    analytics.track('chat', { inputLength: input.length });
  },

  // Custom commands
  commands: {
    model: {
      description: 'Switch model',
      handler: async (args, ctx) => {
        ctx.print(`Switching to ${args}...`);
      },
    },
    export: {
      description: 'Export conversation',
      handler: async (_, ctx) => {
        ctx.print(`Exported ${ctx.messageCount} messages`);
      },
    },
  },

  // Cleanup
  onExit: async () => {
    await db.close();
  },
});
```

### createCLI Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | `'agent'` | Agent display name |
| `greeting` | `string` | — | Welcome message |
| `streaming` | `boolean` | `false` | Enable streaming mode |
| `promptString` | `string` | `'you ▸ '` | User prompt indicator |
| `agentPrefix` | `string` | `'<name> ▸ '` | Agent response prefix |
| `dataDir` | `string` | `~/.<name>` | Directory for history/data |
| `maxHistory` | `number` | `1000` | Max persisted history entries |
| `theme` | `CLITheme` | default | Color theme |
| `commands` | `Record<string, CLISlashCommand>` | — | Custom slash commands |
| `beforeRun` | `(input) => string` | — | Pre-processing hook |
| `afterRun` | `(input, response) => void` | — | Post-processing hook |
| `onExit` | `() => void` | — | Cleanup on shutdown |

### Built-in Slash Commands

| Command | Description |
|---------|-------------|
| `/quit`, `/q`, `/exit` | Exit the CLI |
| `/clear` | Clear screen |
| `/help` | Show available commands |
| `/history` | Show recent history |

---

## createInkCLI (Premium Terminal UI)

Install the optional dependencies:

```bash
npm install ink react ink-text-input ink-spinner
```

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createInkCLI } from 'yaaf/cli-ink';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  tools: [searchTool, weatherTool],
});

createInkCLI(toStreamableAgent(agent), {
  name: 'my-bot',
  greeting: '👋 Hello! How can I help?',
  theme: {
    primary: 'cyan',
    secondary: 'magenta',
    accent: 'green',
    error: 'red',
    dim: 'gray',
  },
});
```

### What the Ink CLI Renders

```
  ╦ ╦╔═╗╔═╗╔═╗
  ╚╦╝╠═╣╠═╣╠╣  my-bot
   ╩ ╩ ╩╩ ╩╚

  👋 Hello! How can I help?

  you ▸ What's the weather in Tokyo?

  ✓ search("Tokyo weather") (2.3s)
  ✓ get_weather("Tokyo") (1.1s)

  ▸
    It's currently 22°C and sunny in Tokyo
    with a light breeze from the east.█

  ┌──────────────────────────────────────────────┐
  │ 1 msgs · 4s · ↑350 ↓120 tokens · /quit      │
  └──────────────────────────────────────────────┘
```

### createInkCLI Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | `'agent'` | Agent display name |
| `greeting` | `string` | — | Welcome message |
| `theme` | `InkCLITheme` | default | Color theme (Ink color names) |
| `beforeRun` | `(input) => string` | — | Pre-processing hook |
| `afterRun` | `(input, response) => void` | — | Post-processing hook |

---

## Stream Adapter

Both CLI runtimes work with `StreamableAgent`, which expects `RuntimeStreamEvent`. Use `toStreamableAgent()` to adapt a YAAF `Agent`:

```typescript
import { Agent, toStreamableAgent } from 'yaaf';

const agent = new Agent({ ... });
const streamable = toStreamableAgent(agent);

// streamable.run() → string (unchanged)
// streamable.runStream() → AsyncIterable<RuntimeStreamEvent>
```

### RuntimeStreamEvent Types

| Event | Fields | Description |
|-------|--------|-------------|
| `text_delta` | `text` | Token chunk from LLM |
| `tool_call_start` | `toolName`, `args?` | Tool execution begins |
| `tool_call_end` | `toolName`, `durationMs?`, `error?` | Tool execution completes |
| `tool_blocked` | `toolName`, `reason` | Permission denied |
| `usage` | `promptTokens`, `completionTokens`, `totalCalls` | Token usage |
| `done` | `text` | Final complete response |
