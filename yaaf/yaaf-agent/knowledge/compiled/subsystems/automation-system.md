---
summary: Provides capabilities for scheduling, recurring tasks, and proactive agent interactions within YAAF.
primary_files:
 - src/automation/heartbeat.ts
title: Automation System
entity_type: subsystem
exports:
 - ScheduledTask
 - StandingOrder
 - HeartbeatConfig
search_terms:
 - scheduled agent tasks
 - recurring agent jobs
 - proactive agent outreach
 - cron jobs for agents
 - standing orders
 - how to make agent run on a schedule
 - YAAF heartbeat
 - automated agent actions
 - persistent agent instructions
 - time-based triggers
 - agent scheduling
 - proactive agents
stub: false
compiled_at: 2026-04-24T18:09:57.079Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/automation/heartbeat.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Automation System enables YAAF agents to operate proactively, rather than being purely reactive to user input. It provides the framework for scheduling tasks, running recurring jobs, and maintaining persistent instructions that influence agent behavior over time. This allows an agent to perform actions like sending a daily morning briefing or periodically checking for updates without direct user interaction for each event [Source 1].

The system's design is inspired by concepts like cron jobs for scheduling, and "standing orders" for persistent, high-level instructions [Source 1].

## Architecture

The core of the Automation System is the `Heartbeat` class, which manages a collection of scheduled tasks and standing orders. It operates on a periodic timer, checking at a configurable interval (`checkIntervalMs`) if any tasks are due to be executed [Source 1].

The system is built around two primary data structures:

*   **`ScheduledTask`**: Represents a single, recurring job. Each task has a unique `id`, a `schedule` defined as a [Cron Expression](../concepts/cron-expression.md), and a `prompt` to be sent to the agent. Tasks can be toggled with an `active` flag and include properties for timeouts and relevance filtering. To prevent a long-running task from overlapping with its next scheduled run, an internal `_running` flag serves as an execution lock [Source 1].
*   **`StandingOrder`**: Represents a persistent instruction that is prepended to the prompts of scheduled tasks. This allows for defining overarching rules or context that should apply to multiple automated actions, such as "Before any briefing, check my email for urgent items." A standing order can also have its own schedule to run independently [Source 1].

[when](../apis/when.md) a scheduled task is triggered, the `Heartbeat` instance combines the task's prompt with any active standing orders and invokes the configured agent runner. The agent's output is then processed through an `onOutput` callback, and any errors are handled by an `onError` callback [Source 1].

## Integration Points

The Automation System integrates with other parts of the YAAF ecosystem in two main ways:

1.  **[Agent Core](./agent-core.md)**: It requires an agent runner instance that conforms to a specific interface (`{ run(input: string, signal?: AbortSignal): Promise<string> }`). The `Heartbeat` class uses this runner to execute the logic for its scheduled tasks [Source 1].
2.  **Output Gateways**: The system is decoupled from how the agent's output is delivered. It relies on the developer to implement the `onOutput` callback, which typically forwards the agent's response to a user via a messaging gateway or other external service [Source 1].

## Key APIs

The primary APIs for this subsystem are the data types used for configuration and task definition.

*   **`HeartbeatConfig`**: The configuration object passed to the `Heartbeat` constructor. It specifies the agent runner, output and error handlers, and the schedule check interval [Source 1].
*   **`ScheduledTask`**: The data structure for defining a recurring task, including its schedule, prompt, and execution options [Source 1].
*   **`StandingOrder`**: The data structure for defining a persistent instruction that can be applied to scheduled tasks [Source 1].

The `Heartbeat` class itself exposes methods for managing the automation lifecycle, as seen in examples [Source 1]:
*   `new Heartbeat(config: HeartbeatConfig)`: Creates a new automation manager.
*   `addTask(task: ScheduledTask)`: Adds a new recurring task.
*   `addStandingOrder(order: StandingOrder)`: Adds a new persistent instruction.
*   `start()`: Begins the periodic checking of schedules.

## Configuration

The Automation System is configured by instantiating the `Heartbeat` class with a `HeartbeatConfig` object.

```typescript
const heartbeat = new Heartbeat({
  // The agent runner to execute tasks
  agent: myAgentRunner,

  // Callback to handle the agent's output
  onOutput: async (text, task) => {
    // Send the output to a user via a gateway
  },

  // Optional callback for handling errors
  onError: (error, task) => {
    console.error(`Task ${task.id} failed:`, error);
  },

  // Optional: How often to check for due tasks (in milliseconds)
  checkIntervalMs: 60000, // Default is 60 seconds
});
```
[Source 1]

The key configuration parameters are the `agent` runner and the `onOutput` handler, which are required to execute tasks and deliver their results, respectively [Source 1].

## Sources

[Source 1]: src/automation/heartbeat.ts