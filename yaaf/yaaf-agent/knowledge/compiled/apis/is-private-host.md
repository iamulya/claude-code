---
export_name: isPrivateHost
source_file: src/knowledge/compiler/ingester/ssrf.ts
category: function
summary: Checks if a hostname resolves to a private or internal IP address, blocking common SSRF targets.
title: isPrivateHost
entity_type: api
search_terms:
 - SSRF prevention
 - server-side request forgery
 - validate hostname
 - check for private IP
 - internal network security
 - block localhost requests
 - RFC 1918 check
 - cloud metadata endpoint protection
 - link-local address validation
 - loopback address check
 - secure URL fetching
 - prevent access to internal resources
stub: false
compiled_at: 2026-04-24T17:15:12.745Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/ssrf.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `isPrivateHost` function is a security utility designed to help prevent Server-Side Request Forgery (SSRF) attacks [Source 1]. It synchronously checks if a given hostname string corresponds to a private or internal network address. This function is a foundational component for network-facing [Ingester](./ingester.md)s within the YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md), such as the `KBClipper` [Source 1].

It identifies and blocks a wide range of non-public addresses, including:
*   RFC 1918 private ranges (e.g., `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
*   Loopback addresses (e.g., `127.0.0.0/8`, `::1`, `localhost`)
*   Link-local addresses (e.g., `169.254.0.0/16`)
*   Common cloud provider metadata service endpoints for AWS, GCP, and Azure
*   IP addresses encoded in octal, hexadecimal, or decimal formats
*   IPv6-mapped IPv4 addresses [Source 1]

A known limitation of `isPrivateHost` is that it does not protect against [DNS rebinding](../concepts/dns-rebinding.md) attacks or malicious [HTTP redirects](../concepts/http-redirects.md). For comprehensive [SSRF Protection](../subsystems/ssrf-protection.md), it should be used in conjunction with other security measures, such as a proxy that validates the final resolved IP address of a request [Source 1].

## Signature

```typescript
export function isPrivateHost(hostname: string): boolean;
```

### Parameters

*   **`hostname`** `string`: The hostname or IP address string to validate.

### Returns

*   `boolean`: Returns `true` if the hostname is determined to be a private, internal, or otherwise restricted address. Returns `false` if it is a public address.

## Examples

The following example demonstrates how to use `isPrivateHost` to guard a network operation.

```typescript
import { isPrivateHost } from 'yaaf';

const publicUrl = 'www.google.com';
const localUrl = 'localhost';
const privateIp = '192.168.1.50';
const metadataEndpoint = '169.254.169.254';

// Check a public hostname
if (!isPrivateHost(publicUrl)) {
  console.log(`'${publicUrl}' is safe to connect to.`);
  // => 'www.google.com' is safe to connect to.
} else {
  console.error(`Connection to '${publicUrl}' blocked for security reasons.`);
}

// Check a local hostname
if (isPrivateHost(localUrl)) {
  console.error(`Connection to '${localUrl}' blocked for security reasons.`);
  // => Connection to 'localhost' blocked for security reasons.
}

// Check a private IP address
if (isPrivateHost(privateIp)) {
  console.error(`Connection to '${privateIp}' blocked for security reasons.`);
  // => Connection to '192.168.1.50' blocked for security reasons.
}

// Check a cloud metadata endpoint
if (isPrivateHost(metadataEndpoint)) {
  console.error(`Connection to '${metadataEndpoint}' blocked for security reasons.`);
  // => Connection to '169.254.169.254' blocked for security reasons.
}
```

## See Also

*   `validateUrlForSSRF`: An asynchronous function that performs a more comprehensive set of SSRF checks on a full URL, including DNS resolution.
*   `ssrfSafeFetch`: A wrapper around `fetch` that blocks redirects to private or internal URLs.

## Sources

[Source 1]: src/knowledge/compiler/Ingester/ssrf.ts