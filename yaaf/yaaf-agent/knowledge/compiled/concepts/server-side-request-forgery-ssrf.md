---
summary: A web security vulnerability that allows an attacker to induce the server-side application to make HTTP requests to an arbitrary domain of the attacker's choosing.
title: Server-Side Request Forgery (SSRF)
entity_type: concept
related_subsystems:
 - Ingester
search_terms:
 - SSRF prevention
 - block private IP requests
 - validate URL security
 - cloud metadata endpoint attack
 - RFC 1918 validation
 - DNS rebinding vulnerability
 - HTTP redirect vulnerability
 - safe fetch wrapper
 - internal network access vulnerability
 - localhost alias bypass
 - IP address encoding bypass
 - file protocol vulnerability
 - how to prevent agents from accessing internal network
stub: false
compiled_at: 2026-04-24T18:01:47.502Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/ssrf.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Server-Side Request Forgery (SSRF) is a web security vulnerability where an attacker can coerce a server-side application to send requests to an unintended location. In the context of YAAF, components that fetch resources from user-provided URLs, such as the `KBClipper` or image downloaders within the [Ingester](../apis/ingester.md) subsystem, are potential vectors for SSRF attacks [Source 1].

Without preventative measures, an attacker could supply a URL pointing to a private or internal network address. This could allow them to scan the server's internal network, access sensitive cloud provider metadata endpoints, or interact with internal services that are not exposed to the public internet. YAAF incorporates specific [Utilities](../subsystems/utilities.md) to mitigate this risk by blocking requests to such private and internal addresses [Source 1].

## How It Works in YAAF

YAAF provides a set of shared URL validation utilities to protect all network-facing components against SSRF attacks. These utilities are designed to identify and block requests targeting internal or non-public resources [Source 1].

The framework's [SSRF Protection](../subsystems/ssrf-protection.md) covers a wide range of potential attack vectors, including:
*   **Private IP Ranges**: RFC 1918 addresses (e.g., `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
*   **Loopback Addresses**: `127.0.0.0/8` and `::1`.
*   **Link-Local Addresses**: `169.254.0.0/16`.
*   **Cloud Metadata Endpoints**: Known addresses for AWS, GCP, and Azure metadata services.
*   **Unsafe Protocols**: Non-HTTP protocols like `file://` or `ftp://`.
*   **Obfuscated IPs**: IP addresses encoded in octal, hexadecimal, or decimal formats (e.g., `0x7f000001` for `127.0.0.1`).
*   **IPv6-mapped IPv4 Addresses**: Such as `::ffff:127.0.0.1`.
*   **Localhost Aliases** and internal Top-Level Domains (TLDs) [Source 1].

The core implementation consists of several utility functions:

*   `isPrivateHost(hostname: string)`: Checks if a given hostname resolves to a private or internal IP address [Source 1].
*   `validateUrlForSSRF(url: string)`: A comprehensive validation function used by ingester components. It performs checks in the following order:
    1.  Verifies the URL protocol is either `http:` or `https:`.
    2.  Checks the raw hostname string against blocklists.
    3.  Checks the normalized IP address to prevent encoding bypasses.
    4.  Performs a DNS lookup to validate the resolved IP address against private ranges [Source 1].
*   `ssrfSafeFetch(url: string, init?: RequestInit)`: A wrapper for the standard `fetch` API that specifically mitigates SSRF attacks via [HTTP redirects](./http-redirects.md). It prevents a scenario where a seemingly safe public URL returns an HTTP 302 redirect to a private resource, such as a cloud metadata endpoint [Source 1].

It is important to note a known limitation in this layer of defense: it does not fully prevent [DNS rebinding](./dns-rebinding.md) attacks. For comprehensive protection in a production environment, YAAF should be deployed behind a dedicated proxy that validates resolved IP addresses, such as `ssrf-req-filter` or a configured egress proxy [Source 1].

## Sources
[Source 1] src/knowledge/compiler/ingester/ssrf.ts