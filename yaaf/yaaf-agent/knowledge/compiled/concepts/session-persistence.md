---
title: Session Persistence
summary: The ability of YAAF components to save and restore their state across different execution sessions, enabling long-running or interrupted agent workflows.
entity_type: concept
search_terms:
 - save agent state
 - restore agent state
 - long-running agents
 - how to resume a YAAF agent
 - state management in YAAF
 - snapshot and restore
 - surviving restarts
 - persistent agent memory
 - workflow interruption
 - save/restore pattern
 - component state serialization
 - CostTracker snapshot
stub: false
compiled_at: 2026-04-24T18:01:51.309Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/costTracker.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Session Persistence is a design pattern in YAAF that allows framework components to serialize their internal state into a data structure, called a snapshot, which can be saved and later used to restore the component to its previous state. This capability is crucial for building robust, long-running agents that can survive interruptions, such as process restarts or planned shutdowns. By saving and restoring state, an agent can resume its work without losing context or progress.

## How It Works in YAAF

The primary mechanism for session persistence in YAAF is a `save()` and `restore()` pattern implemented by stateful components.

A component instance provides a `save()` method that returns a serializable snapshot object containing all necessary state. A corresponding static `restore()` method on the component's class accepts this snapshot object and returns a new instance of the component, fully initialized with the saved state [Source 1].

The `CostTracker` utility provides a clear example of this pattern. It tracks token usage and associated costs within a session. To persist this data, a developer can call the `save()` method to get a `CostSnapshot` object. This object can be serialized (e.g., to JSON) and stored. Later, the static `CostTracker.restore()` method can be used to create a new `CostTracker` instance from the snapshot, preserving all token and cost accounting from the previous session [Source 1].

```typescript
// Session persistence example with CostTracker
const tracker = new CostTracker();
tracker.record('gpt-4o', { inputTokens: 1000, outputTokens: 500 });

// 1. Save the component's state to a snapshot object
const snapshot = tracker.save();

// The snapshot can be serialized and stored (e.g., in a database or file)
// const serializedState = JSON.stringify(snapshot);

// 2. Restore the component from the snapshot in a new session
const restored = CostTracker.restore(snapshot);

// The 'restored' tracker now contains the state of the original tracker
console.log(restored.totalCostUSD); // Outputs the cost calculated in the previous session
```
[Source 1]

The `CostSnapshot` type defines the data structure for the `CostTracker`'s state, including usage details for each model, total costs, and metadata like [when](../apis/when.md) the snapshot was saved [Source 1].

## Sources

[Source 1]: src/utils/costTracker.ts