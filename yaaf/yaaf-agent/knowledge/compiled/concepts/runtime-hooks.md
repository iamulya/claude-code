---
title: Runtime Hooks
entity_type: concept
summary: Lifecycle hooks used to intercept and modify agent execution within server or worker runtimes.
related_subsystems:
  - Worker Runtime
stub: false
compiled_at: 2026-04-16T14:12:24.575Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/worker-runtime.md
confidence: 0.95
---

## What It Is
Runtime Hooks are lifecycle interception points provided by YAAF's runtime handlers (such as `createWorker`). They allow developers to execute custom logic at specific stages of an agent's execution cycle without modifying the core agent definition. 

These hooks solve several production requirements:
- **Security**: Validating credentials or tokens before the agent processes a request.
- **Context Injection**: Augmenting user input with metadata derived from the request (e.g., headers, geo-location).
- **Observability**: Logging execution results or sending data to external analytics platforms after the agent completes its task.

## How It Works in YAAF
Runtime hooks are defined as optional properties within the configuration object passed to runtime factory functions like `createWorker`. When a request hits a YAAF endpoint (such as `/chat` or `/chat/stream`), the runtime executes these hooks in a specific sequence:

1.  **`authorize`**: The first hook executed. It receives the raw `Request` object. If it returns `false` (or a promise resolving to `false`), the runtime terminates the request early with an authorization error.
2.  **`beforeRun`**: Executed after authorization but before the agent processes the input. It receives the user's input string and the `Request` object. It must return a string, which becomes the actual input processed by the agent. This is typically used to prepend system context or environment-specific data.
3.  **`afterRun`**: Executed after the agent has generated a response. It receives the original input, the agent's response, and the `Request` object. This hook is non-blocking for the client response and is used for side effects like logging or analytics.

## Configuration
Hooks are configured during the initialization of the runtime handler. The following example demonstrates the implementation of all three primary hooks:

```typescript
const handler = createWorker(agent, {
  // Authorization hook to validate API keys
  authorize: async (req) => {
    const apiKey = req.headers.get('x-api-key');
    return apiKey === 'secret-token';
  },

  // Pre-processing hook to inject geo-location context
  beforeRun: async (input, req) => {
    const country = req.headers.get('cf-ipcountry') || 'Unknown';
    return `[User Location: ${country}] ${input}`;
  },

  // Post-processing hook for external logging
  afterRun: async (input, response, req) => {
    await logToAnalytics({
      timestamp: new Date(),
      prompt: input,
      success: !!response
    });
  },
});
```

### Hook Signatures

| Hook | Signature | Purpose |
| :--- | :--- | :--- |
| `authorize` | `(req: Request) => boolean \| Promise<boolean>` | Determines if the request should proceed. |
| `beforeRun` | `(input: string, req: Request) => string \| Promise<string>` | Modifies or augments the input before agent execution. |
| `afterRun` | `(input: string, response: any, req: Request) => void \| Promise<void>` | Performs side effects after execution completes. |

## Sources
- Source 1: `worker-runtime.md`