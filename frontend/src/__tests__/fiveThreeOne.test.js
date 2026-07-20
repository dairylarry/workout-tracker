import { describe, it, expect } from 'vitest'
import { getSetsForWeek, getDeloadSets, getFullWaveTable } from '../lib/fiveThreeOne'

const TM = 300 // training max in lbs

describe('getSetsForWeek', () => {
  it('returns 6 sets total (3 warmup + 3 working)', () => {
    expect(getSetsForWeek(1, TM)).toHaveLength(6)
  })

  it('warmup sets are marked isWarmup:true, working sets false', () => {
    const sets = getSetsForWeek(1, TM)
    expect(sets.slice(0, 3).every(s => s.isWarmup)).toBe(true)
    expect(sets.slice(3).every(s => !s.isWarmup)).toBe(true)
  })

  it('week 1 top set is 85% of TM rounded up to nearest 5', () => {
    const sets = getSetsForWeek(1, TM)
    const top = sets[sets.length - 1]
    expect(top.target).toBe(Math.ceil(TM * 0.85 / 5) * 5)
    expect(top.pct).toBe(0.85)
  })

  it('week 2 top set is 90% of TM', () => {
    const sets = getSetsForWeek(2, TM)
    const top = sets[sets.length - 1]
    expect(top.target).toBe(Math.ceil(TM * 0.90 / 5) * 5)
    expect(top.pct).toBe(0.90)
  })

  it('week 3 top set is 95% of TM', () => {
    const sets = getSetsForWeek(3, TM)
    const top = sets[sets.length - 1]
    expect(top.target).toBe(Math.ceil(TM * 0.95 / 5) * 5)
    expect(top.pct).toBe(0.95)
  })

  it('all targets are multiples of 5', () => {
    for (const week of [1, 2, 3]) {
      const sets = getSetsForWeek(week, TM)
      expect(sets.every(s => s.target % 5 === 0)).toBe(true)
    }
  })

  it('warmup percentages are 40/50/60% across all weeks', () => {
    for (const week of [1, 2, 3]) {
      const warmups = getSetsForWeek(week, TM).filter(s => s.isWarmup)
      expect(warmups.map(s => s.pct)).toEqual([0.40, 0.50, 0.60])
    }
  })

  it('week 3 top set weight is higher than week 1 top set', () => {
    const w1top = getSetsForWeek(1, TM).at(-1).target
    const w3top = getSetsForWeek(3, TM).at(-1).target
    expect(w3top).toBeGreaterThan(w1top)
  })
})

describe('getDeloadSets', () => {
  it('returns 3 sets', () => {
    expect(getDeloadSets(TM)).toHaveLength(3)
  })

  it('all sets are not warmup', () => {
    expect(getDeloadSets(TM).every(s => !s.isWarmup)).toBe(true)
  })

  it('uses 40/50/60% of TM', () => {
    const sets = getDeloadSets(TM)
    expect(sets.map(s => s.pct)).toEqual([0.40, 0.50, 0.60])
  })

  it('all targets are multiples of 5', () => {
    expect(getDeloadSets(TM).every(s => s.target % 5 === 0)).toBe(true)
  })

  it('deload top set is lighter than week 1 top working set', () => {
    const deloadTop = getDeloadSets(TM).at(-1).target
    const w1top = getSetsForWeek(1, TM).at(-1).target
    expect(deloadTop).toBeLessThan(w1top)
  })
})

describe('getFullWaveTable', () => {
  it('includes warmup and all 3 weeks', () => {
    const table = getFullWaveTable(TM)
    expect(table.warmup).toHaveLength(3)
    expect(Object.keys(table.weeks)).toEqual(['1', '2', '3'])
  })

  it('week targets match getSetsForWeek working sets', () => {
    const table = getFullWaveTable(TM)
    for (const week of [1, 2, 3]) {
      const fromTable = table.weeks[week].map(s => s.target)
      const fromFn = getSetsForWeek(week, TM).filter(s => !s.isWarmup).map(s => s.target)
      expect(fromTable).toEqual(fromFn)
    }
  })
})
