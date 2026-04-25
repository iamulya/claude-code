---
export_name: ssrfSafeFetch
source_file: src/knowledge/compiler/ingester/ssrf.ts
category: function
summary: A fetch wrapper that prevents redirects to private or internal URLs, mitigating redirect-based SSRF bypasses.
title: ssrfSafeFetch
entity_type: api
search_terms:
 - SSRF protection
 - server-side request forgery
 - safe fetch function
 - prevent internal redirects
 - secure URL fetching
 - block private IP access
 - cloud metadata endpoint protection
 - RFC 1918 fetch
 - loopback request prevention
 - how to prevent SSRF
 - redirect bypass
 - secure network requests
 - fetch wrapper
stub: false
compiled_at: 2026-04-24T17:39:39.561Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/ssrf.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`ssrfSafeFetch` is a security-hardened wrapper around the standard `fetch` API. Its primary purpose is to mitigate Server-Side Request Forgery (SSRF) vulnerabilities that arise from [HTTP redirects](../concepts/http-redirects.md) [Source 1].

In a redirect-based SSRF attack, an application might fetch a seemingly safe, public URL. However, the server for that URL can respond with an HTTP redirect (e.g., status code 302) that points to a sensitive internal resource, such as a private IP address or a cloud provider's metadata service. The `ssrfSafeFetch` function prevents this by validating the URL of each redirect, ensuring it does not point to a private or internal address [Source 1].

This function should be used in place of the standard `fetch` API whenever an application needs to retrieve content from untrusted or external URLs, such as those provided by users or discovered in web content. It is part of a suite of SSRF prevention [Utilities](../subsystems/utilities.md) used by YAAF's network-facing components, like the knowledge base [Ingester](./ingester.md) [Source 1].

## Signature

The function signature is identical to the standard `fetch` API.

```typescript
export async function ssrfSafeFetch(
  url: string,
  init?: RequestInit,
): Promise<Response>;
```

### Parameters

-   `url` (string): The URL of the resource to fetch.
-   `init` (RequestInit, optional): An object containing any custom settings to apply to the request, such as method, headers, body, etc. This is the same as the `init` object in the standard `fetch` API.

### Returns

-   `Promise<Response>`: A `Promise` that resolves to the `Response` object representing the response to the request. If a redirect to a blocked URL is attempted, the promise will reject with an `Error`.

## Examples

The following example demonstrates how to use `ssrfSafeFetch` to safely retrieve content from an external URL. The usage is identical to the standard `fetch` API, but with the added protection against malicious redirects.

```typescript
import { ssrfSafeFetch } from 'yaaf';

async function fetchUntrustedContent(url: string) {
  try {
    // Use ssrfSafeFetch instead of the global fetch
    const response = await ssrfSafeFetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.text();
    console.log('Successfully fetched content:', data.substring(0, 100));
  } catch (error) {
    // This block will catch network errors and blocked SSRF attempts
    console.error('Fetch failed or was blocked:', error);
  }
}

// Example with a potentially malicious URL
const userProvidedUrl = 'http://example.com/resource-that-redirects-to-internal-ip';
fetchUntrustedContent(userProvidedUrl);
```

## See Also

-   `validateUrlForSSRF`: A related utility function that performs synchronous and asynchronous checks on a URL string to validate it against SSRF attack vectors without performing a fetch operation [Source 1].
-   `isPrivateHost`: A utility function to check if a given hostname resolves to a private or internal IP address [Source 1].

## Sources

[Source 1] src/knowledge/compiler/ingester/ssrf.ts