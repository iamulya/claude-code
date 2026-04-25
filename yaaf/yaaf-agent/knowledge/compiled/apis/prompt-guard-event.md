---
title: PromptGuardEvent
entity_type: api
summary: Represents an event generated when `PromptGuard` detects a potential prompt injection, detailing the pattern, severity, and action taken.
export_name: PromptGuardEvent
source_file: src/security/promptGuard.ts
category: type
search_terms:
 - prompt injection event
 - security detection details
 - what is in a prompt guard alert
 - onDetection callback data
 - promptguard event payload
 - injection detection log
 - layer 2 verdict
 - LLM classifier result
 - security event structure
 - action taken on injection
 - blocked message details
 - pattern match information
stub: false
compiled_at: 2026-04-24T17:30:33.393Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/promptGuard.ts
compiled_from_quality: unknown
confidence: 1
---
## Overview

The `PromptGuardEvent` type defines the structure of a data object that encapsulates the details of a single potential [Prompt Injection](../concepts/prompt-injection.md) detected by the `PromptGuard` security hook [Source 1].

An instance of `PromptGuardEvent` is generated for each pattern that matches a message's content. These events are collected in the `events` array of the `PromptGuardResult` object. If an `onDetection` callback is configured in the `PromptGuardConfig`, it is invoked with the `PromptGuardEvent` object, allowing for real-time logging, alerting, or other custom actions [Source 1].

This type is essential for auditing and monitoring the security of an agent's interactions, providing a detailed record of what was detected, its assessed severity, and the response taken by the system [Source 1].


---

[Next: Signature →](prompt-guard-event-part-2.md) | 
*Part 1 of 3*