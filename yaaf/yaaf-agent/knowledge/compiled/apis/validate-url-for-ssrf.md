---
export_name: validateUrlForSSRF
source_file: src/knowledge/compiler/ingester/ssrf.ts
category: function
summary: Validates a URL against various SSRF attack vectors, ensuring it does not target private or internal resources.
title: validateUrlForSSRF
entity_type: api
search_terms:
 - SSRF prevention
 - server-side request forgery
 - secure URL validation
 - block internal network requests
 - prevent access to private IP
 - validate external URLs
 - KBClipper security
 - ingester network safety
 - RFC 1918 validation
 - cloud metadata endpoint protection
 - localhost blocking
 - safe URL fetching
 - protect against IP encoding bypass
stub: false
compiled_at: 2026-04-24T17:47:23.840Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/ssrf.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `validateUrlForSSRF` function is a security utility designed to prevent Server-Side Request Forgery (SSRF) attacks. It is used by network-facing [Ingester](./ingester.md) components, such as the [KBClipper](./kb-clipper.md) and image downloaders, to ensure that user-provided URLs do not target private or internal network resources [Source 1].

The function performs a series of checks in order to identify and block malicious URLs:
1.  **Protocol Check**: Ensures the URL protocol is either `http:` or `https:`. Other protocols like `file://` or `ftp://` are rejected.
2.  **Hostname Check**: The hostname string is checked against a blocklist of private ranges and known cloud metadata endpoints.
3.  **Normalized IP Check**: The function normalizes the host to an IP address to catch bypass attempts using octal, hexadecimal, or decimal IP encoding (e.g., `0x7f000001` for `127.0.0.1`).
4.  **DNS Resolution Check**: The hostname is resolved via DNS to its underlying IP address, which is then checked. This prevents bypasses where a public-facing hostname resolves to a private IP address [Source 1].

This function provides coverage against a wide range of SSRF vectors, including:
-   RFC 1918 private IP ranges (e.g., `10.0.0.0/8`, `192.168.0.0/16`)
-   Loopback (`127.0.0.0/8`) and link-local (`169.254.0.0/16`) addresses
-   Cloud provider metadata endpoints for AWS, GCP, and Azure
-   IPv6-mapped IPv4 addresses (e.g., `::ffff:127.0.0.1`) [Source 1].

A known limitation of this function is that it does not protect against [DNS rebinding](../concepts/dns-rebinding.md) attacks or SSRF attacks initiated via [HTTP redirects](../concepts/http-redirects.md). For comprehensive protection in a production environment, it is recommended to use this function in conjunction with a proxy that validates resolved IP addresses after redirects, such as the `ssrfSafeFetch` utility or a dedicated egress proxy [Source 1].

## Signature

```typescript
export async function validateUrlForSSRF(url: string): Promise<void>;
```

### Parameters

-   `url` (string): The URL to validate.

### Returns

-   `Promise<void>`: A promise that resolves if the URL is valid and safe. It rejects with an `Error` if the URL is determined to be a potential SSRF threat [Source 1].

## Examples

The following example demonstrates how to use `validateUrlForSSRF` within a `try...catch` block to safely handle an untrusted URL before attempting to fetch it.

```typescript
import { validateUrlForSSRF } from 'yaaf';

async function processUntrustedUrl(url: string) {
  try {
    await validateUrlForSSRF(url);
    console.log(`✅ URL is safe to fetch: ${url}`);
    // Proceed with fetching the URL...
    // const response = await fetch(url);
  } catch (error) {
    console.error(`❌ SSRF validation failed for URL: ${url}`);
    if (error instanceof Error) {
      console.error(`Reason: ${error.message}`);
    }
  }
}

// --- Valid URLs ---
processUntrustedUrl('https://www.example.com/some/path');

// --- Invalid URLs that will throw an error ---
processUntrustedUrl('http://192.168.1.1/admin'); // Private IP
processUntrustedUrl('file:///etc/passwd'); // Disallowed protocol
processUntrustedUrl('http://169.254.169.254/latest/meta-data/'); // Cloud metadata IP
processUntrustedUrl('http://localhost:8080'); // Loopback address
```

## See Also

-   `ssrfSafeFetch`: A wrapper around `fetch` that incorporates SSRF validation, including protection against malicious redirects.
-   `isPrivateHost`: A synchronous function to check if a given hostname resolves to a private or internal IP address.

## Sources

[Source 1]: src/knowledge/compiler/ingester/ssrf.ts