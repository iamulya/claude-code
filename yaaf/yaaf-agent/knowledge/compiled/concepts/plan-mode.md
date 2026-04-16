---
title: Plan Mode
entity_type: concept
summary: An execution pattern where the agent generates a structured plan for user approval before performing any tool actions.
related_subsystems:
  - Agent
stub: false
compiled_at: 2026-04-16T14:12:32.752Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agent.ts
confidence: 0.9
---

## What It Is
**Plan Mode** is a "think-first, approve-then-execute" execution pattern in YAAF. It addresses the risk of autonomous agents performing complex or irreversible tool actions without human oversight. By forcing the agent to articulate its intended steps before execution, developers can implement a safety gate where a user or a supervisor system must validate the proposed logic.

This concept is central to building production-grade agents where predictability and safety are prioritized over pure autonomy.

## How It Works in YAAF
Plan Mode is implemented as a high-level feature of the `Agent` class, which abstracts the underlying `AgentRunner`. When Plan Mode is enabled, the agent's execution flow is modified:

1.  **Plan Generation**: Before any tools are invoked, the agent uses a specific `planningPrompt` to generate a structured plan (by default, a numbered list of steps).
2.  **Approval Gate**: The generated plan is passed to an optional `onPlan` callback.
3.  **Decision**: 
    *   If `onPlan` returns `true`, the agent proceeds to execute the plan using its configured tools.
    *   If `onPlan` returns `false`, the execution is aborted.
    *   If no `onPlan` callback is provided, the agent generates the plan for logging/visibility purposes but proceeds automatically.

The framework ensures that the planning phase does not trigger tool execution, maintaining a strict boundary between "thinking" and "acting."

## Configuration
Plan Mode is configured via the `planMode` property in the `AgentConfig`. It can be enabled simply by setting the value to `true` or by providing a `PlanModeConfig` object for more granular control.

### PlanModeConfig Interface
```ts
export type PlanModeConfig = {
  /**
   * Called with the generated plan text. Return true to proceed with execution,
   * false to abort. If not provided, always proceeds.
   */
  onPlan?: (plan: string) => Promise<boolean> | boolean
  /**
   * Custom prompt to generate the plan. Default asks the agent to produce
   * a numbered list of steps without executing anything.
   */
  planningPrompt?: string
}
```

### Example Implementation
In this example, the agent is required to get approval through a CLI-based callback before executing any steps.

```ts
const agent = new Agent({
  systemPrompt: 'You are a file system assistant.',
  tools: [...],
  planMode: {
    planningPrompt: 'Create a detailed step-by-step plan for the requested file operations.',
    onPlan: async (plan) => {
      console.log('Proposed Plan:\n', plan);
      const approved = await confirmWithUser('Do you approve this plan?');
      return approved;
    }
  }
});
```

## See Also
*   `Agent`
*   `PermissionPolicy`
*   `Hooks`