import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { vi } from 'vitest'
import { getToday } from '../lib/date'

// Sessions before 4am count as the previous calendar day.

function setTime(isoString) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(isoString))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('getToday — 4am rollover', () => {
  it('returns correct date at noon', () => {
    setTime('2025-03-15T12:00:00')
    expect(getToday()).toBe('2025-03-15')
  })

  it('at 1am, returns the previous calendar day', () => {
    setTime('2025-03-15T01:00:00')
    expect(getToday()).toBe('2025-03-14')
  })

  it('at 3:59am, still returns the previous calendar day', () => {
    setTime('2025-03-15T03:59:00')
    expect(getToday()).toBe('2025-03-14')
  })

  it('at exactly 4:00am, returns the current calendar day', () => {
    setTime('2025-03-15T04:00:00')
    expect(getToday()).toBe('2025-03-15')
  })

  it('rolls month boundary correctly — 1am on March 1 → Feb 28', () => {
    setTime('2025-03-01T01:00:00')
    expect(getToday()).toBe('2025-02-28')
  })

  it('rolls year boundary correctly — 1am on Jan 1 → Dec 31', () => {
    setTime('2025-01-01T01:00:00')
    expect(getToday()).toBe('2024-12-31')
  })

  it('returns YYYY-MM-DD format', () => {
    setTime('2025-03-05T12:00:00')
    expect(getToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
