import { describe, it, expect } from 'vitest'
import { getDisplayName, enrichExercise } from '../constants/exercises'

// --- Helpers mirroring inline logic in ActiveSession and ExerciseLibrary ---

function generateExerciseName(displayName) {
  const slug = displayName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return `${slug}-TIMESTAMP` // caller substitutes Date.now() for TIMESTAMP
}

function enrichExercises(exercises, exerciseLibrary) {
  return exercises.map(ex => enrichExercise(ex, exerciseLibrary))
}

function applySwap(exercises, exIndex, newName, exerciseLibrary) {
  return exercises.map((ex, i) => {
    if (i !== exIndex) return ex
    return enrichExercise({ ...ex, swappedName: newName }, exerciseLibrary)
  })
}

function resetSwap(exercises, exIndex, exerciseLibrary) {
  return exercises.map((ex, i) => {
    if (i !== exIndex) return ex
    const { swappedName, ...rest } = ex
    return enrichExercise(rest, exerciseLibrary)
  })
}

// --- Test data ---

const LIBRARY = [
  // Old exercise: human-readable name as ID (pre-displayName, backfilled)
  { name: 'Barbell Back Squat', displayName: 'Barbell Back Squat', muscleGroups: ['Quads'] },
  // Old exercise with renamed displayName
  { name: 'Flat Barbell Bench Press', displayName: 'Flat BB Bench (updated)', muscleGroups: ['Chest'] },
  // New exercise: slug-timestamp ID
  { name: 'low-bar-squat-1737500000000', displayName: 'Low Bar Squat', muscleGroups: ['Quads'] },
  // New exercise: special chars stripped from slug
  { name: 'db-rdl-1737500000001', displayName: "DB RDL (dumbbell)", muscleGroups: ['Hamstrings'] },
]

// --- getDisplayName ---

describe('getDisplayName', () => {
  it('returns displayName for old exercise with human-readable name ID', () => {
    expect(getDisplayName('Barbell Back Squat', LIBRARY)).toBe('Barbell Back Squat')
  })

  it('returns updated displayName when exercise was renamed', () => {
    expect(getDisplayName('Flat Barbell Bench Press', LIBRARY)).toBe('Flat BB Bench (updated)')
  })

  it('returns displayName for new exercise with slug-timestamp ID', () => {
    expect(getDisplayName('low-bar-squat-1737500000000', LIBRARY)).toBe('Low Bar Squat')
  })

  it('falls back to name when exercise is not in library', () => {
    expect(getDisplayName('unknown-exercise-123', LIBRARY)).toBe('unknown-exercise-123')
  })

  it('falls back to name when library is null', () => {
    expect(getDisplayName('Barbell Back Squat', null)).toBe('Barbell Back Squat')
  })

  it('falls back to name when library is undefined', () => {
    expect(getDisplayName('Barbell Back Squat', undefined)).toBe('Barbell Back Squat')
  })

  it('falls back to name when library is empty', () => {
    expect(getDisplayName('Barbell Back Squat', [])).toBe('Barbell Back Squat')
  })
})

// --- Slug / name generation for new exercises ---

describe('exercise name generation', () => {
  it('generates slug from display name', () => {
    const name = generateExerciseName('Low Bar Squat')
    expect(name).toMatch(/^low-bar-squat-TIMESTAMP$/)
  })

  it('strips special characters from slug', () => {
    const name = generateExerciseName("DB RDL (dumbbell)")
    expect(name).toMatch(/^db-rdl-dumbbell-TIMESTAMP$/)
  })

  it('collapses multiple spaces into single dash', () => {
    const name = generateExerciseName('Cable  Lateral  Raise')
    expect(name).toMatch(/^cable-lateral-raise-TIMESTAMP$/)
  })

  it('slug differs from displayName ensuring name is a stable ID', () => {
    const displayName = 'Low Bar Squat'
    const name = generateExerciseName(displayName)
    expect(name).not.toBe(displayName)
    expect(name).toContain('low-bar-squat')
  })
})

// --- enrichExercise ---

