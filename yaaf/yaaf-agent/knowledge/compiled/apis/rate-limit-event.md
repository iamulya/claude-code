---
summary: Defines the structure of an event emitted when a rate limit is approached or exceeded.
export_name: RateLimitEvent
source_file: src/security/rateLimiter.ts
category: type
title: RateLimitEvent
entity_type: api
search_terms:
 - rate limit event structure
 - what is in a rate limit event
 - rate limit warning payload
 - rate limit blocked payload
 - user rate limit notification
 - security event type
 - agent throttling event
 - usage limit exceeded event
 - cost limit event
 - token limit event
 - turn limit event
 - concurrent request limit event
stub: false
compiled_at: 2026-04-24T17:31:29.521Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/rateLimiter.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`RateLimitEvent` is a TypeScript type that defines the data structure for events emitted by YAAF's [Rate Limiting](../subsystems/rate-limiting.md) subsystem, such as the `PerUserRateLimiter` class [Source 1].

These events are triggered [when](./when.md) a user's activity either approaches a configured limit (a "warning") or exceeds it (resulting in a "blocked" action). This allows other parts of an application to observe and react to rate limiting decisions, for example, by logging detailed information, sending notifications to administrators, or updating a user's status in a UI [Source 1].

## Signature

The `RateLimitEvent` is a type alias for an object with the following properties [Source 1]:

```typescript
export type RateLimitEvent = {
  userId: string;
  resource: "cost" | "tokens" | "turns" | "concurrent";
  current: number;
  limit: number;
  action: "warning" | "blocked";
  timestamp: Date;
};
```

### Properties

- **`userId`**: `string`
  - The unique identifier for the user who triggered the event.

- **`resource`**: `"cost" | "tokens" | "turns" | "concurrent"`
  - The specific resource dimension that was limited.

- **`current`**: `number`
  - The user's usage value for the specified `resource` at the time the event was emitted.

- **`limit`**: `number`
  - The configured maximum value for the `resource`.

- **`action`**: `"warning" | "blocked"`
  - The action taken by the rate limiter.
    - `"warning"`: The user's usage is approaching the configured limit.
    - `"blocked"`: The user's request was denied because it exceeded the limit.

- **`timestamp`**: `Date`
  - A `Date` object indicating precisely when the event occurred.

## Examples

The following example demonstrates how an event handler might consume a `RateLimitEvent` object to log different messages based on the action taken by the rate limiter.

```typescript
import { RateLimitEvent } from 'yaaf';

// This is a hypothetical event handler that could be connected to a
// rate limiter's event emitter.
function handleRateLimitEvent(event: RateLimitEvent): void {
  if (event.action === 'blocked') {
    console.error(
      `[${event.timestamp.toISOString()}] User ${event.userId} was BLOCKED from using resource '${event.resource}'. ` +
      `Usage: ${event.current}, Limit: ${event.limit}.`
    );
  } else if (event.action === 'warning') {
    console.warn(
      `[${event.timestamp.toISOString()}] User ${event.userId} is approaching the limit for resource '${event.resource}'. ` +
      `Usage: ${event.current}, Limit: ${event.limit}.`
    );
  }
}

// Example of a 'blocked' event object
const blockedEvent: RateLimitEvent = {
  userId: 'user-abc-123',
  resource: 'tokens',
  current: 5015,
  limit: 5000,
  action: 'blocked',
  timestamp: new Date(),
};

handleRateLimitEvent(blockedEvent);
// Logs an error like: "[2023-10-27T10:00:00.000Z] User user-abc-123 was BLOCKED from using resource 'tokens'. Usage: 5015, Limit: 5000."

// Example of a 'warning' event object
const warningEvent: RateLimitEvent = {
  userId: 'user-def-456',
  resource: 'turns',
  current: 95,
  limit: 100,
  action: 'warning',
  timestamp: new Date(),
};

handleRateLimitEvent(warningEvent);
// Logs a warning like: "[2023-10-27T10:01:00.000Z] User user-def-456 is approaching the limit for resource 'turns'. Usage: 95, Limit: 100."
```

## See Also

- `PerUserRateLimiter`: The primary class that uses and emits `RateLimitEvent` objects.
- `RateLimitCheckResult`: The return type for rate limit checks, indicating if a request is blocked.
- `UserUsageSummary`: A type defining the complete usage statistics for a user within a time window.

## Sources

[Source 1]: src/security/rateLimiter.ts