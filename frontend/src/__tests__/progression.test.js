import { describe, it, expect } from 'vitest'
import { checkProgression } from '../lib/progression'

const RANGE = [8, 10] // typical double-progression rep range

function sets(...pairs) {
  return pairs.map(([weight, reps]) => ({ weight, reps, rir: '2' }))
}

describe('checkProgression', () => {
  it('returns true when first 2 sets hit top of range at same weight', () => {
    expect(checkProgression(sets([135, 10], [135, 10], [135, 8]), RANGE)).toBe(true)
  })

  it('returns false when only 1 set exists', () => {
    expect(checkProgression(sets([135, 10]), RANGE)).toBe(false)
  })

  it('returns false when first set is below top of range', () => {
    expect(checkProgression(sets([135, 9], [135, 10], [135, 10]), RANGE)).toBe(false)
  })

  it('returns false when second set is below top of range', () => {
    expect(checkProgression(sets([135, 10], [135, 9], [135, 10]), RANGE)).toBe(false)
  })

  it('returns true when later sets are below top of range (only first 2 matter)', () => {
    expect(checkProgression(sets([135, 10], [135, 10], [135, 7]), RANGE)).toBe(true)
  })

  it('returns false when first 2 sets are at different weights', () => {
    expect(checkProgression(sets([135, 10], [130, 10], [135, 10]), RANGE)).toBe(false)
  })

  it('returns false when weight is empty string', () => {
    expect(checkProgression(sets(['', 10], ['', 10]), RANGE)).toBe(false)
  })

  it('returns false when weight is null', () => {
    expect(checkProgression([{ weight: null, reps: 10 }, { weight: null, reps: 10 }], RANGE)).toBe(false)
  })

  it('returns false when reps are empty string', () => {
    expect(checkProgression(sets([135, ''], [135, '']), RANGE)).toBe(false)
  })

  it('returns false when sets is null', () => {
    expect(checkProgression(null, RANGE)).toBe(false)
  })

  it('returns false when repRange is null', () => {
    expect(checkProgression(sets([135, 10], [135, 10]), null)).toBe(false)
  })

  it('handles string and number weights as equal (form data is strings)', () => {
    expect(checkProgression(
      [{ weight: '135', reps: '10' }, { weight: 135, reps: 10 }],
      RANGE
    )).toBe(true)
  })

  it('returns true at exactly the top of range (boundary)', () => {
    expect(checkProgression(sets([135, 10], [135, 10]), [10, 10])).toBe(true)
  })

  it('returns false one rep below boundary', () => {
    expect(checkProgression(sets([135, 9], [135, 9]), [10, 10])).toBe(false)
  })
})
