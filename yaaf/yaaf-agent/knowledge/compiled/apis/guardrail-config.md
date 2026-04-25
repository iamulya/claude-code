---
export_name: GuardrailConfig
source_file: src/utils/guardrails.ts
category: type
summary: Defines the configuration options for the Guardrails class, including maximum costs, tokens, and turns.
title: GuardrailConfig
entity_type: api
search_terms:
 - agent budget limits
 - prevent runaway agents
 - cost control for LLMs
 - token usage limits
 - session cost management
 - configure guardrails
 - maxCostUSD setting
 - maxTokensPerSession setting
 - maxTurnsPerRun setting
 - warning percentage
 - error percentage
 - resource consumption policy
 - LLM safety settings
stub: false
compiled_at: 2026-04-24T17:10:09.033Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/guardrails.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`GuardrailConfig` is a TypeScript type that defines the configuration object for the `Guardrails` class. It allows developers to set usage-based budget limits and cost policies to prevent agents from consuming unbounded resources, such as in runaway loops [Source 1].

This configuration specifies hard limits for resources like cost, tokens, and turns, as well as percentage-based thresholds for emitting `warning` and `error` events as usage approaches these limits [Source 1].

## Signature

`GuardrailConfig` is a type alias for an object with the following optional properties [Source 1]:

```typescript
export type GuardrailConfig = {
  /** Maximum USD cost per session. Default: Infinity (no limit). */
  maxCostUSD?: number;

  /** Maximum total tokens (input+output) per session. Default: Infinity. */
  maxTokensPerSession?: number;

  /** Maximum turns (model calls) per single run(). Default: Infinity. */
  maxTurnsPerRun?: number;

  /** Maximum input tokens for a single model call. Default: Infinity. */
  maxInputTokensPerCall?: number;

  /** Percentage of budget at which to emit 'warning'. Default: 80. */
  warningPct?: number;

  /** Percentage of budget at which to emit 'error'. Default: 95. */
  errorPct?: number;
};
```

## Examples

The following example demonstrates how to create a `GuardrailConfig` object and use it to instantiate the `Guardrails` class [Source 1].

```typescript
import { Guardrails, GuardrailConfig } from 'yaaf';

// Define the configuration for the guardrails
const config: GuardrailConfig = {
  maxCostUSD: 5.00, // $5 per session
  maxTokensPerSession: 500_000,
  maxTurnsPerRun: 50,
  warningPct: 80, // Warn at 80% usage
  errorPct: 95,   // Escalate to error at 95% usage
};

// Use the configuration to create a new Guardrails instance
const guardrails = new Guardrails(config);

// The guardrails instance will now enforce the limits defined in the config.
```

## Sources

[Source 1]: src/utils/guardrails.ts