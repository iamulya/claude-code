---
primary_files:
 - src/knowledge/compiler/ingester/ssrf.ts
summary: Provides utilities and a secure fetch wrapper to prevent Server-Side Request Forgery (SSRF) attacks in network-facing components.
title: SSRF Prevention Subsystem
entity_type: subsystem
exports:
 - isPrivateHost
 - validateUrlForSSRF
 - ssrfSafeFetch
search_terms:
 - Server-Side Request Forgery
 - prevent SSRF
 - secure fetch
 - URL validation
 - block private IP addresses
 - internal network protection
 - cloud metadata endpoint security
 - RFC 1918 blocking
 - DNS rebinding protection
 - safe URL fetching
 - KBClipper security
 - network-facing component safety
 - egress filtering
stub: false
compiled_at: 2026-04-24T18:19:41.873Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/ssrf.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The SSRF Prevention Subsystem provides shared [Utilities](./utilities.md) for URL validation to protect network-facing components from Server-Side Request Forgery (SSRF) attacks [Source 1]. Its primary function is to block outgoing requests that target private or internal network addresses, preventing an agent from being used to scan or attack internal infrastructure [Source 1].

This subsystem is designed to cover a wide range of SSRF vectors, including [Source 1]:
*   Private IP ranges as defined by RFC 1918 (e.g., `10.0.0.0/8`)
*   Loopback and link-local addresses
*   Cloud provider metadata endpoints for AWS, GCP, and Azure
*   Non-HTTP protocols like `file://` or `ftp://`
*   IP address encoding bypasses (octal, hexadecimal, decimal)
*   IPv6-mapped IPv4 addresses

## Architecture

The subsystem is composed of a set of utility functions that perform layered security checks on URLs and hostnames. It does not have a complex internal class structure but instead relies on a sequence of validation steps [Source 1].

The core validation logic in `validateUrlForSSRF` executes checks in the following order [Source 1]:
1.  **Protocol Check**: Ensures the URL protocol is either `http:` or `https:`.
2.  **Hostname String Check**: Scans the raw hostname string against a blocklist of private ranges and metadata service names.
3.  **Normalized IP Check**: Normalizes the hostname to a standard IP address format to catch and block encoded IPs (e.g., `0x7f000001`).
4.  **DNS Resolution Check**: Resolves the hostname via DNS to verify that the resulting IP address is not a private one.

For handling [HTTP redirects](../concepts/http-redirects.md), which can be a vector for SSRF, the subsystem provides `ssrfSafeFetch`. This function wraps the standard `fetch` API to block any redirect attempts that target a private or internal URL [Source 1].

A known limitation of this subsystem is that it does not, by itself, prevent [DNS rebinding](../concepts/dns-rebinding.md) attacks or all forms of HTTP redirect abuse. The official recommendation is to deploy agents behind a dedicated proxy that validates resolved IPs (such as `ssrf-req-filter`) for comprehensive protection in a production environment [Source 1].

## Integration Points

This subsystem is a shared dependency for any component within the YAAF framework that makes outbound network requests to untrusted URLs. It is primarily used by components in the knowledge [Ingester](../apis/ingester.md), such as the `KBClipper` for fetching web content and the image downloader [Source 1]. Any future network-facing component is expected to use these utilities to ensure secure operation [Source 1].

## Key APIs

The public API surface of this subsystem consists of three main functions exported from `src/knowledge/compiler/ingester/ssrf.ts` [Source 1].

*   `isPrivateHost(hostname: string)`: A boolean function that checks if a given hostname resolves to a private, loopback, link-local, or cloud metadata IP address.
*   `validateUrlForSSRF(url: string)`: An asynchronous function that performs a comprehensive set of SSRF checks on a given URL. It throws an `Error` if the URL is determined to be unsafe.
*   `ssrfSafeFetch(url: string, init?: RequestInit)`: A secure wrapper for the standard `fetch` API. It performs initial validation on the URL and also blocks any subsequent HTTP redirects to private resources, returning a `Promise<Response>`.

## Sources

[Source 1]: src/knowledge/compiler/ingester/ssrf.ts