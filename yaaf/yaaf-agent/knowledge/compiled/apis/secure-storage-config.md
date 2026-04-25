---
summary: Configuration interface for the `SecureStorage` class, defining options like namespace, directory, and master password.
export_name: SecureStorageConfig
source_file: src/storage/secureStorage.ts
category: type
title: SecureStorageConfig
entity_type: api
search_terms:
 - secure storage configuration
 - encrypted storage options
 - how to configure SecureStorage
 - agent secret management
 - YAAF_STORAGE_KEY
 - master password for storage
 - storage namespace
 - encrypted file location
 - agent data persistence
 - key-value store settings
 - protecting API keys
 - agent credentials
stub: false
compiled_at: 2026-04-24T17:36:11.033Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/storage/secureStorage.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`SecureStorageConfig` is a TypeScript type alias that defines the configuration object for the `SecureStorage` class. It specifies the necessary parameters for initializing an encrypted key-value store, including its unique identifier (namespace), storage location, and the master password used for [Key Derivation](../concepts/key-derivation.md) [Source 1].

This configuration is passed to the `SecureStorage` constructor to customize how and where sensitive agent data, such as API keys or user secrets, is persisted securely on disk [Source 1].

## Signature

The `SecureStorageConfig` type is an object with the following properties [Source 1]:

```typescript
export type SecureStorageConfig = {
  /**
   * Namespace for this store. Determines the file name:
   * `~/.yaaf/secure/<namespace>.enc.json`
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

### Properties

*   **`namespace`**: `string` (required)
    A unique identifier for the storage instance. This value is used to construct the filename for the encrypted data file, following the pattern `~/.yaaf/secure/<namespace>.enc.json` [Source 1].

*   **`dir`**: `string` (optional)
    The file system directory where the encrypted file will be stored. If not provided, it defaults to `~/.yaaf/secure/` [Source 1].

*   **`masterPassword`**: `string` (optional)
    A password used to derive the encryption key for the store. This option is overridden if the `YAAF_STORAGE_KEY` environment variable is set. If neither the password nor the environment variable is provided, the system falls back to a machine-stable key derived from the hostname and username, which is intended for development use only [Source 1].

## Examples

### Basic Configuration

The only required property is `namespace`. This example creates a `SecureStorage` instance that will save its data to the default directory (`~/.yaaf/secure/my-agent.enc.json`) [Source 1].

```typescript
import { SecureStorage, SecureStorageConfig } from 'yaaf';

const config: SecureStorageConfig = {
  namespace: 'my-agent',
};

const store = new SecureStorage(config);

// ... use the store
```

### Advanced Configuration

This example specifies a custom directory and a master password for key derivation [Source 1].

```typescript
import { SecureStorage, SecureStorageConfig } from 'yaaf';
import * as path from 'path';

const config: SecureStorageConfig = {
  namespace: 'production-bot',
  dir: path.join('/var/data/yaaf', 'secure'),
  masterPassword: 'a-very-strong-password-from-secret-manager',
};

const store = new SecureStorage(config);

// The store will now use /var/data/yaaf/secure/production-bot.enc.json
```

## See Also

*   `SecureStorage`: The class that uses this configuration to create an encrypted key-value store.

## Sources

[Source 1]: src/storage/secureStorage.ts