---
summary: An environment variable used by YAAF's SecureStorage to provide a master key for encryption key derivation.
title: YAAF_STORAGE_KEY
entity_type: concept
related_subsystems:
 - SecureStorage
see_also:
 - "[SecureStorage](../apis/secure-storage.md)"
 - "[Key Derivation](./key-derivation.md)"
search_terms:
 - secure storage key
 - master encryption key
 - how to set encryption key
 - YAAF environment variables
 - agent secrets management
 - AES-256-GCM key
 - openssl rand -hex 32
 - data at rest encryption
 - configure SecureStorage
 - masterPassword vs env var
 - production secrets
stub: false
compiled_at: 2026-04-25T00:26:27.857Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/storage/secureStorage.ts
compiled_from_quality: unknown
confidence: 0.85
---

## What It Is

`YAAF_STORAGE_KEY` is an environment variable that provides the master secret used by the [SecureStorage](../apis/secure-storage.md) subsystem to encrypt and decrypt sensitive agent data at rest. It is the primary and recommended method for configuring the encryption key in production environments, as it avoids hardcoding secrets in application code [Source 1].

This variable supplies the high-entropy input for the framework's [Key Derivation](./key-derivation.md) function, which in turn generates the actual encryption keys used for AES-256-GCM operations within [SecureStorage](../apis/secure-storage.md) [Source 1].

## How It Works in YAAF

The [SecureStorage](../apis/secure-storage.md) class uses a specific order of precedence to determine the master secret for its [Key Derivation](./key-derivation.md) process [Source 1]:

1.  **`YAAF_STORAGE_KEY` Environment Variable**: If this environment variable is set, its value is used as the master secret. This is the highest priority source.
2.  **`masterPassword` Constructor Option**: If the environment variable is not set, the framework checks if a `masterPassword` was provided to the `SecureStorage` constructor.
3.  **Machine-Stable Key**: If neither of the above is provided, a fallback key is generated based on the machine's hostname and the current user's username. This method is intended for development purposes only and is not suitable for production use [Source 1].

The value of `YAAF_STORAGE_KEY` should be a cryptographically secure, 32-byte random value, represented as a 64-character hexadecimal string. The recommended command to generate a suitable key is `openssl rand -hex 32` [Source 1].

## Configuration

To configure [SecureStorage](../apis/secure-storage.md) using this method, the `YAAF_STORAGE_KEY` environment variable must be set in the process where the YAAF agent is running.

**1. Generate and Set the Key**

In a shell environment, generate a key and export it as an environment variable:

```bash
# Generate a secure 32-byte hex key
export YAAF_STORAGE_KEY=$(openssl rand -hex 32)

# The variable now holds a key, e.g., "a1b2c3d4..."
echo $YAAF_STORAGE_KEY
```

**2. Instantiate SecureStorage in Code**

When `YAAF_STORAGE_KEY` is present in the environment, the `SecureStorage` class will automatically use it. No special configuration is needed in the code.

```typescript
import { SecureStorage } from '@yaaf/agent';

// The SecureStorage instance will automatically detect and use
// the YAAF_STORAGE_KEY from the environment.
const store = new SecureStorage({ namespace: 'my-production-agent' });

async function initialize() {
  await store.set('api_key', 'sk-...');
  const retrievedKey = await store.get('api_key');
  console.log(retrievedKey);
}

initialize();
```

In this example, the `masterPassword` option is omitted from the constructor, forcing `SecureStorage` to look for the environment variable [Source 1].

## See Also

- [SecureStorage](../apis/secure-storage.md)
- [Key Derivation](./key-derivation.md)

## Sources

[Source 1] src/storage/secureStorage.ts