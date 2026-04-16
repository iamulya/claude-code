---
summary: Configuration interface for the history snipping process, defining limits for tool result age, size, and exemptions.
export_name: SnipConfig
source_file: src/context/historySnip.ts
category: type
title: SnipConfig
entity_type: api
stub: false
compiled_at: 2026-04-16T14:17:18.175Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/historySnip.ts
confidence: 1
---

## Overview
`SnipConfig` defines the parameters for the history snipping process, a pre-compaction optimization pass. Snipping is designed to be a computationally "cheap" O(n) operation that requires no LLM calls. It identifies and removes low-value content—such as old, large, or redundant tool results—from the conversation history before more expensive LLM-based compaction or summarization logic is executed.

This configuration allows developers to tune the balance between context retention and token efficiency by specifying thresholds for age, size, and specific tool exemptions.

## Signature / Constructor

```typescript
export type SnipConfig = {
  /** Max number of old tool results to keep. Default: 15. */
  maxOldToolResults?: number
  /** Tool results older than this many turns get snipped. Default: 20. */
  maxToolResultAge?: number
  /** Replace snipped content with this placeholder. Default: "[Old tool result cleared]". */
  placeholderText?: string
  /** Minimum token length of a tool result to be eligible for snipping. Default: 100. */
  minSnipTokens?: number
  /** Keep the most recent N tool results untouched. Default: 5. */
  keepRecent?: number
  /** Tool names whose results are never snipped. */
  exemptTools?: string[]
}
```

## Methods & Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `maxOldToolResults` | `number` | The maximum number of historical tool results to retain. Once this limit is exceeded, older results are eligible for snipping. Defaults to `15`. |
| `maxToolResultAge` | `number` | The number of turns (messages) from the end of the history after which a tool result is considered "old" and eligible for snipping. Defaults to `20`. |
| `placeholderText` | `string` | The text used to replace the content of a snipped message. Defaults to `"[Old tool result cleared]"`. |
| `minSnipTokens` | `number` | The minimum estimated token count a tool result must have to be considered for snipping. Small results are often kept to maintain context. Defaults to `100`. |
| `keepRecent` | `number` | The number of most recent tool results that are explicitly protected from the snipping process, regardless of their age or size. Defaults to `5`. |
| `exemptTools` | `string[]` | An array of tool names whose outputs should never be snipped, ensuring critical data from specific tools is always preserved. |

## Examples

### Basic Configuration
Defining a configuration to aggressively snip old tool results while protecting specific critical tools.

```typescript
import { SnipConfig, snipHistory } from './src/context/historySnip';

const config: SnipConfig = {
  maxOldToolResults: 10,
  maxToolResultAge: 15,
  exemptTools: ['search_web', 'get_user_profile'],
  placeholderText: '[Content removed to save context]'
};

const result = snipHistory(messages, config);
console.log(`Freed ${result.tokensFreed} tokens by removing ${result.itemsRemoved} items.`);
```

### Minimal Snipping
Configuring the process to only remove extremely large tool results that are very old.

```typescript
const conservativeConfig: SnipConfig = {
  minSnipTokens: 1000,
  maxToolResultAge: 50,
  keepRecent: 10
};
```

## See Also
- `snipHistory`: The primary function that utilizes this configuration to clean conversation history.
- `deduplicateToolResults`: A related utility for removing redundant consecutive tool outputs.