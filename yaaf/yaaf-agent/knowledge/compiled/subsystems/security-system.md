---
title: Security System
entity_type: subsystem
summary: Provides a multi-layered defense system for securing LLM-powered agents against common threats like prompt injection, hallucination, unsafe tool execution, and insecure data handling.
primary_files:
 - src/security/promptGuard.ts
 - src/security/groundingValidator.ts
 - src/security/outputSanitizer.ts
 - src/security/structuredOutputValidator.ts
exports:
 - PromptGuard
 - GroundingValidator
 - OutputSanitizer
 - StructuredOutputValidator
 - SecureStorage
 - Sandbox
 - PermissionPolicy
search_terms:
 - prompt injection defense
 - how to stop prompt injection
 - LLM security
 - agent safety
 - preventing agent hallucination
 - secure storage for agents
 - sandboxing agent tools
 - LLM output validation
 - XSS in LLM output
 - detecting role hijacking
 - canary token
 - grounding LLM responses
 - YAAF security features
 - agent permission management
stub: false
compiled_at: 2026-04-24T18:19:21.008Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/security.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/groundingValidator.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/outputSanitizer.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/promptGuard.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/structuredOutputValidator.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The Security System in YAAF provides a comprehensive suite of [Tools](./tools.md) and components designed to mitigate the unique security risks associated with [LLM](../concepts/llm.md)-powered agents. It offers a [Defense-in-depth](../concepts/defense-in-depth.md) strategy, addressing threats at various stages of the agent's lifecycle: input processing, action execution, output generation, and data storage. The system aims to protect against common vulnerabilities such as [Prompt Injection](../concepts/prompt-injection.md), data leakage, hallucinated or malicious outputs, and unauthorized [Tool Execution](../concepts/tool-execution.md) [Source 1, Source 4].

## Architecture

The Security System is composed of several distinct but complementary components, each targeting a specific aspect of agent security.

### Input Security

**PromptGuard** serves as the primary defense against prompt injection attacks. It operates as a `beforeLLM` hook, inspecting messages before they are sent to the language model. It uses a combination of regex-based pattern matching and an optional LLM-based classifier to detect and neutralize threats [Source 4].

Key features include:
*   **Pattern Detection**: Identifies instruction overrides, role hijacking, encoding attacks, delimiter escapes, and [System Prompt](../concepts/system-prompt.md) extraction attempts.
*   **Modes**: Operates in `detect` mode (logs and warns) or `block` mode (replaces malicious content).
*   **Sensitivity Levels**: Configurable sensitivity (`low`, `medium`, `high`) determines the strictness of the pattern matching.
*   **Canary Tokens**: Can inject a hidden token into the system prompt to detect prompt leakage attacks.
*   **Layer 2 Verification**: An optional LLM-based classifier (`classifyFn`) can be used to semantically verify potential injections flagged by the initial regex scan, reducing false positives [Source 4].

### Execution Security

This layer constrains the agent's actions during runtime, preventing it from performing unauthorized or dangerous operations.

*   **Sandbox**: Restricts tool access to the file system and network. It allows developers to define allowed and blocked paths, set execution timeouts, and optionally block all network access. Convenience factories like `projectSandbox()` and `strictSandbox()` provide pre-configured policies [Source 1].
*   **PermissionPolicy**: A granular system for governing tool execution. It allows developers to define rules to `allow`, `deny`, or `requireApproval` for specific tools or tool patterns (e.g., `read_*`, `write_*`). This ensures that potentially destructive actions require explicit confirmation [Source 1].

### Output Security and Grounding

This layer validates, sanitizes, and fact-checks the LLM's output before it is presented to the user or used in subsequent steps.

*   **GroundingValidator**: Combats model hallucination by ensuring the LLM's responses are grounded in evidence from [tool results](../concepts/tool-results.md). It uses a multi-layered scoring model:
    1.  **[TF-IDF](../concepts/tf-idf.md) Keyword Overlap**: A fast, initial check for token overlap between the response and tool outputs.
    2.  **[Embedding Similarity](../concepts/embedding-similarity.md)**: An optional, more sophisticated check using [Vector Embeddings](../concepts/vector-embeddings.md) to find semantic similarities.
    3.  **[LLM Semantic Scorer](../concepts/llm-semantic-scorer.md)**: An optional final check where another LLM is used to score the semantic consistency of borderline claims [Source 2].
    The validator can operate in `warn`, `annotate` (adds `[ungrounded]` markers), or `strict` (overrides the response) modes [Source 2].

*   **OutputSanitizer**: Cleans LLM responses to prevent downstream security issues like Cross-Site Scripting (XSS). It strips dangerous HTML (`<script>`, `onclick`), sanitizes markdown, validates URLs, and enforces content length limits. It can also detect structural prompt injection patterns that may appear in the LLM's output [Source 3].

