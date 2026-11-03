import { describe, it, expect } from 'vitest'
import { buildExerciseHistoryOps } from '../lib/sessionSync'

const DATE = '2026-11-01'
const SESSION_TYPE = 'lower-a'
const SETS = [{ weight: '225', reps: '5', rir: '2' }, { weight: '225', reps: '5', rir: '2' }]

function makeEx(name, swappedName, sets = SETS, supplemental = false) {
  return { name, ...(swappedName ? { swappedName } : {}), sets, supplemental }
}

describe('buildExerciseHistoryOps', () => {
  it('emits a single update when name is unchanged', () => {
    const ex = makeEx('Barbell Back Squat')
    const ops = buildExerciseHistoryOps([ex], [ex], { date: DATE, sessionType: SESSION_TYPE, tags: [] })
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ op: 'update', name: 'Barbell Back Squat' })
  })

  it('emits remove + update when exercise is swapped to a new name', () => {
    const prev = makeEx('Pendulum Squat')
    const next = makeEx('Pendulum Squat', 'Hack Squat')
    const ops = buildExerciseHistoryOps([next], [prev], { date: DATE, sessionType: SESSION_TYPE, tags: [] })
    expect(ops).toHaveLength(2)
    expect(ops[0]).toMatchObject({ op: 'remove', name: 'Pendulum Squat', args: { date: DATE, sessionType: SESSION_TYPE, slotIndex: 0 } })
    expect(ops[1]).toMatchObject({ op: 'update', name: 'Hack Squat', entry: expect.objectContaining({ slotIndex: 0 }) })
  })

  it('emits remove + update when swap is reset back to original name', () => {
    const prev = makeEx('Pendulum Squat', 'Hack Squat')
    const next = makeEx('Pendulum Squat')
    const ops = buildExerciseHistoryOps([next], [prev], { date: DATE, sessionType: SESSION_TYPE, tags: [] })
    expect(ops).toHaveLength(2)
    expect(ops[0]).toMatchObject({ op: 'remove', name: 'Hack Squat' })
    expect(ops[1]).toMatchObject({ op: 'update', name: 'Pendulum Squat' })
  })

  it('skips exercises with no filled sets', () => {
    const ex = makeEx('Barbell Back Squat', undefined, [{ weight: '', reps: '', rir: '' }])
    const ops = buildExerciseHistoryOps([ex], [ex], { date: DATE, sessionType: SESSION_TYPE, tags: [] })
    expect(ops).toHaveLength(0)
  })

  it('uses supplemental:true instead of slotIndex for supplemental exercises', () => {
    const prev = makeEx('Cable Lateral Raise', undefined, SETS, true)
    const next = makeEx('Cable Lateral Raise', 'DB Lateral Raise', SETS, true)
    const ops = buildExerciseHistoryOps([next], [prev], { date: DATE, sessionType: SESSION_TYPE, tags: [] })
    expect(ops[0]).toMatchObject({ op: 'remove', args: { supplemental: true } })
    expect(ops[0].args).not.toHaveProperty('slotIndex')
    expect(ops[1].entry).toMatchObject({ supplemental: true })
    expect(ops[1].entry).not.toHaveProperty('slotIndex')
  })

  it('includes deload:true and tags when deload tag is present', () => {
    const ex = makeEx('Barbell Back Squat')
    const ops = buildExerciseHistoryOps([ex], [ex], { date: DATE, sessionType: SESSION_TYPE, tags: ['deload'] })
    expect(ops[0].entry).toMatchObject({ deload: true, tags: ['deload'] })
  })

  it('strips rir from sets in the update entry', () => {
    const ex = makeEx('Barbell Back Squat', undefined, [{ weight: '225', reps: '5', rir: '2', extra: 'x' }])
    const ops = buildExerciseHistoryOps([ex], [ex], { date: DATE, sessionType: SESSION_TYPE, tags: [] })
    expect(ops[0].entry.sets[0]).toEqual({ weight: '225', reps: '5', rir: '2' })
    expect(ops[0].entry.sets[0]).not.toHaveProperty('extra')
  })

  it('handles multiple exercises with correct slotIndex per slot', () => {
    const prevExs = [makeEx('Squat'), makeEx('Leg Press')]
    const nextExs = [makeEx('Squat'), makeEx('Leg Press', 'Hack Squat')]
    const ops = buildExerciseHistoryOps(nextExs, prevExs, { date: DATE, sessionType: SESSION_TYPE, tags: [] })
    const removeOp = ops.find(o => o.op === 'remove')
    const updateOps = ops.filter(o => o.op === 'update')
    expect(removeOp).toMatchObject({ name: 'Leg Press', args: { slotIndex: 1 } })
    expect(updateOps[1]).toMatchObject({ name: 'Hack Squat', entry: { slotIndex: 1 } })
  })
})
