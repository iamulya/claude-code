---
summary: Defines the trust configuration for a specific plugin, including hash and version constraints.
export_name: PluginTrust
source_file: src/security/trustPolicy.ts
category: type
title: PluginTrust
entity_type: api
search_terms:
 - plugin security
 - plugin integrity
 - verify plugin checksum
 - plugin sha256 hash
 - plugin version constraint
 - trusted plugin configuration
 - trust policy for plugins
 - how to trust a plugin
 - YAAF security policy
 - plugin allowlist
 - supply chain security
 - agent plugin verification
 - plugin manifest
stub: false
compiled_at: 2026-04-24T17:28:51.302Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/trustPolicy.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `PluginTrust` type is a configuration object used within a `TrustPolicy` to define the security and integrity requirements for a single plugin. It allows an agent to verify that a plugin has not been tampered with and meets specific version criteria before it is loaded and executed.

This mechanism is a core part of YAAF's security model, helping to prevent supply chain attacks and ensure that only authorized and verified code runs within an agent. A `PluginTrust` object can specify a SHA-256 checksum for the plugin's entry file, a semantic versioning (semver) constraint, or explicitly mark the plugin as trusted to bypass these checks.

These configurations are typically defined in a `TrustPolicyConfig` object, mapping plugin names to their respective `PluginTrust` rules [Source 1].

## Signature

`PluginTrust` is a type alias for an object with the following optional properties [Source 1]:

```typescript
export type PluginTrust = {
  /** Expected SHA-256 hash of the plugin entry module content */
  sha256?: string;

  /** Semver version constraint (e.g., '>=1.0.0', '^2.3.0') */
  version?: string;

  /** Whether this plugin is explicitly trusted (bypasses hash check) */
  trusted?: boolean;
};
```

### Properties

- **`sha256?: string`**: An optional string containing the expected SHA-256 checksum of the plugin's main entry file. If provided, the `TrustPolicy` will hash the plugin's content and compare it against this value. The load operation will fail (in `strict` mode) if the hashes do not match.
- **`version?: string`**: An optional string representing a semantic versioning constraint (e.g., `'^1.2.0'`, `'>=2.0.0'`). If provided, the `TrustPolicy` will check the plugin's declared version against this constraint.
- **`trusted?: boolean`**: An optional boolean. If set to `true`, this plugin is considered explicitly trusted, and all other checks (like `sha256` and `version`) are bypassed for it. This is useful for internal or highly-vetted plugins where integrity checks are handled by other means.

## Examples

The following example demonstrates how to define `PluginTrust` configurations for different plugins within a `TrustPolicyConfig`.

```typescript
import { TrustPolicyConfig } from 'yaaf';

const securityConfig: TrustPolicyConfig = {
  // Plugin trust declarations are keyed by the plugin's name.
  plugins: {
    'file-system-plugin': {
      // This plugin must match a specific content hash and version range.
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      version: '^1.2.0',
    },
    'internal-metrics-plugin': {
      // This plugin is developed in-house and bypasses hash/version checks.
      trusted: true,
    },
    'api-client-plugin': {
      // This plugin is only checked against its version, not its content hash.
      version: '>=2.0.0',
    }
  },
  // The policy will fail loudly if any check fails.
  mode: 'strict',
};

// This config would be passed to a TrustPolicy instance.
// const policy = new TrustPolicy(securityConfig);
```

## See Also

- `TrustPolicy`: The class that consumes `PluginTrust` configurations to enforce security rules.
- `TrustPolicyConfig`: The main configuration object for a `TrustPolicy`, which contains the mapping of plugin names to `PluginTrust` objects.

## Sources

[Source 1]: src/security/trustPolicy.ts