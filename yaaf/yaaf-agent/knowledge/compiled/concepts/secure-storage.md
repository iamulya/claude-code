---
title: Secure Storage
entity_type: concept
summary: The architectural pattern and security practice of encrypting sensitive agent credentials and state at rest using AES-256-GCM.
related_subsystems:
  - Storage
  - Security
stub: false
compiled_at: 2026-04-16T14:36:24.510Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/storage/secureStorage.ts
confidence: 0.92
---

## What It Is
Secure Storage is a framework-level abstraction in YAAF designed to protect sensitive information such as API keys, authentication tokens, and user secrets. It provides an encrypted key-value store that ensures data is protected at rest. 

In the context of LLM-powered agents, Secure Storage solves the problem of credential leakage. Because agents often require high-privilege access to external services (e.g., GitHub, databases, or cloud providers), storing these credentials in plain text or environment variables poses a significant security risk. YAAF utilizes Secure Storage to isolate these secrets from the agent's logic and the underlying file system.

## How It Works in YAAF
The mechanism is implemented via the `SecureStorage` class, which utilizes the standard Node.js `crypto` module. This approach ensures cross-platform compatibility without requiring native dependencies or external secret management backends like Keychain or SecretService.

### Encryption Standard
YAAF employs **AES-256-GCM** (Advanced Encryption Standard with Galois/Counter Mode) for encryption. This provides both confidentiality and authenticity (AEAD). To ensure that identical values do not produce identical ciphertext, the framework generates a unique Initialization Vector (IV) for every individual value stored.

### Key Derivation
The encryption key used by the `SecureStorage` instance is derived based on a specific hierarchy of sources:
1.  **Environment Variable**: If `YAAF_STORAGE_KEY` is set (as a 32-byte hex string), it is used as the primary key source.
2.  **Master Password**: If no environment variable is present, the framework uses a `masterPassword` string passed to the class constructor.
3.  **Machine-Stable Key**: If neither of the above is provided, the framework derives a key from the local machine's hostname and username. This method is intended for development environments only and is explicitly not recommended for production use.

### Persistence
Data is persisted to the local file system in a JSON format. By default, files are stored in the user's home directory under `~/.yaaf/secure/`. Each store is partitioned by a `namespace`, resulting in a filename structured as `<namespace>.enc.json`.

## Configuration
Developers configure Secure Storage by passing a `SecureStorageConfig` object to the constructor. This allows for customization of the storage location and the security parameters.

```typescript
export type SecureStorageConfig = {
  /**
   * Namespace for this store. Determines the file name:
   * `~/.yaaf/secure/<namespace>.enc.json`
   */
  namespace: string

  /**
   * Directory to store encrypted files.
   * Default: `~/.yaaf/secure/`
   */
  dir?: string

  /**
   * Master password used to derive the encryption key.
   * Overridden by `YAAF_STORAGE_KEY` env var.
   */
  masterPassword?: string
}
```

### Usage Example
The following example demonstrates how to initialize the store and inject a retrieved secret into an agent's tools:

```ts
const store = new SecureStorage({ namespace: 'my-agent' });

// Persisting a secret
await store.set('github_token', 'ghp_...');

// Retrieving a secret for use in an Agent
const token = await store.get('github_token');

const agent = new Agent({
  systemPrompt: '...',
  tools: createTools({ githubToken: token }),
});
```

## Sources
* `src/storage/secureStorage.ts`