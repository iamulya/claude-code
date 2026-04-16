---
title: Storage Subsystem
entity_type: subsystem
summary: The framework component responsible for managing persistent data, including encrypted secrets and agent state.
primary_files:
  - src/storage/secureStorage.ts
exports:
  - SecureStorage
  - SecureStorageConfig
stub: false
compiled_at: 2026-04-16T14:36:23.603Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/storage/secureStorage.ts
confidence: 0.95
---

## Purpose
The Storage Subsystem provides a mechanism for the secure persistence of sensitive agent data, such as API keys, authentication tokens, and user secrets. It ensures that data is encrypted at rest using industry-standard algorithms while remaining cross-platform by utilizing pure Node.js implementations rather than native addon dependencies.

## Architecture
The subsystem is built around the `SecureStorage` class, which functions as an AES-256-GCM encrypted key-value store.

### Encryption and Security
Data security is handled through the following mechanisms:
*   **Algorithm**: AES-256-GCM is used for all encryption operations.
*   **Initialization Vectors (IV)**: Each value is individually encrypted with a unique IV. This ensures that identical plaintext values produce distinct ciphertexts, protecting against pattern analysis.
*   **Implementation**: The subsystem relies on the native Node.js `crypto` module, ensuring compatibility across different operating systems without requiring complex build tools.

### Key Derivation
The encryption key used to secure the store is derived from one of three sources, prioritized in the following order:
1.  **Environment Variable**: The `YAAF_STORAGE_KEY` environment variable, which should be a 32-byte hex string (e.g., generated via `openssl rand -hex 32`).
2.  **Master Password**: A `masterPassword` string passed directly to the class constructor.
3.  **Machine-Stable Key**: A fallback key derived from the system's hostname and username. This method is intended for development environments only and is not considered secure for production use.

## Integration Points
The Storage Subsystem is primarily used to manage credentials that are required by other parts of the framework, such as LLM providers or agent tools. Developers typically instantiate the storage to retrieve secrets before passing them into the agent configuration.

```typescript
const store = new SecureStorage({ namespace: 'my-agent' });

// Injecting a retrieved secret into Agent tools
const agent = new Agent({
  systemPrompt: '...',
  tools: createTools({ githubToken: await store.get('github_token') }),
});
```

## Key APIs
The primary interface for this subsystem is the `SecureStorage` class.

### SecureStorage
The main class for managing encrypted persistent files.

**Methods:**
*   `set(key: string, value: string): Promise<void>`: Encrypts the provided string value and persists it to the filesystem.
*   `get(key: string): Promise<string | undefined>`: Retrieves the value associated with the key and decrypts it. Returns `undefined` if the key does not exist.

## Configuration
The subsystem is configured via the `SecureStorageConfig` object. By default, data is stored in the user's home directory.

| Property | Type | Description |
| :--- | :--- | :--- |
| `namespace` | `string` | **Required.** Determines the filename: `~/.yaaf/secure/<namespace>.enc.json`. |
| `dir` | `string` | (Optional) The directory where encrypted files are stored. Defaults to `~/.yaaf/secure/`. |
| `masterPassword` | `string` | (Optional) A password used to derive the encryption key if the `YAAF_STORAGE_KEY` environment variable is not set. |