---
summary: Defines how the TrustPolicy reacts to verification mismatches, either strictly failing or logging warnings.
title: Trust Policy Mode
entity_type: concept
related_subsystems:
 - security
search_terms:
 - strict mode vs warn mode
 - plugin verification failure
 - how to handle trust policy errors
 - allow untrusted plugins
 - YAAF security modes
 - trust policy configuration
 - fail on mismatch
 - log security warnings
 - unknown plugin policy
 - strict verification
 - permissive security mode
stub: false
compiled_at: 2026-04-24T18:04:45.965Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/trustPolicy.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

The Trust Policy Mode is a configuration setting within YAAF's security subsystem that dictates the framework's behavior [when](../apis/when.md) a plugin or MCP server fails an integrity or policy check. It allows developers to choose between a permissive, logging-only approach suitable for development and a strict, fail-fast approach required for production environments [Source 1].

There are two available modes [Source 1]:
*   **`strict`**: This is the default mode. If any verification check fails (e.g., a plugin's hash mismatch, a tool is not on the allowlist), the framework will prevent the resource from being loaded and will raise an error.
*   **`warn`**: In this mode, verification failures do not prevent the resource from being loaded. Instead, a warning is logged, and the operation is allowed to proceed. This is useful for debugging or during development when hashes may change frequently.

This concept provides a crucial control for balancing security with developer velocity, allowing security policies to be enforced without being overly disruptive during the development lifecycle.

## How It Works in YAAF

The Trust Policy Mode is configured via the `mode` property within the `TrustPolicyConfig` object when creating a `TrustPolicy` instance. The type `TrustPolicyMode` is defined as a string literal type that can be either `"strict"` or `"warn"` [Source 1].

The selected mode also influences the default behavior for handling unregistered plugins or MCP servers. The `unknownPolicy` setting, which determines how to treat entities not explicitly listed in the trust manifest, defaults to `deny` when the mode is `strict`, and `allow` when the mode is `warn` [Source 1]. This ensures that the default posture aligns with the overall security level chosen by the mode.

When a verification event occurs, the `TrustPolicy` checks its configured mode to decide the outcome. In `strict` mode, a result of `"blocked"` will cause an exception. In `warn` mode, the same result will be logged (e.g., via the `onVerification` callback) but the resource will still be permitted to load [Source 1].

## Configuration

A developer can set the Trust Policy Mode when initializing a `TrustPolicy`. If the `mode` property is omitted, it defaults to `strict` [Source 1].

The following example demonstrates how to configure a `TrustPolicy` to operate in `warn` mode:

```typescript
import { trustPolicy } from 'yaaf';

// Configure the TrustPolicy to log warnings instead of failing
const permissivePolicy = trustPolicy({
  mode: 'warn',
  plugins: {
    'my-plugin': { sha256: 'abc123...' },
  },
});

// By contrast, this policy will fail if the hash for 'my-plugin' does not match.
// The 'mode' property defaults to 'strict'.
const strictPolicy = trustPolicy({
  plugins: {
    'my-plugin': { sha256: 'abc123...' },
  },
});
```

## Sources

[Source 1]: src/security/trustPolicy.ts