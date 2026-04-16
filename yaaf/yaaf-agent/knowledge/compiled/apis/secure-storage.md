---
title: SecureStorage
entity_type: api
summary: An AES-256-GCM encrypted key-value store for sensitive data like API keys and database URLs.
export_name: SecureStorage
source_file: src/security.ts
category: class
stub: false
compiled_at: 2026-04-16T14:11:07.245Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/security.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/storage/secureStorage.ts
confidence: 1
---

## Overview
`SecureStorage` is a utility class designed to persist sensitive agent data, such as API keys, tokens, and database credentials, encrypted at rest. It utilizes AES-256-GCM encryption via the native Node.js `crypto` module, ensuring zero plaintext is stored on disk. 

Each stored value is individually encrypted with a unique 12-byte Initialization Vector (IV), meaning identical values will produce different ciphertexts. The system is cross-platform and does not require native addon dependencies.

## Signature / Constructor

### SecureStorageConfig
The configuration object for initializing the storage.

```typescript
export type SecureStorageConfig = {
  /**
   * Namespace for this store. Determines the storage organization.
   */
  namespace: string;

  /**
   * Directory to store encrypted files.
   * Default: `~/.yaaf/secure/`
   */
  dir?: string;

  /**
   * Master password used to derive the encryption key via PBKDF2.
   * Overridden by the YAAF_STORAGE_KEY environment variable.
   * If neither is provided, falls back to a machine-stable key.
   */
  masterPassword?: string;
}
```

### Constructor
```typescript
constructor(config: SecureStorageConfig)
```

## Methods & Properties

| Method | Signature | Description |
|--------|-----------|-------------|
| `set` | `set(key: string, value: string): Promise<void>` | Encrypts the provided string value and writes it to disk. |
| `get` | `get(key: string): Promise<string \| undefined>` | Reads the encrypted file, decrypts the content, and returns the plaintext. |
| `list` | `list(): Promise<string[]>` | Returns an array of all keys currently stored within the namespace. |
| `delete` | `delete(key: string): Promise<void>` | Removes the encrypted file associated with the specified key. |

## Key Derivation
The encryption key used by `SecureStorage` is derived using one of three modes, prioritized in the following order:

1.  **Environment Variable**: If `YAAF_STORAGE_KEY` is set (expected as a hex string), it is used as the master key. This is the recommended approach for production environments.
2.  **Password-based**: If a `masterPassword` is provided in the configuration, the key is derived using PBKDF2. A `.salt` file is created in the storage directory to facilitate this.
3.  **Machine-stable Key**: If no environment variable or password is provided, the framework derives a key from the local hostname and username. This mode is intended for development only.

## Storage Format
Data is stored in the specified directory (defaulting to `~/.yaaf/secure/`) with the following structure:
- Individual keys are stored as `<key>.enc` files.
- Each `.enc` file contains a 12-byte IV, a 16-byte authentication tag, and the ciphertext.
- A `.salt` file is present if password-based derivation is used.

## Examples

### Basic Usage
```typescript
import { SecureStorage } from 'yaaf';

const store = new SecureStorage({
  namespace: 'my-agent',
  dir: './.secrets',
});

// Storing sensitive data
await store.set('openai_key', 'sk-...');
await store.set('database_url', 'postgres://...');

// Retrieving data
const key = await store.get('openai_key');

// Management
const allKeys = await store.list(); // ['openai_key', 'database_url']
await store.delete('openai_key');
```

### Configuration Modes
The source material indicates a discrepancy between documentation examples and the TypeScript interface regarding property names. The TypeScript interface uses `dir` and `masterPassword`.

```typescript
// 1. Environment variable mode (Recommended)
// export YAAF_STORAGE_KEY=$(openssl rand -hex 32)
const store = new SecureStorage({ namespace: 'prod-agent' });

// 2. Password-based mode
const store = new SecureStorage({
  namespace: 'dev-agent',
  masterPassword: 'my-secure-passphrase',
});

// 3. Machine-derived mode (Default)
const store = new SecureStorage({ namespace: 'local-test' });
```