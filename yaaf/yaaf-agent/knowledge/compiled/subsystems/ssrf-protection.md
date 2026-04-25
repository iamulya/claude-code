---
primary_files:
 - src/knowledge/compiler/ingester/ssrf.ts
title: SSRF Protection
entity_type: subsystem
summary: Provides utilities to validate URLs and perform safe HTTP requests to prevent Server-Side Request Forgery (SSRF) attacks, particularly during knowledge ingestion.
exports:
 - validateUrlForSSRF
 - ssrfSafeFetch
search_terms:
 - server-side request forgery
 - prevent SSRF
 - safe URL fetching
 - validate external URLs
 - knowledge ingestion security
 - downloading external content safely
 - protect against malicious URLs
 - internal network protection
 - localhost access prevention
 - metadata server attack
 - ssrfSafeFetch usage
 - validateUrlForSSRF function
stub: false
compiled_at: 2026-04-24T18:19:48.593Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/images.ts
compiled_from_quality: unknown
confidence: 0.85
---

## Purpose

The SSRF Protection subsystem provides essential security controls to prevent Server-Side Request Forgery (SSRF) attacks. This type of vulnerability occurs [when](../apis/when.md) an attacker can trick the server-side application into making HTTP requests to an arbitrary domain of the attacker's choosing. This subsystem is critical in components that fetch resources from external URLs, such as the knowledge [Ingester](../apis/ingester.md) which downloads images referenced in source documents [Source 1]. Its primary function is to validate that URLs point to legitimate, public internet resources and not to internal network addresses, loopback interfaces, or cloud provider metadata services.

## Architecture

The subsystem is implemented as a collection of utility functions, primarily located in `src/knowledge/compiler/ingester/ssrf.ts`. The core architectural components, as inferred from their usage, are a validation function and a safe fetch wrapper [Source 1].

-   **URL Validator (`validateUrlForSSRF`)**: This function is responsible for inspecting a given URL string or object. It likely checks the resolved IP address against deny lists of private, reserved, and loopback IP ranges (e.g., `10.0.0.0/8`, `127.0.0.1`, `169.254.169.254`).
-   **Safe Fetch Wrapper (`ssrfSafeFetch`)**: This function acts as a secure replacement for the standard `fetch` API. It presumably uses `validateUrlForSSRF` internally to vet the target URL before initiating any network connection, thereby ensuring that all outgoing HTTP requests from the framework are directed to safe, intended destinations.

## Integration Points

The SSRF Protection subsystem is designed to be used by any other part of the YAAF framework that needs to fetch content from a URL that originates from an external or untrusted source.

-   **Knowledge Ingester**: The image processing [Utilities](./utilities.md) within the knowledge ingester pipeline are a key consumer of this subsystem. When resolving an image reference (`![alt](src)`) in a markdown file where the source is a URL, the ingester uses these SSRF protection functions to safely download the image content [Source 1].

## Key APIs

The public API surface of this subsystem consists of two primary functions exported from `src/knowledge/compiler/ingester/ssrf.ts`.

-   **`validateUrlForSSRF`**: A function that takes a URL and performs security checks to mitigate SSRF risks. It is used to pre-validate a URL before attempting to fetch it.
-   **`ssrfSafeFetch`**: A wrapper around the native `fetch` API that incorporates SSRF validation. This should be used in place of direct `fetch` calls when dealing with URLs from untrusted sources.

## Sources

[Source 1]: src/knowledge/compiler/ingester/images.ts