*   **StructuredOutputValidator**: Enforces a schema on structured data (e.g., JSON) generated by the LLM. It validates field types, required fields, numeric ranges, and enum values. This prevents downstream systems from processing malformed or unexpected data. It can also be configured to validate all URLs within the output against an allowlist of domains [Source 5].

### Data Security

*   **SecureStorage**: Provides an AES-256-GCM encrypted key-value store for sensitive data like API keys or database credentials. It ensures no plaintext secrets are stored on disk. The encryption key can be derived from an environment variable (recommended for production), a password (for development), or a machine-specific key [Source 1].

### Secure Defaults

YAAF is designed with security in mind, providing safe defaults across the framework. For example, permissions are denied by default, tools are not marked as destructive or read-only unless specified, and storage encryption uses a machine-derived key if no other key is provided [Source 1].

## Integration Points

The security components are designed to integrate seamlessly into the agent's lifecycle, primarily through the hook system and agent configuration.

*   **[Agent Hooks](../concepts/agent-hooks.md)**: `PromptGuard`, `GroundingValidator`, and `OutputSanitizer` are typically used as agent hooks. `PromptGuard` is registered as a `beforeLLM` hook to inspect input, while `GroundingValidator` and `OutputSanitizer` are registered as `afterLLM` hooks to process output [Source 2, Source 3, Source 4].
    ```typescript
    const guard = new PromptGuard({ mode: 'block' });
    const sanitizer = new OutputSanitizer();

    const agent = new Agent({
      hooks: {
        beforeLLM: guard.hook(),
        afterLLM: sanitizer.hook(),
      },
    });
    ```
*   **Agent Configuration**: The `Sandbox` and `PermissionPolicy` are typically configured at the agent or tool host level to constrain tool execution [Source 1].
*   **Standalone [Utilities](./utilities.md)**: Components like `SecureStorage` and `OutputSanitizer` can also be used as standalone utilities outside the agent lifecycle for general-purpose secret management and string sanitization [Source 1, Source 3].

## Key APIs

*   `PromptGuard`: The main class for input injection detection.
*   `GroundingValidator`: The main class for anti-hallucination checks.
*   `OutputSanitizer`: The main class for sanitizing LLM output.
*   `StructuredOutputValidator`: The main class for validating structured LLM output against a schema.
*   `Sandbox`: The class for creating execution sandboxes for tools.
*   `SecureStorage`: The class for encrypted key-value storage.
*   `PermissionPolicy`: The class for defining tool execution permissions.
*   `promptGuard()`, `strictPromptGuard()`: Factory functions for creating `PromptGuard` instances with default or strict configurations [Source 4].
*   `createLLMClassifier()`: A helper function to create a Layer 2 LLM-based classifier for `PromptGuard` [Source 4].
*   `groundingValidator()`, `strictGroundingValidator()`: Factory functions for `GroundingValidator` [Source 2].
*   `outputSanitizer()`, `strictSanitizer()`: Factory functions for `OutputSanitizer` [Source 3].
*   `projectSandbox()`, `strictSandbox()`: Factory functions for creating pre-configured `Sandbox` instances [Source 1].

## Configuration

Configuration of security components is primarily done during their instantiation.

*   **PromptGuard**: Configured with a `mode` (`detect` or `block`) and `sensitivity` (`low`, `medium`, `high`) [Source 4].
*   **GroundingValidator**: Configured with a `mode` (`warn`, `annotate`, `strict`) and thresholds like `minCoverage` and `minOverlapTokens` [Source 2].
*   **OutputSanitizer**: Configured with boolean flags like `stripHtml` and `sanitizeUrls`, and an optional `maxLength` [Source 3].
*   **StructuredOutputValidator**: Configured with an array of `FieldRule` objects defining the expected schema [Source 5].
*   **SecureStorage**: Configured with a `namespace` and a [Key Derivation](../concepts/key-derivation.md) method (environment variable, `password`, or machine key) [Source 1].
*   **Sandbox**: Configured with `allowedPaths`, `blockedPaths`, `timeoutMs`, and `blockNetwork` options [Source 1].

## Extension Points

The Security System provides several points for custom extension and behavior modification.

*   **Custom Patterns**: `PromptGuard` accepts an array of `customPatterns` to allow developers to add their own regex-based injection detectors [Source 4].
*   **Custom Sanitizers**: `OutputSanitizer` accepts a `customSanitizer` function that is applied after all built-in sanitization rules [Source 3].
*   **LLM-based Logic**: Both `PromptGuard` and `GroundingValidator` can be extended with LLM-based logic. `PromptGuard` supports a `classifyFn` for semantic injection analysis, while `GroundingValidator` supports an `llmScorer` for semantic grounding checks [Source 2, Source 4].
*   **Embedding Functions**: `GroundingValidator` can be configured with an `embedFn` to enable semantic grounding checks based on vector similarity, bypassing the need for keyword overlap [Source 2].

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/security.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/groundingValidator.ts
[Source 3]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/outputSanitizer.ts
[Source 4]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/promptGuard.ts
[Source 5]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/structuredOutputValidator.ts