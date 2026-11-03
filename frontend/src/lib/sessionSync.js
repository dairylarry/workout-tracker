/**
 * Builds the list of EXERCISE_LIB cache operations needed after a session edit.
 * Returns an array of { op: 'remove'|'update', name, args } descriptors so the
 * logic can be tested without a DynamoDB connection.
 */
export function buildExerciseHistoryOps(editExercises, prevExercises, { date, sessionType, tags = [] }) {
  return editExercises.flatMap((ex, slotIndex) => {
    const newName = ex.swappedName || ex.name
    const oldName = prevExercises[slotIndex]?.swappedName || prevExercises[slotIndex]?.name
    const hasSets = ex.sets?.some(s => s.weight || s.reps)
    if (!hasSets) return []

    const isSupplemental = !!ex.supplemental
    const dedupeKey = isSupplemental ? { supplemental: true } : { slotIndex }
    const result = []

    if (oldName && oldName !== newName) {
      result.push({
        op: 'remove',
        name: oldName,
        args: isSupplemental
          ? { date, sessionType, supplemental: true }
          : { date, sessionType, slotIndex },
      })
    }

    result.push({
      op: 'update',
      name: newName,
      entry: {
        date,
        sessionType,
        ...dedupeKey,
        sets: ex.sets.filter(s => s.weight || s.reps).map(s => ({ weight: s.weight, reps: s.reps, rir: s.rir })),
        weightUnit: ex.weightUnit || 'lbs',
        ...(tags.includes('deload') && { deload: true }),
        ...(tags.length && { tags }),
        ...(ex.note && { note: ex.note }),
      },
    })

    return result
  })
}
