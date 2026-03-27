/**
 * Unfurl a routine's block structure into a flat exercise list.
 *
 * Each block's exercises are repeated `numberOfTimes` times.
 * The final exercise's restSeconds is forced to 0.
 */
export function unfurlRoutine(routine) {
  const exercises = []
  for (const block of routine) {
    for (let round = 0; round < block.numberOfTimes; round++) {
      for (const ex of block.exercises) {
        exercises.push({ ...ex, blockLabel: block.label || null })
      }
    }
  }
  if (exercises.length > 0) {
    exercises[exercises.length - 1] = { ...exercises[exercises.length - 1], restSeconds: 0 }
  }
  return exercises
}

/**
 * Compute total duration and exercise count from a routine's block array.
 * Duration includes the 10s countdown.
 */
export function computeRoutineStats(routine) {
  const unfurled = unfurlRoutine(routine)
  const totalSeconds = unfurled.reduce((sum, ex) => sum + ex.workSeconds + ex.restSeconds, 0)
  return { exerciseCount: unfurled.length, totalSeconds }
}

/**
 * Format seconds as M:SS string.
 */
export function formatDuration(seconds) {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}
