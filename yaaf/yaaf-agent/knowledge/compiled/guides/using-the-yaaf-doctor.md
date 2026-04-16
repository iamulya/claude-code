---
title: Using the YAAF Doctor
entity_type: guide
summary: How to use the YAAF Doctor in interactive, daemon, and CLI modes to diagnose and monitor your agent projects.
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:17:37.404Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/doctor/index.ts
confidence: 0.9
---

## Overview
The YAAF Doctor is a developer-facing expert agent designed to assist in the development, debugging, and maintenance of YAAF-based projects. It possesses deep knowledge of the framework and can perform tasks such as reading source code, searching files, compiling projects, and running tests to diagnose issues.

This guide covers the three primary ways to utilize the Doctor:
1.  **Interactive Mode**: Programmatically asking the Doctor specific questions about a project.
2.  **Daemon Mode**: Running a proactive background watcher that monitors for errors and patterns.
3.  **CLI Mode**: Using the command-line interface for quick diagnostics and REPL interactions.

## Prerequisites
*   A TypeScript project using the YAAF framework.
*   Environment variables configured for your preferred LLM provider (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`).
*   The `yaaf` package installed as a dependency.

## Step-by-Step

### 1. Programmatic Interactive Usage
Use the interactive mode when you need to programmatically query the Doctor about specific project states or troubleshooting steps. By default, the Doctor initializes using the current working directory (`process.cwd()`).

```typescript
import { YaafDoctor } from 'yaaf'

async function diagnoseProject() {
  // Initialize the doctor
  const doctor = new YaafDoctor()

  // Ask a grounded question about the project
  const answer = await doctor.ask('Why is my tool not being called?')
  
  console.log('Doctor Response:', answer)
}

diagnoseProject()
```

### 2. Setting up the Daemon
The Daemon mode allows the Doctor to run as a proactive error watcher alongside your agent. It can be configured to trigger callbacks whenever a `DoctorIssue` is detected.

```typescript
import { YaafDoctor } from 'yaaf'

async function startMonitoring() {
  const doctor = new YaafDoctor({ 
    daemonIntervalSec: 60 // Check every minute
  })

  // Subscribe to issues (compile errors, test failures, etc.)
  doctor.onIssue((issue) => {
    console.log(`🔴 Issue Detected: ${issue.summary}`)
    console.log(`Details: ${issue.details}`)
    console.log(`Type: ${issue.type} at ${issue.timestamp}`)
  })

  // Start the background process
  await doctor.startDaemon()

  // To stop the watcher later:
  // doctor.stopDaemon()
}
```

### 3. Using the CLI
YAAF provides a built-in CLI command to access Doctor features without writing additional code.

*   **Interactive REPL**: Start a chat session with the Doctor.
    ```bash
    npx yaaf doctor
    ```
*   **Background Watcher**: Run the Doctor as a daemon in your terminal.
    ```bash
    npx yaaf doctor --daemon
    ```
*   **Lightweight Watcher**: Run a `tsc` watcher that identifies compilation errors without invoking the LLM.
    ```bash
    npx yaaf doctor --watch
    ```

## Configuration Reference

### YaafDoctorConfig
The `YaafDoctor` constructor accepts a configuration object to customize its behavior and LLM integration.

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `projectRoot` | `string` | `process.cwd()` | The directory the Doctor will inspect. |
| `model` | `string` | Auto-detected | The specific LLM model to use. |
| `provider` | `ModelProvider` | Auto-detected | The LLM provider (e.g., OpenAI, Anthropic). |
| `apiKey` | `string` | From env | API key for the provider. |
| `chatModel` | `ChatModel` | - | A pre-configured model instance (overrides provider/key). |
| `extraTools` | `Tool[]` | - | Additional custom tools for the Doctor to use. |
| `extraInstructions`| `string` | - | Custom text appended to the Doctor's system prompt. |
| `daemonIntervalSec`| `number` | `30` | Frequency of checks in daemon mode. |
| `maxIterations` | `number` | `20` | Maximum LLM steps allowed per question. |

### WatchOptions
When configuring the Doctor's watching capabilities, the following options control how errors are processed:

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `debounceMs` | `number` | `2000` | Wait time after an error before triggering diagnosis. |
| `maxBufferSize` | `number` | `5` | Max errors to accumulate before forcing a diagnosis. |
| `autoDiagnose` | `boolean` | `true` | Whether to use the LLM to analyze accumulated errors. |

## Common Mistakes
*   **Missing Environment Variables**: The Doctor requires an LLM to function. Ensure your provider's API key is exported in your environment.
*   **Incorrect Project Root**: If running the Doctor from a subdirectory, it may not find the `package.json` or source files. Explicitly set `projectRoot` in the config.
*   **Iteration Limits**: For complex issues, the Doctor might hit the `maxIterations` limit (default 20). If the Doctor stops before providing a solution, consider increasing this value or providing more specific context in the prompt.

## Sources
* `src/doctor/index.ts`