import { describe, it, expect } from 'vitest'
import { resolveSessionTags, resolveHistoryTags, nextTagColor, TAG_COLORS } from '../constants/tags'

describe('resolveSessionTags', () => {
  it('returns tags array for a modern session', () => {
    expect(resolveSessionTags({ tags: ['deload', 'travel'] })).toEqual(['deload', 'travel'])
  })

  it('returns empty array when no tags and no legacy deload field', () => {
    expect(resolveSessionTags({})).toEqual([])
  })

  it('returns empty array for explicit empty tags', () => {
    expect(resolveSessionTags({ tags: [] })).toEqual([])
  })

  // Legacy compat: pre-tag sessions stored deload as a boolean
  it('promotes legacy deload:true to deload tag', () => {
    expect(resolveSessionTags({ deload: true })).toEqual(['deload'])
  })

  it('does not duplicate deload when both legacy field and tags array have it', () => {
    const result = resolveSessionTags({ deload: true, tags: ['deload'] })
    expect(result.filter(t => t === 'deload')).toHaveLength(1)
  })

  it('prepends deload before other tags when promoted from legacy field', () => {
    const result = resolveSessionTags({ deload: true, tags: ['travel'] })
    expect(result[0]).toBe('deload')
    expect(result).toContain('travel')
  })

  it('ignores deload:false', () => {
    expect(resolveSessionTags({ deload: false, tags: ['travel'] })).toEqual(['travel'])
  })
})

describe('resolveHistoryTags', () => {
  it('returns tags for a modern history entry', () => {
    expect(resolveHistoryTags({ tags: ['deload'] })).toEqual(['deload'])
  })

  it('returns empty array when no tags', () => {
    expect(resolveHistoryTags({})).toEqual([])
  })

  it('promotes legacy deload:true to deload tag', () => {
    expect(resolveHistoryTags({ deload: true })).toEqual(['deload'])
  })

  it('does not duplicate deload when already in tags', () => {
    const result = resolveHistoryTags({ deload: true, tags: ['deload'] })
    expect(result.filter(t => t === 'deload')).toHaveLength(1)
  })
})

describe('nextTagColor', () => {
  it('returns the first color for the first tag', () => {
    expect(nextTagColor(0)).toBe(TAG_COLORS[0])
  })

  it('cycles back to the start after exhausting all colors', () => {
    expect(nextTagColor(TAG_COLORS.length)).toBe(TAG_COLORS[0])
  })

  it('returns distinct colors for the first N tags', () => {
    const colors = Array.from({ length: TAG_COLORS.length }, (_, i) => nextTagColor(i))
    const unique = new Set(colors.map(c => c.bg))
    expect(unique.size).toBe(TAG_COLORS.length)
  })
})
