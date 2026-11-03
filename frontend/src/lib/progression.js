/**
 * Returns true when the first 2 sets hit the top of the rep range at the same
 * weight — the trigger to bump weight next session.
 * Later sets don't need to qualify; fatigue naturally drops them.
 * TODO: make N configurable (currently 2) to support "all sets" vs "first N sets" modes.
 */
export function checkProgression(sets, repRange) {
  if (!sets || sets.length < 2) return false
  if (!repRange) return false
  const topReps = repRange[1]
  const w0 = sets[0]?.weight
  if (w0 === '' || w0 == null) return false
  return sets.slice(0, 2).every(
    s => s.reps !== '' && s.reps != null && Number(s.reps) >= topReps &&
         String(s.weight) === String(w0)
  )
}
