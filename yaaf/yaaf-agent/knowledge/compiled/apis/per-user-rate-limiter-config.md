---
summary: Configuration options for the PerUserRateLimiter, including limits, window duration, and backend implementation.
export_name: PerUserRateLimiterConfig
source_file: src/security/rateLimiter.ts
category: type
title: PerUserRateLimiterConfig
entity_type: api
search_terms:
 - rate limit configuration
 - user request limits
 - set max turns per user
 - rate limit window
 - distributed rate limiting setup
 - redis rate limiter backend
 - in-memory vs distributed rate limit
 - prevent agent abuse
 - configure PerUserRateLimiter
 - rate limiter options
 - token limiting config
 - cost limiting config
 - concurrent request limit
stub: false
compiled_at: 2026-04-25T00:11:39.702Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/rateLimiter.ts
compiled_from_quality: unknown
confidence: 0.95
---
## Overview

`PerUserRateLimiterConfig` is a TypeScript type that defines the configuration options for an instance of [PerUserRateLimiter](./per-user-rate-limiter.md). It is used to specify the maximum number of requests or resources a user can consume within a given time window. This is a key component of the [Rate Limiting](../subsystems/rate-limiting.md) subsystem for preventing abuse and ensuring fair resource allocation.

The configuration allows setting limits for various dimensions like turns, tokens, and cost. It also supports specifying a custom backend for distributed environments, which is crucial for enforcing global rate limits across multiple application instances or pods [Source 1]. If no backend is provided, the rate limiter defaults to an in-memory store, which is only suitable for single-process deployments [Source 1].


---

[Next: Signature →](per-user-rate-limiter-config-part-2.md) | 
*Part 1 of 3*