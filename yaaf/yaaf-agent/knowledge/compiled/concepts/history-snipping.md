---
summary: A cheap, rule-based pre-compaction optimization that removes low-value content like old tool results and duplicates.
title: History Snipping
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:17:08.457Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/historySnip.ts
confidence: 1
---

---
title: History Snipping
entity_type: concept
summary: A cheap, rule-based pre-compaction optimization that removes low-value content like old tool results and duplicates.
related_subsystems:
  - context

## What It Is
History Snipping is a rule-based optimization technique used in YAAF to reduce the size of conversation history before more expensive operations, such as LLM-based compaction, are performed. It serves as a "pre-pass" that identifies and removes or replaces high-volume, low-value content—such as old tool outputs or redundant data—with minimal computational overhead.

The primary goal of History Snipping is to make the context management process faster and more cost-effective by removing obvious noise before an LLM is tasked with summarizing the remaining history.

## How It Works in YAAF
History Snipping operates as a synchronous, $O(n)$ operation that does not require LLM calls. It evaluates the message history against a set of heuristic rules to identify candidates for removal or replacement.

The framework provides two primary mechanisms for snipping:

1.  **General Snipping (`snipHistory`)**: This process targets tool results based on their age, size, and relevance. It identifies tool outputs that are:
    *   **Old**: Beyond a specific turn count from the current message.
    *   **Large**: Exceeding a minimum token threshold.
    *   **Non-Recent**: Not among the most recent set of tool interactions.
    *   **Non-Exempt**: Not produced by tools explicitly marked to be preserved.
2.  **Deduplication (`deduplicateToolResults`)**: This process identifies consecutive identical tool results (e.g., multiple identical file reads). It preserves the most recent occurrence and replaces earlier duplicates with a placeholder.

When content is snipped, it is typically replaced with a short placeholder string (e.g., `[Old tool result cleared]`), which preserves the structure of the conversation while freeing up the context window.

## Configuration
Developers can configure the behavior of the snipping engine through the `SnipConfig` object. This allows for fine-tuning what content is considered "low-value" based on the specific needs of the agent.

```typescript
import { snipHistory, SnipConfig } from './context/historySnip';

const config: SnipConfig = {
  maxOldToolResults: 10,      // Keep at most 10 old tool results
  maxToolResultAge: 20,       // Snip results older than 20 turns
  minSnipTokens: 100,         // Only snip results larger than 100 tokens
  keepRecent: 5,              // Never snip the 5 most recent tool results
  placeholderText: "[Content removed to save space]",
  exemptTools: ['critical_search'] // Never snip results from this tool
};

const result = snipHistory(messages, config);

console.log(`Freed approximately ${result.tokensFreed} tokens.`);
console.log(`Removed ${result.itemsRemoved} items.`);
```

### Configuration Fields
| Field | Description | Default |
| :--- | :--- | :--- |
| `maxOldToolResults` | Maximum number of old tool results to retain in history. | 15 |
| `maxToolResultAge` | Turn count threshold; results older than this are eligible for snipping. | 20 |
| `placeholderText` | The text that replaces snipped content. | `[Old tool result cleared]` |
| `minSnipTokens` | Minimum estimated token length for a result to be eligible for snipping. | 100 |
| `keepRecent` | Number of recent tool results to protect from snipping regardless of age. | 5 |
| `exemptTools` | Array of tool names that should never be snipped. | `[]` |

## See Also
*   `snipHistory`
*   `deduplicateToolResults`