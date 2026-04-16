---
summary: A guide on how to enable and use the YAAF Doctor for debugging agents and maintaining project health via CLI, environment variables, and programmatic APIs.
title: Using YAAF Doctor
entity_type: guide
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:06:59.845Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/doctor.md
confidence: 1
---

## Overview
YAAF Doctor is a built-in expert agent designed to diagnose project health and debug LLM-powered agents in real time. It possesses deep knowledge of the YAAF framework, including its API surfaces, tool systems, and context management strategies. 

This guide covers how to enable the Doctor using zero-code configurations, interact with it via the Command Line Interface (CLI), and integrate it programmatically into your application to monitor agent performance and runtime errors.

## Prerequisites
*   The `yaaf` package installed in your TypeScript project.
*   A configured LLM provider (e.g., OpenAI, Gemini) with an active API key.

## Step-by-Step

### 1. Enabling the Doctor (Zero Code)
The fastest way to use the Doctor is to attach it to an existing agent. This allows the Doctor to monitor events such as tool errors, permission blocks, and context overflows.

**Option A: Configuration Flag**
Set the `doctor` property to `true` when instantiating an agent.
```typescript
import { Agent } from 'yaaf';

const agent = new Agent({
  model: 'gpt-4o',
  tools: [myTools],
  doctor: true, // Enables auto-attach
});
```

**Option B: Environment Variable**
You can enable the Doctor for any YAAF process without changing code by setting the `YAAF_DOCTOR` environment variable.
```bash
YAAF_DOCTOR=1 npx tsx src/main.ts
```

### 2. Using the CLI
The YAAF CLI provides several modes for interacting with the Doctor.

**Interactive REPL**
Launch a conversational interface where you can ask questions about your codebase. The Doctor uses built-in tools like `grep_search` and `run_tsc` to provide grounded answers.
```bash
npx yaaf doctor
```

**Daemon Mode**
The daemon runs as a background process that periodically compiles your project and runs tests. It uses an LLM to diagnose new errors and suggest fixes.
```bash
npx yaaf doctor --daemon
```

**Watch Mode (No LLM)**
For a lightweight, cost-free experience, use watch mode. This runs `tsc --noEmit` every 10 seconds to catch syntax and type errors without making LLM API calls.
```bash
npx yaaf doctor --watch
```

### 3. Programmatic Integration
For advanced use cases, you can instantiate the `YaafDoctor` class directly to perform health checks or watch specific agents.

**Live Agent Watching**
The Doctor can subscribe to an agent's event stream to catch 16 different event types, including `tool:blocked`, `llm:retry`, and `context:overflow-recovery`.

```typescript
import { Agent, YaafDoctor } from 'yaaf';

const agent = new Agent({ /* config */ });
const doctor = new YaafDoctor();

doctor.onIssue((issue) => {
  console.log(`🩺 Doctor Diagnosis: ${issue.summary}`);
  console.log(issue.details);
});

// Subscribe to agent events
doctor.watch(agent, {
  debounceMs: 2000,     // Batch errors occurring within 2s
  autoDiagnose: true,   // Use LLM for root cause analysis
});

await agent.run('Perform a complex task');

// Clean up when finished
doctor.unwatch(agent);
```

**One-Shot Health Check**
You can trigger a manual scan of your project's health.
```typescript
const doctor = new YaafDoctor({ projectRoot: process.cwd() });
const issues = await doctor.healthCheck();

if (issues.length > 0) {
  issues.forEach(issue => console.log(`${issue.type}: ${issue.summary}`));
}
```

## Configuration Reference

The `YaafDoctor` constructor accepts the following configuration options:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `projectRoot` | `string` | `process.cwd()` | The directory the Doctor will inspect. |
| `model` | `string` | auto-detect | The LLM model ID used for diagnosis. |
| `provider` | `string` | auto-detect | LLM provider (openai, gemini, groq, ollama). |
| `apiKey` | `string` | env var | API key override for the Doctor's LLM. |
| `daemonIntervalSec` | `number` | `30` | Frequency of checks in daemon mode. |
| `maxIterations` | `number` | `20` | Max tool-call rounds per question. |
| `extraTools` | `Tool[]` | `[]` | Additional tools the Doctor can use. |
| `extraInstructions` | `string` | `undefined` | Custom instructions for the Doctor's system prompt. |

## Common Mistakes

*   **Missing API Keys:** The Doctor requires its own LLM access to perform diagnoses. If `YAAF_DOCTOR=1` is set but no API key is provided for the default provider, the Doctor will fail to initialize.
*   **Forgetting to Unwatch:** When using `doctor.watch(agent)` programmatically, ensure you call `doctor.unwatch(agent)` or `doctor.unwatchAll()` to prevent memory leaks and unnecessary event processing after the agent's lifecycle ends.
*   **Confusing Watch vs. Daemon:** Using `npx yaaf doctor --watch` is a local TypeScript check with zero API cost. Using `npx yaaf doctor --daemon` triggers LLM calls to analyze errors, which incurs token costs.
*   **Pathing Issues:** If the Doctor is initialized in a subdirectory, it may not find the `tsconfig.json` or source files. Always ensure `projectRoot` points to the root of your YAAF project.

## Next Steps
*   Explore the **Vigil** subsystem for autonomous project maintenance.
*   Learn about **PermissionPolicy** to understand how the Doctor identifies `tool:blocked` events.
*   Review the **ContextManager** documentation to understand how the Doctor diagnoses compaction and overflow issues.