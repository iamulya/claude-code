---
title: Configuring the Agent
entity_type: guide
summary: A comprehensive guide to setting up an Agent with LLM providers, tools, memory strategies, and security policies.
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:12:46.890Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agent.ts
confidence: 0.85
---

## Overview
The `Agent` class is the primary high-level abstraction in YAAF, providing a production-grade interface for building LLM-powered applications. This guide walks through configuring an agent, from basic provider selection to advanced security policies, memory management, and runtime diagnostics.

## Prerequisites
* A TypeScript development environment.
* API keys for supported providers (OpenAI or Google Gemini).
* Basic familiarity with LLM concepts like system prompts and tool calling.

## Step-by-Step

### 1. Basic Provider Configuration
YAAF can auto-detect LLM providers based on environment variables, or they can be explicitly defined in the `AgentConfig`.

```typescript
import { Agent } from 'yaaf';

// Option A: Auto-detection via environment variables
// Uses OPENAI_API_KEY or GEMINI_API_KEY
const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
});

// Option B: Explicit configuration
const agentExplicit = new Agent({
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: process.env.MY_CUSTOM_KEY,
  temperature: 0.7,
});
```

### 2. Defining Tools and Permissions
Tools allow the agent to interact with external systems. Permissions and Access Policies ensure these interactions are safe and authorized.

```typescript
const agent = new Agent({
  tools: [mySearchTool, myWriteTool],
  permissions: new PermissionPolicy()
    .allow('search_*')
    .requireApproval('write_file', 'Writing to disk requires manual check')
    .onRequest(cliApproval()),
  accessPolicy: {
    authorization: rbac({
      viewer: ['search_*'],
      admin: ['*'],
    }),
  },
});
```

### 3. Managing Context and Memory
For long-running conversations, use a `MemoryStrategy` and the `ContextManager`. Setting `contextManager` to `'auto'` allows the agent to handle token-budget-aware compaction automatically.

```typescript
const agent = new Agent({
  memoryStrategy: sessionMemoryStrategy(),
  contextManager: 'auto', // Recommended for automatic overflow recovery
});
```

### 4. Implementing Safety and Sandboxing
To protect the host environment, configure a `Sandbox` and enable built-in security hooks for prompt injection and PII redaction.

```typescript
const agent = new Agent({
  sandbox: projectSandbox({
    allowNetwork: false,
    workDir: './tmp',
  }),
  security: {
    promptGuard: { mode: 'block', sensitivity: 'high' },
    piiRedactor: { categories: ['email', 'api_key'] },
  },
});
```

### 5. Enabling Diagnostics (YAAF Doctor)
The built-in "Doctor" can monitor the agent for runtime errors, such as tool failures or blocked actions, and provide automated diagnoses.

```typescript
const agent = new Agent({
  doctor: true, // Enables automated error diagnosis
});
```

## Configuration Reference

### Provider Settings
| Option | Type | Description |
| :--- | :--- | :--- |
| `provider` | `ModelProvider \| string` | LLM provider (e.g., 'openai', 'gemini'). |
| `model` | `string` | Specific model name. Defaults to `gpt-4o-mini` or `gemini-1.5-flash`. |
| `apiKey` | `string` | API key for the provider. |
| `baseUrl` | `string` | Custom endpoint for OpenAI-compatible providers (e.g., Ollama). |

### Runner Settings
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `maxIterations` | `number` | 15 | Maximum LLM round-trips per run. |
| `temperature` | `number` | 0.2 | LLM sampling temperature (0-2). |
| `maxTokens` | `number` | 4096 | Maximum output tokens per LLM call. |

### Capabilities
| Option | Type | Description |
| :--- | :--- | :--- |
| `planMode` | `PlanModeConfig \| true` | Forces the agent to generate a plan before execution. |
| `skills` | `Skill[]` | Markdown capability packs injected into the prompt. |
| `systemPromptProvider` | `SystemPromptBuilder` | An async, composable alternative to a static prompt string. |

## Common Mistakes

*   **Conflicting Prompt Definitions:** Providing both `systemPrompt` and `systemPromptProvider`. In YAAF, the `systemPromptProvider` takes precedence if both are defined.
*   **Missing Context Management:** Failing to set `contextManager: 'auto'` on long-running sessions, which can lead to `ContextOverflowError` when the LLM's token limit is reached.
*   **Unrestricted Tool Access:** Deploying agents with powerful tools but no `PermissionPolicy`, allowing the LLM to execute sensitive actions without oversight.
*   **Ignoring Sandbox Restrictions:** Forgetting that a `Sandbox` might block necessary network or file system access required by specific tools.

## Next Steps
* Learn about creating custom tools.
* Explore advanced `PermissionPolicy` patterns.
* Implement persistent sessions using the `Session` class.