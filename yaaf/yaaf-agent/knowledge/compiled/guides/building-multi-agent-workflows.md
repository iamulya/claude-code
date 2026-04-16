---
title: Building Multi-Agent Workflows
entity_type: guide
summary: A guide on how to compose AgentRunners into sequential, parallel, and looping workflows.
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:15:45.334Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/workflow.ts
confidence: 1
---

## Overview
In YAAF, multi-agent orchestration is achieved through declarative workflow functions rather than complex class hierarchies. This guide demonstrates how to compose multiple `AgentRunner` instances into sophisticated execution patterns, including sequential pipelines, parallel fan-outs, and conditional loops.

By the end of this guide, you will be able to build complex agentic systems where the output of one agent informs the actions of another, or where multiple agents work concurrently to solve a problem.

## Prerequisites
Before building workflows, you should have:
- A basic understanding of `AgentRunner` instances.
- One or more configured agents ready to process inputs.

## Step-by-Step

### 1. Creating a Sequential Pipeline
A sequential pipeline runs agents in a specific order. Each agent receives the output of the previous agent as its input. This is ideal for "chain of thought" processes like research followed by writing and then reviewing.

```ts
import { sequential, transform } from 'yaaf/agents/workflow';

const pipeline = sequential([
  researcher,
  // Use transform to add context between steps
  transform(output => `Based on this research: ${output}, write a summary.`),
  writer,
  reviewer
]);

const result = await pipeline.run('The impact of quantum computing on cryptography');
```

### 2. Implementing Parallel Fan-out
Parallel workflows execute multiple agents concurrently using the same initial input. This is useful for gathering data from multiple sources or getting diverse perspectives on the same prompt.

```ts
import { parallel } from 'yaaf/agents/workflow';

const marketAnalysis = parallel([
  cryptoAnalyst,
  stockAnalyst,
  macroAnalyst
], {
  concurrency: 2, // Limit concurrent LLM calls
  merge: (results) => results.join('\n---\n') // Combine outputs
});

const report = await marketAnalysis.run('Current market trends for Q4');
```

### 3. Building a Loop with Exit Conditions
Loops allow a sequence of steps to repeat until a specific condition is met or a maximum number of iterations is reached. This is commonly used for iterative refinement or debugging tasks.

```ts
import { loop } from 'yaaf/agents/workflow';

const refinementLoop = loop([evaluator, improver], {
  maxIterations: 3,
  shouldExit: (result) => result.includes('PASSED_INSPECTION'),
  onIteration: (result, i) => `Iteration ${i} failed. Feedback: ${result}`
});

const finalProduct = await refinementLoop.run('Initial draft of the security policy');
```

### 4. Using Conditional Routing
You can dynamically choose which agent to execute based on the input string using the `conditional` helper.

```ts
import { conditional } from 'yaaf/agents/workflow';

const router = conditional(input => {
  if (input.toLowerCase().includes('code')) {
    return codingAgent;
  }
  return generalAgent;
});

const result = await router.run('Write a Python script to sort a list');
```

## Configuration Reference

### SequentialConfig
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | `'sequential'` | Name for debugging and tracing. |
| `transform` | `Function` | `undefined` | A function to modify output before the next step. |

### ParallelConfig
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | `'parallel'` | Name for debugging and tracing. |
| `merge` | `Function` | `join('\n\n')` | Logic to combine all parallel results. |
| `concurrency` | `number` | `unlimited` | Max simultaneous executions. |
| `onError` | `'fail-fast' \| 'collect'` | `'fail-fast'` | Whether to abort all or collect errors. |

### LoopConfig
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | `'loop'` | Name for debugging and tracing. |
| `maxIterations` | `number` | `5` | Safety limit to prevent infinite loops. |
| `shouldExit` | `Function` | `undefined` | Predicate to stop the loop early. |
| `onIteration` | `Function` | `undefined` | Transform result before the next iteration. |

## Common Mistakes

1.  **Infinite Loops**: Forgetting to set a `shouldExit` condition or relying on an LLM to output a specific string that it might miss. Always rely on `maxIterations` as a fallback.
2.  **Rate Limiting in Parallel**: Running too many agents in `parallel` without setting the `concurrency` option, which can lead to 429 (Too Many Requests) errors from LLM providers.
3.  **Input/Output Mismatches**: Assuming the output of Agent A is perfectly formatted for Agent B. Use the `transform` utility or the `transform` config option in `sequential` to clean or wrap data between steps.
4.  **Ignoring AbortSignals**: Not passing the `signal` parameter through custom workflow steps, which prevents the framework from properly cancelling long-running chains.

## Next Steps
- Explore how to create custom `AgentRunner` instances to use within these workflows.
- Implement custom `transform` logic for complex data mapping between agents.
- Integrate workflows into a production runtime with proper tracing.

## Sources
- `src/agents/workflow.ts`