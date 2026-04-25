---
summary: The YAAF subsystem providing opt-in components for multi-channel message routing and transport features, not included in the main `yaaf` barrel export.
primary_files:
 - src/gateway.ts
title: Gateway Module
entity_type: subsystem
search_terms:
 - multi-channel routing
 - message transport
 - opt-in features
 - yaaf/gateway import
 - how to handle multiple inputs
 - ConsoleChannel
 - ApprovalManager
 - agent communication channels
 - connecting agent to different services
 - transport layer
 - gateway entry point
stub: false
compiled_at: 2026-04-24T18:12:36.822Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Gateway module serves as an opt-in entry point for [Channel](../apis/channel.md) and transport-related features within the YAAF framework [Source 1]. Its primary purpose is to provide components for multi-channel message routing. These features are intentionally not included in the main `yaaf` barrel export to keep the core framework lean. Developers must explicitly import from `yaaf/gateway` to use this functionality [Source 1].

## Architecture

The `src/gateway.ts` file acts as the public-facing module for a collection of components related to communication channels and message transport [Source 1]. The source material does not detail the internal architecture or specific classes beyond what is shown in usage examples.

## Key APIs

The Gateway module exposes several components for building multi-channel agents. While the full API surface is not detailed in the provided source, an example highlights key exports such as `Gateway`, `ConsoleChannel`, and `ApprovalManager` [Source 1].

Developers import these components directly from the gateway entry point [Source 1]:

```typescript
import { Gateway, ConsoleChannel, ApprovalManager } from 'yaaf/gateway';
```

## Sources

[Source 1]: src/gateway.ts