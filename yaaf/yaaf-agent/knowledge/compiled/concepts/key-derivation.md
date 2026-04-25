---
summary: The process of generating cryptographic keys from a master secret or password, used in YAAF for secure storage.
title: Key Derivation
entity_type: concept
related_subsystems:
 - storage
see_also:
 - concept:SecureStorage
 - concept:YAAF_STORAGE_KEY
search_terms:
 - how to set encryption key
 - YAAF_STORAGE_KEY environment variable
 - master password for storage
 - secure storage encryption
 - cryptographic key generation
 - deriving keys from password
 - machine-stable key
 - dev-only encryption key
 - AES-256-GCM key
 - openssl rand -hex 32
stub: false
compiled_at: 2026-04-25T00:20:14.533Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/storage/secureStorage.ts
compiled_from_quality: unknown
confidence: 0.85
---

## What It Is

Key Derivation is the process of generating one or more cryptographic keys from a secret value, such as a master password or a primary key. In YAAF, this concept is central to the [SecureStorage](../apis/secure-storage.md) subsystem, which provides an AES-256-GCM encrypted key-value store for sensitive data like API keys, authentication tokens, and user secrets [Source 1].

The purpose of key derivation in this context is to produce a strong, consistent encryption key from a more memorable or manageable source, ensuring that data can be securely encrypted at rest and decrypted when needed, without storing the raw encryption key directly in configuration files [Source 1].

## How It Works in YAAF

The [SecureStorage](../apis/secure-storage.md) implementation in YAAF derives its encryption key from one of three possible sources, evaluated in a specific order of precedence [Source 1]:

1.  **`YAAF_STORAGE_KEY` Environment Variable**: This is the highest-priority source. If the [YAAF_STORAGE_KEY](./yaaf-storage-key.md) environment variable is set, its value is used to derive the key. This is the recommended method for production environments. The variable should contain a cryptographically secure 32-byte hexadecimal string, which can be generated using a command like `openssl rand -hex 32` [Source 1].

2.  **`masterPassword` Constructor Option**: If the environment variable is not present, YAAF will use the `masterPassword` string provided in the `SecureStorage` constructor configuration. This allows the key to be managed programmatically by the application [Source 1].

3.  **Machine-Stable Key (Development Only)**: As a final fallback, if neither of the above sources is provided, YAAF generates a machine-stable key derived from a combination of the system's hostname and the current user's username. This method is intended for development purposes only, as it is not secure for production use and is not portable across different machines or user accounts [Source 1].

## Configuration

The method of key derivation is determined by how the `SecureStorage` class is configured.

### Using an Environment Variable (Recommended for Production)

Set the environment variable before running the YAAF application. No special constructor options are needed.

```bash
export YAAF_STORAGE_KEY=$(openssl rand -hex 32)
# Now run the YAAF agent process
```

```typescript
// In your application code:
import { SecureStorage } from 'yaaf';

// SecureStorage will automatically use the YAAF_STORAGE_KEY env var.
const store = new SecureStorage({ namespace: 'my-prod-agent' });
```

### Using a Master Password

Pass the `masterPassword` directly to the constructor. This will be used only if `YAAF_STORAGE_KEY` is not set.

```typescript
import { SecureStorage } from 'yaaf';

const store = new SecureStorage({
  namespace: 'my-agent',
  masterPassword: 'a-very-strong-and-secret-password',
});
```
[Source 1]

### Using the Fallback Machine Key (Development Only)

Instantiate `SecureStorage` without providing a `masterPassword` and without setting the `YAAF_STORAGE_KEY` environment variable.

```typescript
import { SecureStorage } from 'yaaf';

// WARNING: For development only.
// Key is derived from machine-specific identifiers (hostname, username).
const devStore = new SecureStorage({
  namespace: 'dev-agent',
});
```
[Source 1]

## See Also

*   [SecureStorage](../apis/secure-storage.md): The API that uses key derivation to encrypt data at rest.
*   [YAAF_STORAGE_KEY](./yaaf-storage-key.md): The environment variable used as the primary source for key derivation.

## Sources

*   [Source 1]: `src/storage/secureStorage.ts`