describe('enrichExercise', () => {
  it('adds displayName from library', () => {
    const result = enrichExercise({ name: 'low-bar-squat-1737500000000', sets: [] }, LIBRARY)
    expect(result.displayName).toBe('Low Bar Squat')
  })

  it('uses swappedName for lookup when present', () => {
    const result = enrichExercise(
      { name: 'Barbell Back Squat', swappedName: 'low-bar-squat-1737500000000', sets: [] },
      LIBRARY
    )
    expect(result.displayName).toBe('Low Bar Squat')
  })

  it('falls back to activeName when not in library', () => {
    const result = enrichExercise({ name: 'ghost-000', sets: [] }, LIBRARY)
    expect(result.displayName).toBe('ghost-000')
  })

  it('does not mutate the original exercise object', () => {
    const ex = { name: 'Barbell Back Squat', sets: [] }
    enrichExercise(ex, LIBRARY)
    expect(ex.displayName).toBeUndefined()
  })
})

// --- Exercise enrichment at load time ---

describe('exercise enrichment at load', () => {
  it('adds displayName to exercises from library', () => {
    const exercises = [
      { name: 'Barbell Back Squat', sets: [] },
      { name: 'low-bar-squat-1737500000000', sets: [] },
    ]
    const enriched = enrichExercises(exercises, LIBRARY)
    expect(enriched[0].displayName).toBe('Barbell Back Squat')
    expect(enriched[1].displayName).toBe('Low Bar Squat')
  })

  it('enriches swapped exercise: uses swappedName for library lookup', () => {
    const exercises = [
      { name: 'Barbell Back Squat', swappedName: 'low-bar-squat-1737500000000', sets: [] },
    ]
    const enriched = enrichExercises(exercises, LIBRARY)
    expect(enriched[0].displayName).toBe('Low Bar Squat')
  })

  it('falls back to swappedName string when swapped exercise not in library', () => {
    const exercises = [
      { name: 'Barbell Back Squat', swappedName: 'some-unlisted-exercise', sets: [] },
    ]
    const enriched = enrichExercises(exercises, LIBRARY)
    expect(enriched[0].displayName).toBe('some-unlisted-exercise')
  })

  it('falls back to name when exercise not in library', () => {
    const exercises = [{ name: 'mystery-exercise-999', sets: [] }]
    const enriched = enrichExercises(exercises, LIBRARY)
    expect(enriched[0].displayName).toBe('mystery-exercise-999')
  })

  it('preserves all other exercise fields during enrichment', () => {
    const exercises = [{ name: 'Barbell Back Squat', sets: [{ setNumber: 1 }], weightUnit: 'kg', slotId: 'sq-1' }]
    const enriched = enrichExercises(exercises, LIBRARY)
    expect(enriched[0].sets).toEqual([{ setNumber: 1 }])
    expect(enriched[0].weightUnit).toBe('kg')
    expect(enriched[0].slotId).toBe('sq-1')
  })
})

// --- Swap ---

describe('handleSwap', () => {
  const exercises = [
    { name: 'Barbell Back Squat', displayName: 'Barbell Back Squat', sets: [] },
    { name: 'Flat Barbell Bench Press', displayName: 'Flat BB Bench (updated)', sets: [] },
  ]

  it('sets swappedName and updates displayName', () => {
    const updated = applySwap(exercises, 0, 'low-bar-squat-1737500000000', LIBRARY)
    expect(updated[0].swappedName).toBe('low-bar-squat-1737500000000')
    expect(updated[0].displayName).toBe('Low Bar Squat')
  })

  it('does not affect other exercises', () => {
    const updated = applySwap(exercises, 0, 'low-bar-squat-1737500000000', LIBRARY)
    expect(updated[1]).toBe(exercises[1])
  })

  it('falls back to swappedName when swap target not in library', () => {
    const updated = applySwap(exercises, 0, 'unlisted-exercise', LIBRARY)
    expect(updated[0].displayName).toBe('unlisted-exercise')
  })

  it('preserves original name unchanged after swap', () => {
    const updated = applySwap(exercises, 0, 'low-bar-squat-1737500000000', LIBRARY)
    expect(updated[0].name).toBe('Barbell Back Squat')
  })
})

// --- Reset swap ---

