# Tools

Tools are the actions your agent can take. Each tool has a name, description, input schema, and an execute function.

## Defining Tools

```typescript
import { buildTool } from 'yaaf';

const weatherTool = buildTool({
  name: 'get_weather',
  description: 'Get current weather for a location. Use when asked about weather.',
  inputSchema: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name or coordinates' },
      units:    { type: 'string', enum: ['celsius', 'fahrenheit'] },
    },
    required: ['location'],
  },
  maxResultChars: 2000,
  describe: ({ location }) => `Weather for ${location}`,

  async call({ location, units = 'celsius' }, ctx) {
    const data = await fetchWeather(location, units);
    return { data: JSON.stringify(data) };
  },

  // Safety flags
  isReadOnly: () => true,         // doesn't modify state
  isConcurrencySafe: () => true,  // safe to run in parallel
  isDestructive: () => false,     // doesn't delete anything
});
```

## Tool Definition Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | ✅ | Unique tool name (used by LLM to call it) |
| `description` | `string` | — | When/why the LLM should use this tool |
| `inputSchema` | `JSONSchema` | ✅ | Input validation schema |
| `call` | `(input, ctx) => ToolResult` | ✅ | Execute function |
| `describe` | `(input) => string` | — | Human-readable description of the call |
| `maxResultChars` | `number` | — | Truncate results longer than this |
| `isReadOnly` | `() => boolean` | — | Default: `false` |
| `isConcurrencySafe` | `() => boolean` | — | Default: `false` |
| `isDestructive` | `() => boolean` | — | Default: `false` |

## Tool Context

The `ctx` parameter provides execution context:

```typescript
async call(input, ctx) {
  ctx.signal;      // AbortSignal — respect cancellation
  ctx.agentName;   // Name of the calling agent
  ctx.exec?.('ls'); // Execute shell commands (if sandbox allows)
}
```

## Tool Result

```typescript
// Success
return { data: 'Search results...' };

// Error
return { data: '', error: 'API rate limited' };

// With metadata
return {
  data: results,
  metadata: { cached: true, source: 'redis' },
};
```

## Tool Loop Detection

Prevent runaway tool call patterns:

```typescript
import { ToolLoopDetector } from 'yaaf';

const detector = new ToolLoopDetector({
  threshold: 3,    // Trigger after 3 identical calls
  windowSize: 20,  // Look at last 20 calls
});

// In your hooks:
hooks: {
  afterToolCall: async (ctx) => {
    detector.record(ctx.toolName, ctx.arguments);
    if (detector.isLooping()) {
      return {
        action: 'inject',
        message: detector.getWarning(),
      };
    }
    return { action: 'continue' };
  },
}
```

## Concurrent Tool Execution

Tools marked as `isConcurrencySafe: () => true` can run in parallel:

```typescript
import { StreamingToolExecutor } from 'yaaf';

const executor = new StreamingToolExecutor({
  tools: [searchTool, weatherTool, calendarTool],
  concurrency: 3,
});

// AgentRunner uses this automatically when tools are concurrency-safe
```

## Tool Result Budget

Manage context window usage from verbose tool results:

```typescript
const agent = new Agent({
  tools: [...],
  systemPrompt: '...',
  // Truncate old tool results to save context space
  toolResultBudget: {
    maxCharsPerResult: 5000,
    maxTotalChars: 20000,
    strategy: 'truncate-oldest',
  },
});
```

## Adding Tools via CLI

```bash
# Scaffold a new tool
yaaf add tool weather

# Creates src/tools/weather.ts with a template
```

Generated template:

```typescript
import { buildTool } from 'yaaf';

export const weatherTool = buildTool({
  name: 'weather',
  description: '[Describe when the LLM should use this tool]',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '[Describe the input]' },
    },
    required: ['query'],
  },
  execute: async (input) => {
    return `weather result for: ${input.query}`;
  },
});
```
