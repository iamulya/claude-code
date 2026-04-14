/**
 * Security Module Test Suite — Part 3 (Score Push 8.5→9.3)
 *
 * Tests the three additional hardening components:
 * - InputAnomalyDetector (statistical injection defense)
 * - StructuredOutputValidator (schema-based output enforcement)
 * - SecurityAuditLog (centralized compliance logging)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  InputAnomalyDetector,
  inputAnomalyDetector,
  StructuredOutputValidator,
  structuredOutputValidator,
  SecurityAuditLog,
  securityAuditLog,
} from '../security/index.js'
import type { ChatMessage, ChatResult } from '../agents/runner.js'

// ── Helpers ──────────────────────────────────────────────────────────────────

function userMsg(content: string): ChatMessage {
  return { role: 'user', content }
}

function toolMsg(content: string): ChatMessage {
  return { role: 'tool', content } as ChatMessage
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// InputAnomalyDetector
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('InputAnomalyDetector', () => {
  describe('length checks', () => {
    it('passes normal-length messages', () => {
      const detector = new InputAnomalyDetector()
      const result = detector.analyze([userMsg('Hello, how are you?')])
      expect(result.detected).toBe(false)
      expect(result.blocked).toBe(false)
    })

    it('warns on long messages', () => {
      const detector = new InputAnomalyDetector({ maxInputLength: 100 })
      const result = detector.analyze([userMsg('a'.repeat(150))])
      expect(result.detected).toBe(true)
      expect(result.events.some(e => e.type === 'length_warning')).toBe(true)
    })

    it('blocks messages exceeding hard limit', () => {
      const detector = new InputAnomalyDetector({ hardMaxInputLength: 500 })
      const result = detector.analyze([userMsg('x'.repeat(600))])
      expect(result.blocked).toBe(true)
      expect(result.events.some(e => e.type === 'length_blocked')).toBe(true)
    })
  })

  describe('entropy analysis', () => {
    it('detects low entropy (padding attacks)', () => {
      const detector = new InputAnomalyDetector({ minEntropy: 2.0 })
      // Repeating the same few characters = low entropy
      const padded = 'aaaa '.repeat(50)
      const result = detector.analyze([userMsg(padded)])
      expect(result.events.some(e => e.type === 'low_entropy')).toBe(true)
    })

    it('detects high entropy (encoded payloads)', () => {
      const detector = new InputAnomalyDetector({ maxEntropy: 4.0 })
      // Random-looking bytes = high entropy
      let random = ''
      for (let i = 0; i < 200; i++) {
        random += String.fromCharCode(33 + (i * 17 + i * i * 7) % 94)
      }
      const result = detector.analyze([userMsg(random)])
      expect(result.events.some(e => e.type === 'high_entropy')).toBe(true)
    })

    it('passes normal English text', () => {
      const detector = new InputAnomalyDetector()
      const text = 'The quick brown fox jumps over the lazy dog. This is a normal English sentence with reasonable entropy. Nothing suspicious here at all, just regular conversational text about everyday topics.'
      const result = detector.analyze([userMsg(text)])
      expect(result.events.filter(e => e.type === 'low_entropy' || e.type === 'high_entropy')).toHaveLength(0)
    })
  })

  describe('invisible character detection', () => {
    it('detects high invisible char ratio', () => {
      const detector = new InputAnomalyDetector({ maxInvisibleRatio: 0.02 })
      // Insert zero-width chars
      let text = 'normal text'
      for (let i = 0; i < 10; i++) {
        text += '\u200b\u200c\u200d' // zero-width space, non-joiner, joiner
      }
      const result = detector.analyze([userMsg(text)])
      expect(result.events.some(e => e.type === 'invisible_chars')).toBe(true)
    })

    it('passes text without invisible chars', () => {
      const detector = new InputAnomalyDetector()
      const result = detector.analyze([userMsg('Just normal text here.')])
      expect(result.events.filter(e => e.type === 'invisible_chars')).toHaveLength(0)
    })
  })

  describe('repetition detection', () => {
    it('detects repetitive flooding', () => {
      const detector = new InputAnomalyDetector({ maxRepetitionRatio: 0.3 })
      const repeated = 'IGNORE THIS '.repeat(50) // very repetitive
      const result = detector.analyze([userMsg(repeated)])
      expect(result.events.some(e => e.type === 'repetition')).toBe(true)
    })
  })

  describe('mixed script detection', () => {
    it('detects 3+ writing scripts', () => {
      const detector = new InputAnomalyDetector()
      // Latin + Cyrillic + CJK
      const text = 'Hello Привет 你好 this is normal'
      const result = detector.analyze([userMsg(text)])
      expect(result.events.some(e => e.type === 'mixed_scripts')).toBe(true)
    })

    it('passes single-script text', () => {
      const detector = new InputAnomalyDetector()
      const result = detector.analyze([userMsg('Just English text here.')])
      expect(result.events.filter(e => e.type === 'mixed_scripts')).toHaveLength(0)
    })
  })

  describe('hook integration', () => {
    it('blocks via beforeLLM hook', () => {
      const detector = new InputAnomalyDetector({ hardMaxInputLength: 100 })
      const hook = detector.hook()
      const result = hook([userMsg('x'.repeat(200))])
      expect(result).toBeDefined()
      expect(result![0].content).toBe('[Message blocked: input anomaly detected]')
    })

    it('passes normal messages through', () => {
      const detector = new InputAnomalyDetector()
      const hook = detector.hook()
      const result = hook([userMsg('Normal message')])
      expect(result).toBeUndefined()
    })
  })

  describe('callbacks', () => {
    it('fires onAnomaly callback', () => {
      const events: string[] = []
      const detector = new InputAnomalyDetector({
        maxInputLength: 10,
        onAnomaly: (e) => events.push(e.type),
      })
      detector.analyze([userMsg('a message longer than 10 chars')])
      expect(events).toContain('length_warning')
    })
  })

  describe('tool messages', () => {
    it('scans tool results too', () => {
      const detector = new InputAnomalyDetector({ hardMaxInputLength: 50 })
      const result = detector.analyze([toolMsg('x'.repeat(100))])
      expect(result.blocked).toBe(true)
    })

    it('skips system and assistant messages', () => {
      const detector = new InputAnomalyDetector({ hardMaxInputLength: 10 })
      const msg: ChatMessage = { role: 'assistant', content: 'x'.repeat(100) }
      const result = detector.analyze([msg])
      expect(result.detected).toBe(false)
    })
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// StructuredOutputValidator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('StructuredOutputValidator', () => {
  describe('length validation', () => {
    it('passes outputs within length limit', () => {
      const validator = new StructuredOutputValidator({ maxOutputLength: 1000 })
      const result = validator.validate('Short response.')
      expect(result.valid).toBe(true)
    })

    it('flags outputs exceeding length limit', () => {
      const validator = new StructuredOutputValidator({ maxOutputLength: 50 })
      const result = validator.validate('x'.repeat(100))
      expect(result.valid).toBe(false)
      expect(result.violations[0]!.rule).toBe('maxLength')
    })
  })

  describe('field validation', () => {
    it('validates required fields', () => {
      const validator = new StructuredOutputValidator({
        rules: [
          { field: 'name', type: 'string', required: true },
          { field: 'age', type: 'number', required: true },
        ],
      })
      const result = validator.validate('{"name": "Alice"}')
      expect(result.violations.some(v => v.field === 'age' && v.rule === 'required')).toBe(true)
    })

    it('validates string type', () => {
      const validator = new StructuredOutputValidator({
        rules: [{ field: 'name', type: 'string' }],
      })
      const result = validator.validate('{"name": 123}')
      expect(result.violations.some(v => v.field === 'name' && v.rule === 'type')).toBe(true)
    })

    it('validates number ranges', () => {
      const validator = new StructuredOutputValidator({
        rules: [{ field: 'score', type: 'number', min: 0, max: 100 }],
      })
      const result = validator.validate('{"score": 150}')
      expect(result.violations.some(v => v.field === 'score' && v.rule === 'max')).toBe(true)
    })

    it('validates enum values', () => {
      const validator = new StructuredOutputValidator({
        rules: [{ field: 'status', type: 'enum', allowedValues: ['active', 'inactive'] }],
      })
      const result = validator.validate('{"status": "deleted"}')
      expect(result.violations.some(v => v.field === 'status' && v.rule === 'enum')).toBe(true)
    })

    it('validates nested fields', () => {
      const validator = new StructuredOutputValidator({
        rules: [{ field: 'address.city', type: 'string', required: true }],
      })
      const result = validator.validate('{"address": {"city": "NYC"}}')
      expect(result.valid).toBe(true)
    })

    it('validates URL fields', () => {
      const validator = new StructuredOutputValidator({
        rules: [{ field: 'website', type: 'url' }],
      })
      expect(validator.validate('{"website": "https://example.com"}').valid).toBe(true)
      expect(validator.validate('{"website": "not-a-url"}').violations.length).toBeGreaterThan(0)
    })

    it('validates email fields', () => {
      const validator = new StructuredOutputValidator({
        rules: [{ field: 'email', type: 'email' }],
      })
      expect(validator.validate('{"email": "user@example.com"}').valid).toBe(true)
      expect(validator.validate('{"email": "invalid"}').violations.length).toBeGreaterThan(0)
    })

    it('validates string patterns', () => {
      const validator = new StructuredOutputValidator({
        rules: [{ field: 'code', type: 'string', pattern: /^[A-Z]{3}-\d{4}$/ }],
      })
      expect(validator.validate('{"code": "ABC-1234"}').valid).toBe(true)
      expect(validator.validate('{"code": "abc-12"}').violations.length).toBeGreaterThan(0)
    })

    it('validates string maxLength', () => {
      const validator = new StructuredOutputValidator({
        rules: [{ field: 'bio', type: 'string', maxLength: 10 }],
      })
      expect(validator.validate('{"bio": "Very long biography text"}').violations.length).toBeGreaterThan(0)
    })
  })

  describe('JSON in markdown code blocks', () => {
    it('extracts and validates JSON from ```json blocks', () => {
      const validator = new StructuredOutputValidator({
        rules: [{ field: 'status', type: 'enum', allowedValues: ['ok', 'error'] }],
      })
      const output = 'Here is the result:\n```json\n{"status": "unknown"}\n```'
      const result = validator.validate(output)
      expect(result.violations.some(v => v.field === 'status')).toBe(true)
    })
  })

  describe('URL validation', () => {
    it('validates URLs in text', () => {
      const validator = new StructuredOutputValidator({
        validateUrls: true,
        allowedDomains: ['example.com', 'docs.example.com'],
      })
      const result = validator.validate('Check out https://evil.com/phishing and https://example.com/page')
      expect(result.violations.some(v => v.rule === 'domain_not_allowed')).toBe(true)
    })

    it('passes URLs from allowed domains', () => {
      const validator = new StructuredOutputValidator({
        validateUrls: true,
        allowedDomains: ['example.com'],
      })
      const result = validator.validate('Visit https://example.com/page for more info.')
      expect(result.valid).toBe(true)
    })
  })

  describe('hook integration', () => {
    it('creates afterLLM hook', () => {
      const validator = structuredOutputValidator({ maxOutputLength: 10, onViolation: 'reject' })
      const hook = validator.hook()
      const result = hook({ content: 'x'.repeat(100), finishReason: 'stop' }, 0)
      expect(result).toEqual({
        action: 'override',
        content: expect.stringContaining('rejected by output validation'),
      })
    })

    it('passes valid output', () => {
      const validator = structuredOutputValidator()
      const hook = validator.hook()
      const result = hook({ content: 'Normal output.', finishReason: 'stop' }, 0)
      expect(result).toEqual({ action: 'continue' })
    })
  })

  describe('callbacks', () => {
    it('fires onValidation callback', () => {
      const events: boolean[] = []
      const validator = new StructuredOutputValidator({
        onValidation: (e) => events.push(e.valid),
      })
      validator.validate('Some output')
      expect(events).toEqual([true])
    })
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SecurityAuditLog
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('SecurityAuditLog', () => {
  describe('logging', () => {
    it('logs events with correct structure', () => {
      const log = new SecurityAuditLog()
      const entry = log.log('warning', 'prompt_injection', 'PromptGuard', 'Injection detected')
      expect(entry.id).toMatch(/^audit_/)
      expect(entry.severity).toBe('warning')
      expect(entry.category).toBe('prompt_injection')
      expect(entry.source).toBe('PromptGuard')
      expect(entry.timestamp).toBeInstanceOf(Date)
    })

    it('shorthand methods work', () => {
      const log = new SecurityAuditLog()
      const info = log.info('pii_detected', 'PiiRedactor', 'Found email')
      const warn = log.warn('rate_limited', 'RateLimiter', 'User exceeded budget')
      const crit = log.critical('canary_triggered', 'PromptGuard', 'Canary extracted')

      expect(info.severity).toBe('info')
      expect(warn.severity).toBe('warning')
      expect(crit.severity).toBe('critical')
    })

    it('attaches userId and sessionId', () => {
      const log = new SecurityAuditLog({ sessionId: 'sess-1' })
      const entry = log.info('access_denied', 'IAM', 'Unauthorized', { userId: 'alice' })
      expect(entry.userId).toBe('alice')
      expect(entry.sessionId).toBe('sess-1')
    })
  })

  describe('eviction', () => {
    it('evicts oldest entries when exceeding maxEntries', () => {
      const log = new SecurityAuditLog({ maxEntries: 5 })
      for (let i = 0; i < 10; i++) {
        log.info('custom', 'test', `Event ${i}`)
      }
      expect(log.count).toBe(5)
    })
  })

  describe('severity filtering', () => {
    it('filters by minimum severity', () => {
      const log = new SecurityAuditLog({ minSeverity: 'warning' })
      log.info('custom', 'test', 'Info event') // should be filtered
      log.warn('custom', 'test', 'Warning event')
      log.critical('custom', 'test', 'Critical event')
      expect(log.count).toBe(2) // only warning + critical
    })
  })

  describe('querying', () => {
    it('queries by category', () => {
      const log = new SecurityAuditLog()
      log.warn('prompt_injection', 'PG', 'Injection 1')
      log.info('pii_detected', 'PIR', 'PII found')
      log.warn('prompt_injection', 'PG', 'Injection 2')

      const results = log.query({ category: 'prompt_injection' })
      expect(results).toHaveLength(2)
    })

    it('queries by severity', () => {
      const log = new SecurityAuditLog()
      log.info('custom', 'test', 'Info')
      log.warn('custom', 'test', 'Warning')
      log.critical('custom', 'test', 'Critical')

      const results = log.query({ severity: 'warning' })
      expect(results).toHaveLength(2) // warning + critical
    })

    it('queries by userId', () => {
      const log = new SecurityAuditLog()
      log.info('custom', 'test', 'Event 1', { userId: 'alice' })
      log.info('custom', 'test', 'Event 2', { userId: 'bob' })
      log.info('custom', 'test', 'Event 3', { userId: 'alice' })

      expect(log.query({ userId: 'alice' })).toHaveLength(2)
    })

    it('queries with limit', () => {
      const log = new SecurityAuditLog()
      for (let i = 0; i < 20; i++) {
        log.info('custom', 'test', `Event ${i}`)
      }
      expect(log.query({ limit: 5 })).toHaveLength(5)
    })
  })

  describe('statistics', () => {
    it('produces accurate stats', () => {
      const log = new SecurityAuditLog()
      log.info('pii_detected', 'PiiRedactor', 'Found email', { userId: 'alice' })
      log.warn('prompt_injection', 'PromptGuard', 'Injection', { userId: 'alice' })
      log.critical('rate_limited', 'RateLimiter', 'Budget exceeded', { userId: 'bob' })

      const stats = log.stats()
      expect(stats.totalEntries).toBe(3)
      expect(stats.bySeverity.info).toBe(1)
      expect(stats.bySeverity.warning).toBe(1)
      expect(stats.bySeverity.critical).toBe(1)
      expect(stats.byCategory['prompt_injection']).toBe(1)
      expect(stats.topUsers).toHaveLength(2)
      expect(stats.timeRange).not.toBeNull()
    })
  })

  describe('export', () => {
    it('exports as NDJSON', () => {
      const log = new SecurityAuditLog()
      log.info('custom', 'test', 'Event 1')
      log.warn('custom', 'test', 'Event 2')

      const ndjson = log.toNDJSON()
      const lines = ndjson.split('\n')
      expect(lines).toHaveLength(2)
      expect(() => JSON.parse(lines[0]!)).not.toThrow()
    })

    it('exports as JSON array', () => {
      const log = new SecurityAuditLog()
      log.info('custom', 'test', 'Event 1')
      const json = log.toJSON()
      expect(json).toHaveLength(1)
    })

    it('clears entries', () => {
      const log = new SecurityAuditLog()
      log.info('custom', 'test', 'Event')
      log.clear()
      expect(log.count).toBe(0)
    })
  })

  describe('real-time forwarding', () => {
    it('fires onEntry callback', () => {
      const received: string[] = []
      const log = new SecurityAuditLog({
        onEntry: (entry) => received.push(entry.summary),
      })
      log.info('custom', 'test', 'Hello')
      expect(received).toEqual(['Hello'])
    })
  })

  describe('integration callbacks', () => {
    it('creates middleware callback functions', () => {
      const log = new SecurityAuditLog()
      const callbacks = log.createCallbacks('user-1')

      callbacks.promptGuard({ patternName: 'injection', severity: 'high', action: 'blocked' })
      callbacks.piiRedactor({ category: 'email', direction: 'input', count: 2, action: 'redacted' })
      callbacks.rateLimiter({ userId: 'user-1', resource: 'cost', action: 'blocked', current: 10, limit: 5 })

      expect(log.count).toBe(3)
      expect(log.query({ category: 'prompt_injection' })).toHaveLength(1)
      expect(log.query({ category: 'pii_redacted' })).toHaveLength(1)
      expect(log.query({ category: 'rate_limited' })).toHaveLength(1)
    })
  })

  describe('factory', () => {
    it('creates audit log via factory', () => {
      const log = securityAuditLog()
      expect(log.name).toBe('security-audit-log')
    })
  })
})
