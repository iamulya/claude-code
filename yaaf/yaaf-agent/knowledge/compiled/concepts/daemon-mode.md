---
summary: An operational mode where a YAAF component, such as the YaafDoctor, runs continuously in the background to perform periodic monitoring, health checks, and diagnostics.
title: Daemon Mode
entity_type: concept
see_also:
 - "[YaafDoctor](../apis/yaaf-doctor.md)"
 - "[Vigil](../apis/vigil.md)"
search_terms:
 - background agent process
 - continuous monitoring YAAF
 - periodic health checks
 - run agent as a service
 - YAAF Doctor daemon
 - Vigil agent loop
 - how to run background tasks
 - automatic error diagnosis
 - yaaf doctor --daemon
 - startDaemon() method
 - long-running agent
 - background test runner
 - unattended agent operation
stub: false
compiled_at: 2026-04-25T00:18:13.480Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
compiled_from_quality: documentation
confidence: 0.9
---

## What It Is

Daemon Mode is an operational pattern in YAAF where a component runs as a continuous, long-running background process. Instead of executing a single task and terminating, a component in Daemon Mode performs periodic actions, such as monitoring a project's health, watching for errors, or performing routine maintenance [Source 1].

This mode is designed for unattended operation, providing ongoing diagnostics and support alongside a primary application agent. The most prominent implementation of this concept is the [YaafDoctor](../apis/yaaf-doctor.md), which uses Daemon Mode to continuously compile a project, run its tests, and use an [LLM](./llm.md) to diagnose any new errors that appear [Source 1].

## How It Works in YAAF

The [YaafDoctor](../apis/yaaf-doctor.md)'s Daemon Mode is built upon YAAF's `Vigil` agent primitive, which facilitates the periodic execution loop [Source 1]. When initiated, the daemon enters a tick loop that performs a series of automated actions at a configurable interval.

The typical workflow for the [YaafDoctor](../apis/yaaf-doctor.md) daemon is as follows [Source 1]:
1.  **Periodic Trigger**: On a set interval (e.g., every 30 seconds), the daemon wakes up to perform a health check.
2.  **Health Check**: It compiles the project (e.g., using `tsc --noEmit`) and, if compilation succeeds, runs the project's test suite.
3.  **Stateful Diffing**: The daemon uses an internal `ErrorTracker` to compare the results of the current health check against the last known state. This diff-based approach ensures that it only reports *new* errors, preventing redundant notifications for persistent issues.
4.  **LLM-Powered Diagnosis**: If new errors are detected, the daemon uses its own internal [LLM](./llm.md) to analyze the errors, determine the root cause, and suggest a potential fix.
5.  **Notification**: The diagnosis is then emitted, for example, to the console or through a programmatic event handler.

This entire process runs in the background, allowing a developer to work on their code while the Doctor daemon provides real-time feedback on introduced errors [Source 1]. The daemon can be managed programmatically via methods like `startDaemon()` and `stopDaemon()` on the [YaafDoctor](../apis/yaaf-doctor.md) class, enabling it to be embedded within a larger application process [Source 1].

## Configuration

Daemon Mode can be configured and initiated through both the command-line interface and a programmatic API.

### CLI Invocation

The [YaafDoctor](../apis/yaaf-doctor.md) can be started in Daemon Mode directly from the command line. The check interval can be customized using an environment variable [Source 1].

```bash
# Start the daemon with the default interval
npx yaaf doctor --daemon

# Start the daemon and set the check interval to 60 seconds
CHECK_INTERVAL_SEC=60 npx yaaf doctor --daemon
```

### Programmatic API

For more integrated use cases, the daemon can be controlled from within a TypeScript application. This allows it to run alongside a primary agent, providing monitoring in the same process [Source 1].

```typescript
import { Agent, YaafDoctor } from 'yaaf';

// A primary application agent
const agent = new Agent({
  model: 'gpt-4o',
  systemPrompt: 'You are a customer support agent.',
});

// The Doctor configured to run as a daemon
const doctor = new YaafDoctor({
  projectRoot: process.cwd(),
  daemonIntervalSec: 30, // Set the check interval
});

// Register a handler to receive diagnostic issues
doctor.onIssue((issue) => {
  console.log(`🩺 ${issue.summary}`);
  console.log(`   ${issue.details}`);
  // This could also post to Slack, write to a log file, etc.
});

// Start the daemon's background monitoring loop
await doctor.startDaemon();

// The primary agent can now run its tasks
await agent.run('Handle this support ticket');

// When the application is shutting down, stop the daemon
doctor.stopDaemon();
```

## See Also

*   [YaafDoctor](../apis/yaaf-doctor.md): The primary YAAF component that implements Daemon Mode.
*   [Vigil](../apis/vigil.md): The underlying API used to create periodic, long-running agent behaviors like Daemon Mode.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md