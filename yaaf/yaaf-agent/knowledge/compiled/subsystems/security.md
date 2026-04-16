---
title: Security Subsystem
entity_type: subsystem
summary: The YAAF subsystem dedicated to protecting agents from malicious inputs, prompt injection, and operational anomalies.
primary_files:
  - src/security/groundingValidator.ts
  - src/security/inputAnomalyDetector.ts
  - src/security/piiRedactor.ts
  - src/security/trustPolicy.ts
exports:
  - GroundingValidator
  - InputAnomalyDetector
  - PiiRedactor
  - TrustPolicy
stub: false
compiled_at: 2026-04-16T14:34:04.529Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/groundingValidator.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/inputAnomalyDetector.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/piiRedactor.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/trustPolicy.ts
confidence: 0.95
---

## Purpose
The Security Subsystem provides a multi-layered defense architecture for LLM-powered agents. It addresses four primary security and reliability concerns:
1.  **Input Integrity**: Detecting malicious patterns and prompt injection attempts through statistical analysis.
2.  **Data Privacy**: Preventing the leakage of Personally Identifiable Information (PII) in both user inputs and LLM responses.
3.  **Output Reliability**: Reducing hallucinations by cross-referencing LLM claims against factual tool results.
4.  **Supply Chain Security**: Verifying the integrity of external plugins and Model Context Protocol (MCP) servers.

## Architecture
The subsystem is composed of four independent but complementary components that typically operate as middleware within the agent's execution lifecycle.

### GroundingValidator
The `GroundingValidator` serves as an anti-hallucination mechanism. It analyzes LLM responses by breaking them into factual claims and comparing them against the "evidence" provided by tool outputs in the conversation history. It uses a lightweight keyword/phrase overlap algorithm rather than secondary LLM calls to maintain performance.

### InputAnomalyDetector
This component performs statistical anomaly detection on incoming messages. It identifies patterns that correlate with prompt injection or bypass attempts, such as:
*   **Token Entropy**: Detecting encoded or encrypted payloads via Shannon entropy spikes.
*   **Structural Anomalies**: Identifying repetition patterns (padding attacks) or high densities of invisible/non-printable characters.
*   **Language Mixing**: Detecting sudden script or language switches within a single message.

### PiiRedactor
A bidirectional scanner that identifies and masks sensitive data. It supports built-in categories like credit card numbers (Luhn-validated), API keys, SSNs, and IBANs. It can be configured to run before the LLM (to protect outgoing data) or after the LLM (to scrub sensitive information from the response).

### TrustPolicy
The `TrustPolicy` manages the integrity of the agent's extensible environment. It verifies SHA-256 hashes of plugin entry files and enforces allowlists/blocklists on tools exposed by MCP servers.

## Integration Points
The Security Subsystem primarily integrates with the agent runner through the hooks system:
*   **beforeLLM**: Used by `PiiRedactor` and `InputAnomalyDetector` to scrub or block malicious/sensitive input before it reaches the model.
*   **afterLLM**: Used by `GroundingValidator` and `PiiRedactor` to validate or redact the model's generated response.
*   **Plugin Loading**: Used by `TrustPolicy` to intercept and verify modules before they are initialized.

## Key APIs

### GroundingValidator
Validates responses against tool evidence.
*   `groundingValidator(config)`: Factory function for standard validation.
*   `strictGroundingValidator(config)`: Factory function for high-integrity environments where ungrounded responses are automatically overridden.

### InputAnomalyDetector
Analyzes message metadata and content for statistical outliers.
*   `InputAnomalyDetector`: Class that evaluates `ChatMessage` arrays for length, entropy, and repetition anomalies.

### PiiRedactor
Detects and masks sensitive information.
*   `piiRedactor(config)`: Factory function for standard redaction.
*   `strictPiiRedactor(config)`: Factory function that enables all categories in strict mode.

### TrustPolicy
Enforces integrity constraints on extensions.
*   `trustPolicy(config)`: Factory function to define SHA-256 hashes and MCP tool filters.

## Configuration
Security components are configured via specialized configuration objects passed during instantiation.

### Grounding Configuration
```typescript
const validator = new GroundingValidator({
  mode: 'annotate', // Options: 'warn' | 'annotate' | 'strict'
  minCoverage: 0.3,  // 30% of sentences must be grounded
  minOverlapTokens: 3
});
```

### PII Redaction Configuration
```typescript
const redactor = new PiiRedactor({
  mode: 'redact',
  categories: ['email', 'api_key', 'credit_card'],
  redactTemplate: '[REDACTED:{type}]'
});
```

### Trust Policy Configuration
```typescript
const trust = new TrustPolicy({
  mode: 'strict',
  plugins: {
    'official-plugin': { sha256: '...' }
  },
  mcpServers: {
    'untrusted-server': { allowedTools: ['read_only_tool'] }
  }
});
```

## Extension Points
The subsystem allows for developer extensions in several areas:
*   **Custom PII Patterns**: Developers can provide `CustomPiiPattern` objects containing a regex and an optional validation function to the `PiiRedactor`.
*   **Anomaly Hooks**: The `onAnomaly` callback in `InputAnomalyDetector` allows for custom logging or external alerting when suspicious patterns are detected.
*   **Grounding Assessments**: The `onAssessment` callback provides detailed sentence-level breakdowns of how the `GroundingValidator` scored a response.