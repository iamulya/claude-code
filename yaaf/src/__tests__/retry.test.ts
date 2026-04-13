/**
 * Retry logic test suite
 *
 * Tests withRetry() for:
 * - Successful first attempt (no retry)
 * - Exponential backoff computation
 * - Retry-After header parsing
 * - Abort signal propagation
 * - Non-retryable error pass-through
 * - RetryExhaustedError wrapping
 */

import { describe, it, expect, vi } from 'vitest'
import {
  withRetry,
  computeRetryDelay,
} from '../utils/retry.js'
import { YAAFError, AbortError, RetryExhaustedError } from '../errors.js'

describe('computeRetryDelay', () => {
  it('computes exponential backoff', () => {
    // Base delay 500ms, attempt 1 → ~500ms (with jitter)
    const d1 = computeRetryDelay(1, 500, 30_000)
    expect(d1).toBeGreaterThanOrEqual(375)
    expect(d1).toBeLessThanOrEqual(625)

    // Attempt 3 → ~2000ms
    const d3 = computeRetryDelay(3, 500, 30_000)
    expect(d3).toBeGreaterThanOrEqual(1500)
    expect(d3).toBeLessThanOrEqual(2500)
  })

  it('caps at maxDelay', () => {
    const d = computeRetryDelay(20, 500, 5_000)
    expect(d).toBeLessThanOrEqual(6_250) // maxDelay + 25% jitter
  })

  it('respects retryAfterMs on error', () => {
    const error = { retryAfterMs: 10_000 }
    const d = computeRetryDelay(1, 500, 30_000, error)
    expect(d).toBe(10_000)
  })

  it('caps retryAfterMs at 4x maxDelay', () => {
    const error = { retryAfterMs: 999_999 }
    const d = computeRetryDelay(1, 500, 30_000, error)
    expect(d).toBe(120_000) // 30000 * 4
  })
})

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success')
    const result = await withRetry(fn)
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on retryable error', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new YAAFError('rate limit', { code: 'RATE_LIMIT', retryable: true }))
      .mockResolvedValue('recovered')

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 1 })
    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('throws immediately on non-retryable error', async () => {
    const fn = vi.fn()
      .mockRejectedValue(new YAAFError('auth failed', { code: 'AUTH_ERROR', retryable: false }))

    await expect(withRetry(fn, { maxRetries: 3 })).rejects.toThrow('auth failed')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('throws RetryExhaustedError after max retries', async () => {
    const fn = vi.fn()
      .mockRejectedValue(new YAAFError('overloaded', { code: 'OVERLOADED', retryable: true }))

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 1 }),
    ).rejects.toThrow(RetryExhaustedError)
    expect(fn).toHaveBeenCalledTimes(3) // 1 initial + 2 retries
  })

  it('throws AbortError when signal is aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    const fn = vi.fn()
    await expect(
      withRetry(fn, { signal: controller.signal }),
    ).rejects.toThrow(AbortError)
    expect(fn).not.toHaveBeenCalled()
  })

  it('calls onRetry callback', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new YAAFError('fail', { code: 'API_ERROR', retryable: true }))
      .mockResolvedValue('ok')

    const onRetry = vi.fn()
    await withRetry(fn, { maxRetries: 3, baseDelayMs: 1, onRetry })
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({
        attempt: 1,
        maxRetries: 3,
      }),
    )
  })

  it('stops retrying when onRetry returns false', async () => {
    const fn = vi.fn()
      .mockRejectedValue(new YAAFError('fail', { code: 'API_ERROR', retryable: true }))

    const onRetry = vi.fn().mockReturnValue(false)

    await expect(
      withRetry(fn, { maxRetries: 5, baseDelayMs: 1, onRetry }),
    ).rejects.toThrow(RetryExhaustedError)
    expect(fn).toHaveBeenCalledTimes(1) // 1 initial attempt, then onRetry returns false → no more
  })
})