describe('handleResetSwap', () => {
  const swappedExercises = [
    {
      name: 'Barbell Back Squat',
      swappedName: 'low-bar-squat-1737500000000',
      displayName: 'Low Bar Squat',
      sets: [],
    },
    { name: 'Flat Barbell Bench Press', displayName: 'Flat BB Bench (updated)', sets: [] },
  ]

  it('removes swappedName and restores original displayName', () => {
    const updated = resetSwap(swappedExercises, 0, LIBRARY)
    expect(updated[0].swappedName).toBeUndefined()
    expect(updated[0].displayName).toBe('Barbell Back Squat')
  })

  it('does not affect other exercises', () => {
    const updated = resetSwap(swappedExercises, 0, LIBRARY)
    expect(updated[1]).toBe(swappedExercises[1])
  })

  it('falls back to name when original not in library', () => {
    const exercises = [
      { name: 'ghost-exercise-000', swappedName: 'low-bar-squat-1737500000000', displayName: 'Low Bar Squat', sets: [] },
    ]
    const updated = resetSwap(exercises, 0, LIBRARY)
    expect(updated[0].displayName).toBe('ghost-exercise-000')
  })
})

// --- Edit exercise (displayName vs name invariant) ---

describe('edit exercise: displayName vs name', () => {
  it('renaming only changes displayName, not name', () => {
    const ex = { name: 'Barbell Back Squat', displayName: 'Barbell Back Squat' }
    const saved = { ...ex, displayName: 'BB Back Squat' }
    expect(saved.name).toBe('Barbell Back Squat')
    expect(saved.displayName).toBe('BB Back Squat')
  })

  it('new exercises have slug-timestamp name and user-input displayName', () => {
    const displayName = 'Low Bar Squat'
    const slug = displayName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const name = `${slug}-${Date.now()}`
    expect(name).toMatch(/^low-bar-squat-\d+$/)
    expect(displayName).toBe('Low Bar Squat')
    expect(name).not.toBe(displayName)
  })

  it('getDisplayName always shows displayName, never raw slug-timestamp ID', () => {
    const result = getDisplayName('low-bar-squat-1737500000000', LIBRARY)
    expect(result).toBe('Low Bar Squat')
    expect(result).not.toMatch(/\d{13}/)
  })

  it('getDisplayName for old exercises returns displayName (which equals name after backfill)', () => {
    const result = getDisplayName('Barbell Back Squat', LIBRARY)
    expect(result).toBe('Barbell Back Squat')
  })
})

// --- Exercise history note propagation ---
// Mirrors the mapping logic in getExerciseHistory (ActiveSession.jsx)

function buildHistoryEntry(session, slotIndex, exerciseLibrary) {
  const ex = session.exercises[slotIndex]
  if (!ex) return null
  return {
    date: session.date,
    sets: ex.sets,
    weightUnit: ex.weightUnit || 'lbs',
    displayName: getDisplayName(ex.swappedName || ex.name, exerciseLibrary),
    sessionType: session.sessionType,
    note: ex.note,
  }
}

describe('exercise history note propagation', () => {
  const session = {
    date: '2026-07-16',
    sessionType: 'upper-a',
    exercises: [
      { name: 'Barbell Back Squat', sets: [{ weight: 100, reps: 8 }], note: 'Pause at the contraction' },
      { name: 'Flat Barbell Bench Press', sets: [{ weight: 80, reps: 8 }] },
    ],
  }

  it('includes note in history entry when exercise has a note', () => {
    const entry = buildHistoryEntry(session, 0, LIBRARY)
    expect(entry.note).toBe('Pause at the contraction')
  })

  it('note is undefined when exercise has no note', () => {
    const entry = buildHistoryEntry(session, 1, LIBRARY)
    expect(entry.note).toBeUndefined()
  })

  it('note does not affect other history fields', () => {
    const entry = buildHistoryEntry(session, 0, LIBRARY)
    expect(entry.date).toBe('2026-07-16')
    expect(entry.displayName).toBe('Barbell Back Squat')
    expect(entry.sets).toHaveLength(1)
    expect(entry.sessionType).toBe('upper-a')
  })

  it('note is preserved when exercise is swapped', () => {
    const swappedSession = {
      ...session,
      exercises: [
        { name: 'Barbell Back Squat', swappedName: 'low-bar-squat-1737500000000', sets: [{ weight: 100, reps: 8 }], note: 'Stay tight' },
      ],
    }
    const entry = buildHistoryEntry(swappedSession, 0, LIBRARY)
    expect(entry.note).toBe('Stay tight')
    expect(entry.displayName).toBe('Low Bar Squat')
  })
})

