---
summary: A web mechanism that can be exploited for Server-Side Request Forgery (SSRF) bypasses, which YAAF mitigates through specialized fetch utilities.
title: HTTP redirects
entity_type: concept
related_subsystems:
 - SSRF Protection
see_also:
 - Server-Side Request Forgery (SSRF)
 - ssrfSafeFetch
search_terms:
 - redirect SSRF bypass
 - "302 redirect vulnerability"
 - how to handle redirects securely
 - server side request forgery redirect
 - ssrfSafeFetch usage
 - URL validation limitations
 - cloud metadata endpoint attack
 - preventing redirect attacks
 - HTTP 301 security
 - HTTP 302 security
 - safe fetching untrusted URLs
 - open redirect vulnerability
stub: false
compiled_at: 2026-04-25T00:19:57.420Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/ssrf.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

An HTTP redirect is a mechanism for making a web page available under more than one URL address. When a browser or client requests a URL that has been redirected, the server responds with a status code (such as 301, 302, or 307) and a `Location` header containing the new URL. The client is then expected to make a new request to this new URL.

In the context of YAAF, HTTP redirects are a significant security consideration, particularly as a vector for bypassing [Server-Side Request Forgery (SSRF)](./server-side-request-forgery-ssrf.md) protections. An attacker can provide a URL that appears safe and passes initial validation checks, but the server at that URL is configured to immediately redirect the request to a sensitive, internal endpoint, such as a cloud provider's metadata service (e.g., `http://169.254.169.254/latest/meta-data/`) [Source 1]. This technique can circumvent security measures that only validate the initial URL provided by the user.

## How It Works in YAAF

YAAF's [SSRF Protection](../subsystems/ssrf-protection.md) subsystem acknowledges that simple, pre-flight URL validation is insufficient to prevent redirect-based attacks. Utilities like `validateUrlForSSRF` are designed to check a URL string before a request is made, but they have a known limitation: they cannot inspect the redirect chain that occurs during the actual HTTP request [Source 1].

To address this vulnerability, YAAF provides the [ssrfSafeFetch](../apis/ssrf-safe-fetch.md) API. This function is a wrapper around the standard `fetch()` API and is intended for use with any untrusted, external URLs. It works by intercepting any HTTP redirect responses (like a 302 status code) and validating the URL in the `Location` header before following it. If a redirect targets a private, internal, or otherwise blocked address, `ssrfSafeFetch` will terminate the request, preventing the SSRF attack [Source 1]. This ensures that both the initial URL and any subsequent URLs in a redirect chain are vetted against the framework's security policies.

## See Also

- [Server-Side Request Forgery (SSRF)](./server-side-request-forgery-ssrf.md)
- [ssrfSafeFetch](../apis/ssrf-safe-fetch.md)
- [SSRF Protection](../subsystems/ssrf-protection.md)

## Sources

[Source 1]: src/knowledge/compiler/ingester/ssrf.ts