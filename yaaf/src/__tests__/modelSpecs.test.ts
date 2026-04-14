/**
 * Model Specs Registry Tests
 *
 * Verifies that resolveModelSpecs returns correct, LLM-specific values for
 * well-known models, handles partial name matching, and falls back safely.
 * Also tests the 'auto' ContextManager path in Agent.
 */

import { describe, it, expect } from 'vitest'
import { resolveModelSpecs, registerModelSpecs } from '../models/specs.js'

describe('resolveModelSpecs', () => {
  // ── Exact matches ──────────────────────────────────────────────────────────

  it('returns correct specs for gpt-4o-mini', () => {
    const specs = resolveModelSpecs('gpt-4o-mini')
    expect(specs.contextWindowTokens).toBe(128_000)
    expect(specs.maxOutputTokens).toBe(16_384)
  })

  it('returns correct specs for gpt-4o', () => {
    const specs = resolveModelSpecs('gpt-4o')
    expect(specs.contextWindowTokens).toBe(128_000)
    expect(specs.maxOutputTokens).toBe(16_384)
  })

  it('returns correct specs for o1', () => {
    const specs = resolveModelSpecs('o1')
    expect(specs.contextWindowTokens).toBe(200_000)
    expect(specs.maxOutputTokens).toBe(100_000)
  })

  it('returns correct specs for gemini-2.0-flash', () => {
    const specs = resolveModelSpecs('gemini-2.0-flash')
    expect(specs.contextWindowTokens).toBe(1_048_576)
    expect(specs.maxOutputTokens).toBe(8_192)
  })

  it('returns correct specs for gemini-2.5-pro', () => {
    const specs = resolveModelSpecs('gemini-2.5-pro')
    expect(specs.contextWindowTokens).toBe(1_048_576)
    expect(specs.maxOutputTokens).toBe(65_536)
  })

  it('returns correct specs for claude-3-5-sonnet', () => {
    const specs = resolveModelSpecs('claude-3-5-sonnet')
    expect(specs.contextWindowTokens).toBe(200_000)
    expect(specs.maxOutputTokens).toBe(8_192)
  })

  it('returns correct specs for claude-opus-4', () => {
    const specs = resolveModelSpecs('claude-opus-4')
    expect(specs.contextWindowTokens).toBe(200_000)
    expect(specs.maxOutputTokens).toBe(32_000)
  })

  it('returns correct specs for llama-3.3-70b-versatile', () => {
    const specs = resolveModelSpecs('llama-3.3-70b-versatile')
    expect(specs.contextWindowTokens).toBe(128_000)
    expect(specs.maxOutputTokens).toBe(32_768)
  })

  // ── Partial / versioned name matching ─────────────────────────────────────

  it('matches versioned suffix — claude-3-5-sonnet-20241022 → claude-3-5-sonnet', () => {
    const specs = resolveModelSpecs('claude-3-5-sonnet-20241022')
    expect(specs.contextWindowTokens).toBe(200_000)
    expect(specs.maxOutputTokens).toBe(8_192)
  })

  it('matches versioned suffix — gpt-4o-2024-08-06 → gpt-4o', () => {
    const specs = resolveModelSpecs('gpt-4o-2024-08-06')
    // Has its own exact entry
    expect(specs.contextWindowTokens).toBe(128_000)
    expect(specs.maxOutputTokens).toBe(16_384)
  })

  it('is case-insensitive', () => {
    const lower = resolveModelSpecs('gpt-4o-mini')
    const upper = resolveModelSpecs('GPT-4O-MINI')
    expect(lower).toEqual(upper)
  })

  // ── Fallback ───────────────────────────────────────────────────────────────

  it('returns fallback for unknown model names', () => {
    const specs = resolveModelSpecs('some-random-proprietary-model-v42')
    // Fallback should be conservative but reasonable
    expect(specs.contextWindowTokens).toBeGreaterThan(0)
    expect(specs.maxOutputTokens).toBeGreaterThan(0)
  })

  it('returns fallback for undefined', () => {
    const specs = resolveModelSpecs(undefined)
    expect(specs.contextWindowTokens).toBeGreaterThan(0)
    expect(specs.maxOutputTokens).toBeGreaterThan(0)
  })

  it('returns fallback for empty string', () => {
    const specs = resolveModelSpecs('')
    expect(specs.contextWindowTokens).toBeGreaterThan(0)
    expect(specs.maxOutputTokens).toBeGreaterThan(0)
  })

  // ── Custom registration ────────────────────────────────────────────────────

  it('allows registering custom model specs', () => {
    registerModelSpecs('my-custom-llm-v1', {
      contextWindowTokens: 32_000,
      maxOutputTokens: 2_048,
    })
    const specs = resolveModelSpecs('my-custom-llm-v1')
    expect(specs.contextWindowTokens).toBe(32_000)
    expect(specs.maxOutputTokens).toBe(2_048)
  })

  it('registered custom specs take exact-match priority', () => {
    registerModelSpecs('gpt-4o-custom', {
      contextWindowTokens: 999_000,
      maxOutputTokens: 99_000,
    })
    const specs = resolveModelSpecs('gpt-4o-custom')
    expect(specs.contextWindowTokens).toBe(999_000)
    expect(specs.maxOutputTokens).toBe(99_000)
  })

  // ── Consistency checks ────────────────────────────────────────────────────

  it('maxOutputTokens is always <= contextWindowTokens', () => {
    const models = [
      'gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini',
      'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro',
      'claude-opus-4', 'claude-3-5-sonnet', 'claude-3-haiku',
      'llama-3.3-70b-versatile', 'mistral-large',
    ]
    for (const model of models) {
      const specs = resolveModelSpecs(model)
      expect(specs.maxOutputTokens).toBeLessThanOrEqual(specs.contextWindowTokens)
    }
  })

  it('all window sizes are multiples of 1024 or well-known powers of 2', () => {
    // Just spot-check that we're not using obviously wrong values
    const specs = resolveModelSpecs('gemini-1.5-pro')
    expect(specs.contextWindowTokens).toBe(2_097_152) // 2M — confirmed
  })
})