// --- History entry rendering: full pipeline ---
// Mirrors the set-string and field logic rendered in the history-section JSX

function formatSet(s, weightUnit) {
  const base = `${s.weight}${weightUnit === 'kg' ? 'kg' : ''}×${s.reps}`
  return s.rir !== '' && s.rir !== undefined ? `${base}(${s.rir})` : base
}

function formatSets(sets, weightUnit) {
  const filled = sets.filter(s => s.weight || s.reps)
  if (filled.length === 0) return null
  return filled.map(s => formatSet(s, weightUnit)).join(', ')
}

describe('history entry rendering: full pipeline', () => {
  it('fully populated entry has all fields', () => {
    const session = {
      date: '2026-07-16',
      sessionType: 'upper-a',
      exercises: [{
        name: 'Barbell Back Squat',
        sets: [{ weight: 100, reps: 8, rir: '1' }],
        weightUnit: 'lbs',
        note: 'Pause at the contraction',
      }],
    }
    const entry = buildHistoryEntry(session, 0, LIBRARY)
    expect(entry.date).toBe('2026-07-16')
    expect(entry.displayName).toBe('Barbell Back Squat')
    expect(entry.sets).toHaveLength(1)
    expect(entry.weightUnit).toBe('lbs')
    expect(entry.sessionType).toBe('upper-a')
    expect(entry.note).toBe('Pause at the contraction')
  })

  it('set string: lbs, no rir', () => {
    expect(formatSet({ weight: 100, reps: 8 }, 'lbs')).toBe('100×8')
  })

  it('set string: kg unit appended', () => {
    expect(formatSet({ weight: 80, reps: 5 }, 'kg')).toBe('80kg×5')
  })

  it('set string: rir appended in parens', () => {
    expect(formatSet({ weight: 100, reps: 8, rir: '2' }, 'lbs')).toBe('100×8(2)')
  })

  it('set string: rir of 0 is shown', () => {
    expect(formatSet({ weight: 100, reps: 8, rir: '0' }, 'lbs')).toBe('100×8(0)')
  })

  it('set string: empty string rir is omitted', () => {
    expect(formatSet({ weight: 100, reps: 8, rir: '' }, 'lbs')).toBe('100×8')
  })

  it('formatSets: multiple sets joined by comma', () => {
    const sets = [
      { weight: 100, reps: 8 },
      { weight: 100, reps: 7 },
      { weight: 100, reps: 6 },
    ]
    expect(formatSets(sets, 'lbs')).toBe('100×8, 100×7, 100×6')
  })

  it('formatSets: filters empty sets', () => {
    const sets = [{ weight: 100, reps: 8 }, { weight: '', reps: '' }]
    expect(formatSets(sets, 'lbs')).toBe('100×8')
  })

  it('formatSets: all empty returns null (rendered as None)', () => {
    expect(formatSets([{ weight: '', reps: '' }], 'lbs')).toBeNull()
  })

  it('missing note renders nothing (falsy)', () => {
    const session = {
      date: '2026-07-16',
      sessionType: 'upper-a',
      exercises: [{ name: 'Barbell Back Squat', sets: [{ weight: 100, reps: 8 }] }],
    }
    const entry = buildHistoryEntry(session, 0, LIBRARY)
    expect(entry.note).toBeFalsy()
  })

  it('weightUnit defaults to lbs when absent', () => {
    const session = {
      date: '2026-07-16',
      sessionType: 'upper-a',
      exercises: [{ name: 'Barbell Back Squat', sets: [{ weight: 100, reps: 8 }] }],
    }
    const entry = buildHistoryEntry(session, 0, LIBRARY)
    expect(entry.weightUnit).toBe('lbs')
  })
})
