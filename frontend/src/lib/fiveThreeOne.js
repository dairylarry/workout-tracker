/**
 * 5/3/1 percentage calculations and set structure.
 */

const WARMUP_SETS = [
  { reps: 5, pct: 0.40, label: 'Warmup 1×5' },
  { reps: 5, pct: 0.50, label: 'Warmup 1×5' },
  { reps: 3, pct: 0.60, label: 'Warmup 1×3' },
]

const WORKING_SETS = {
  1: [
    { reps: 5, pct: 0.65, label: '1×5' },
    { reps: 5, pct: 0.75, label: '1×5' },
    { reps: 5, pct: 0.85, label: '1×5', isAmrap: true },
  ],
  2: [
    { reps: 3, pct: 0.70, label: '1×3' },
    { reps: 3, pct: 0.80, label: '1×3' },
    { reps: 3, pct: 0.90, label: '1×3', isAmrap: true },
  ],
  3: [
    { reps: 5, pct: 0.75, label: '1×5' },
    { reps: 3, pct: 0.85, label: '1×3' },
    { reps: 1, pct: 0.95, label: '1×1', isAmrap: true },
  ],
}

function ceilTo5(weight) {
  return Math.ceil(weight / 5) * 5
}

/**
 * Get all sets (warmup + working) for a given week and training max.
 */
export function getSetsForWeek(week, trainingMax) {
  const warmup = WARMUP_SETS.map(s => ({
    ...s,
    target: ceilTo5(trainingMax * s.pct),
    isWarmup: true,
  }))
  const working = WORKING_SETS[week].map(s => ({
    ...s,
    target: ceilTo5(trainingMax * s.pct),
    isWarmup: false,
  }))
  return [...warmup, ...working]
}

/**
 * Get the full wave table (all 3 weeks) for a training max.
 * Returns { warmup: [...], weeks: { 1: [...], 2: [...], 3: [...] } }
 */
export function getFullWaveTable(trainingMax) {
  const warmup = WARMUP_SETS.map(s => ({
    ...s,
    target: ceilTo5(trainingMax * s.pct),
  }))
  const weeks = {}
  for (const week of [1, 2, 3]) {
    weeks[week] = WORKING_SETS[week].map(s => ({
      ...s,
      target: ceilTo5(trainingMax * s.pct),
    }))
  }
  return { warmup, weeks }
}

export const WEEK_LABELS = {
  1: 'Week 1 (5s)',
  2: 'Week 2 (3s)',
  3: 'Week 3 (5/3/1)',
}
