---
summary: Manages persistent and secure storage of agent data, including sensitive information like API keys and user secrets.
primary_files:
 - src/storage/secureStorage.ts
title: Storage System
entity_type: subsystem
exports:
 - SecureStorage
search_terms:
 - secure key-value store
 - encrypted agent data
 - how to store API keys
 - YAAF_STORAGE_KEY
 - agent secrets management
 - persistent encrypted storage
 - AES-256-GCM encryption
 - node.js crypto storage
 - cross-platform secret storage
 - masterPassword configuration
 - where are secrets stored
 - yaaf secure directory
stub: false
compiled_at: 2026-04-25T00:30:53.246Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/storage/secureStorage.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Storage System provides a secure, persistent key-value store for sensitive agent data [Source 1]. Its primary function is to encrypt and store information such as API keys, authentication tokens, and user secrets at rest, ensuring they are protected on the local filesystem. The system is implemented using pure Node.js crypto modules, which allows it to operate cross-platform without requiring native addon dependencies [Source 1].

## Architecture

The core of the Storage System is the `SecureStorage` class, which implements an AES-256-GCM encrypted key-value store [Source 1].

### Encryption

Each value stored is individually encrypted using a unique Initialization Vector (IV). This ensures that identical plaintext values produce different ciphertext, enhancing security [Source 1].

### Key Derivation

The master encryption key is derived from one of the following sources, in order of precedence:
1.  The `YAAF_STORAGE_KEY` environment variable, which should be a 32-byte hex string.
2.  A `masterPassword` string passed to the `SecureStorage` constructor.
3.  A machine-stable key generated from the system's hostname and username. This method is intended for development environments only and is not suitable for production use [Source 1].

### Persistence

The encrypted key-value pairs are persisted to a JSON file on the local filesystem. The location and name of this file are determined by the configuration provided during initialization [Source 1].

## Integration Points

The Storage System is designed to be used by other parts of the framework that handle sensitive data. A common pattern is for an [agent](./agent-core.md) to retrieve credentials from `SecureStorage` during its initialization and inject them into its tools [Source 1]. This allows tools to access necessary secrets without having them hardcoded or passed insecurely.

```ts
// Example of retrieving a token and injecting it into a tool
const store = new SecureStorage({ namespace: 'my-agent' });

const agent = new Agent({
  systemPrompt: '...',
  tools: createTools({ githubToken: await store.get('github_token') }),
});
```

## Key APIs

The primary public API for this subsystem is the [SecureStorage](../apis/secure-storage.md) class. Its main methods include:
*   `new SecureStorage(config)`: Creates a new instance of the secure store.
*   `set(key, value)`: Encrypts and persists a value associated with a key.
*   `get(key)`: Retrieves and decrypts the value for a given key.

## Configuration

The behavior of the `SecureStorage` class is configured via the `SecureStorageConfig` object passed to its constructor. Key properties include:

*   `namespace`: A required string that determines the name of the encrypted file, following the pattern `<namespace>.enc.json`.
*   `dir`: An optional string specifying the directory for the encrypted file. It defaults to `~/.yaaf/secure/`.
*   `masterPassword`: An optional string used for key derivation if the `YAAF_STORAGE_KEY` environment variable is not set [Source 1].

The most secure way to configure the encryption key is by setting the `YAAF_STORAGE_KEY` environment variable [Source 1].

## Sources

[Source 1]: src/storage/secureStorage.ts