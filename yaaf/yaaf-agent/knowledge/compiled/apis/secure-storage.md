---
title: SecureStorage
entity_type: api
summary: An AES-256-GCM encrypted key-value store for sensitive data, ensuring zero plaintext on disk.
export_name: SecureStorage
source_file: src/secure-storage.ts
category: class
search_terms:
 - encrypted key-value store
 - store API keys securely
 - AES-256-GCM encryption
 - zero plaintext on disk
 - YAAF_STORAGE_KEY
 - PBKDF2 key derivation
 - machine-derived key
 - how to store secrets
 - agent secret management
 - sensitive data persistence
 - Node.js crypto storage
 - cross-platform secret storage
stub: false
compiled_at: 2026-04-24T17:36:08.727Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/security.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/storage/secureStorage.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`SecureStorage` is a key-value store that provides AES-256-GCM encryption for sensitive agent data such as API keys, tokens, and other user secrets [Source 2]. Its primary design goal is to ensure that zero plaintext data is ever written to disk [Source 1].

The implementation uses pure Node.js crypto modules, making it cross-platform without requiring native addon dependencies [Source 2]. Each value is individually encrypted with a unique, randomly generated 12-byte Initialization Vector (IV) for every write operation. This ensures that identical plaintext values produce different ciphertext, enhancing security [Source 1, Source 2].

The encryption key can be derived in one of three ways, in order of precedence [Source 1, Source 2]:

1.  **Environment Variable**: The `YAAF_STORAGE_KEY` environment variable, containing a 32-byte hex string. This is the recommended method for production environments.
2.  **Password-based**: A `masterPassword` provided to the constructor, which uses PBKDF2 to derive the key. This is suitable for developer machines.
3.  **Machine Key**: An automatically derived key based on the machine's hostname and the current user's username. This is a fallback for development purposes and is not recommended for production use.

Encrypted files are stored with a `.enc` extension. Each file contains the 12-byte IV, a 16-byte authentication tag, and the ciphertext. If password-based [Key Derivation](../concepts/key-derivation.md) is used, a `.salt` file is also created in the storage directory [Source 1].

## Signature / Constructor

`SecureStorage` is instantiated with a configuration object that defines its namespace and key derivation strategy.

```typescript
import { SecureStorage } from 'yaaf';

const store = new SecureStorage({
  namespace: 'my-agent',
  storageDir: './.secrets',
});
```

### Configuration

The constructor accepts a `SecureStorageConfig` object with the following properties [Source 2]:

```typescript
export type SecureStorageConfig = {
  /**
   * Namespace for this store.
   */
  namespace: string;

  /**
   * Directory to store encrypted files.
   * Default: `~/.yaaf/secure/`
   */
  dir?: string;

  /**
   * Master password used to derive the encryption key.
   * Overridden by `YAAF_STORAGE_KEY` env var.
   * If neither is provided, falls back to a machine-stable key (dev-only).
   */
  masterPassword?: string;
};
```

## Methods & Properties

The `SecureStorage` class provides standard asynchronous methods for a key-value store.

### `set(key: string, value: string): Promise<void>`

Encrypts and stores a value associated with the given key [Source 1].

### `get(key: string): Promise<string | null>`

Retrieves and decrypts the value for the given key. Returns `null` if the key does not exist [Source 1].

### `list(): Promise<string[]>`

Returns an array of all keys stored in the namespace [Source 1].

### `delete(key: string): Promise<void>`

Deletes the key-value pair from the store [Source 1].

## Examples

### Basic Usage

The following example demonstrates creating a store and performing basic CRUD (Create, Read, Update, Delete) operations [Source 1].

```typescript
import { SecureStorage } from 'yaaf';

const store = new SecureStorage({
  namespace: 'my-agent',
  storageDir: './.secrets',
});

// Set sensitive data
await store.set('openai_key', 'sk-...');
await store.set('database_url', 'postgres://...');

// Get a specific key
const key = await store.get('openai_key');
console.log(key); // 'sk-...'

// List all keys
const allKeys = await store.list();
console.log(allKeys); // ['openai_key', 'database_url']

// Delete a key
await store.delete('openai_key');
```

### Key Derivation Modes

`SecureStorage` can be configured to derive its encryption key in several ways [Source 1].

**1. Environment Variable (Recommended for Production)**

Set the `YAAF_STORAGE_KEY` environment variable. This method takes precedence over all others.

```bash
# Generate a secure key
export YAAF_STORAGE_KEY=$(openssl rand -hex 32)
```

```typescript
// No password or key needed in code
const store = new SecureStorage({
  namespace: 'my-agent',
});
```

**2. Password-Based (for Development)**

Provide a password directly to the constructor. This uses PBKDF2 for key derivation.

```typescript
const store = new SecureStorage({
  namespace: 'my-agent',
  masterPassword: 'my-super-secret-passphrase',
});
```

**3. Machine-Derived Key (for Development)**

If no environment variable or password is provided, a key is automatically derived from machine-specific information like the hostname and username.

```typescript
const store = new SecureStorage({
  namespace: 'my-agent',
  // No key or password provided
});
```

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/security.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/storage/secureStorage.ts