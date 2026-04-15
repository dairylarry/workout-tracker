import { MG, FAM } from '../constants/exerciseEnums'

/**
 * Seed data for the exercise library.
 * Includes all exercises from programConfig + their subs.
 */
export const EXERCISE_SEED = [
  // Lower body — quads
  { name: 'Barbell Back Squat', muscleGroups: [MG.QUADS, MG.GLUTES], family: FAM.SQUAT, defaultRepRange: [5, 5], defaultSets: 3 },
  { name: 'Leg Press', muscleGroups: [MG.QUADS, MG.GLUTES], family: FAM.SQUAT, defaultRepRange: [10, 12], defaultSets: 3 },
  { name: 'Bulgarian Split Squat', muscleGroups: [MG.QUADS, MG.GLUTES], family: FAM.SQUAT, defaultRepRange: [8, 12], defaultSets: 3, unilateral: true },
  { name: 'Goblet Squat', muscleGroups: [MG.QUADS, MG.GLUTES], family: FAM.SQUAT, defaultRepRange: [8, 12], defaultSets: 3 },
  { name: 'Pendulum Squat', muscleGroups: [MG.QUADS], family: FAM.SQUAT, defaultRepRange: [8, 12], defaultSets: 3 },
  { name: 'V-Squat', muscleGroups: [MG.QUADS, MG.GLUTES], family: FAM.SQUAT, defaultRepRange: [8, 12], defaultSets: 3 },
  { name: 'Hack Squat', muscleGroups: [MG.QUADS], family: FAM.SQUAT, defaultRepRange: [8, 12], defaultSets: 3 },
  { name: 'Front Squat', muscleGroups: [MG.QUADS, MG.GLUTES], family: FAM.SQUAT, defaultRepRange: [6, 10], defaultSets: 3 },
  { name: 'Leg Extension', muscleGroups: [MG.QUADS], family: FAM.LEG_EXTENSION, defaultRepRange: [10, 12], defaultSets: 3 },
  { name: 'Cable Leg Extension', muscleGroups: [MG.QUADS], family: FAM.LEG_EXTENSION, defaultRepRange: [10, 12], defaultSets: 3 },

  // Lower body — hamstrings
  { name: 'Deadlift', muscleGroups: [MG.HAMSTRINGS, MG.GLUTES, MG.BACK], family: FAM.HINGE, defaultRepRange: [3, 5], defaultSets: 3 },
  { name: 'Romanian Deadlift', muscleGroups: [MG.HAMSTRINGS, MG.GLUTES], family: FAM.HINGE, defaultRepRange: [6, 10], defaultSets: 3 },
  { name: 'DB Romanian Deadlift', muscleGroups: [MG.HAMSTRINGS, MG.GLUTES], family: FAM.HINGE, defaultRepRange: [6, 10], defaultSets: 3 },
  { name: 'KB Romanian Deadlift', muscleGroups: [MG.HAMSTRINGS, MG.GLUTES], family: FAM.HINGE, defaultRepRange: [6, 10], defaultSets: 3 },
  { name: 'Single-Leg Romanian Deadlift', muscleGroups: [MG.HAMSTRINGS, MG.GLUTES], family: FAM.HINGE, defaultRepRange: [8, 10], defaultSets: 2, unilateral: true },
  { name: 'DB Single-Leg RDL', muscleGroups: [MG.HAMSTRINGS, MG.GLUTES], family: FAM.HINGE, defaultRepRange: [8, 10], defaultSets: 2, unilateral: true },
  { name: 'KB Single-Leg RDL', muscleGroups: [MG.HAMSTRINGS, MG.GLUTES], family: FAM.HINGE, defaultRepRange: [8, 10], defaultSets: 2, unilateral: true },
  { name: 'Seated Leg Curl', muscleGroups: [MG.HAMSTRINGS], family: FAM.LEG_CURL, defaultRepRange: [10, 12], defaultSets: 3 },
  { name: 'Lying Leg Curl', muscleGroups: [MG.HAMSTRINGS], family: FAM.LEG_CURL, defaultRepRange: [10, 12], defaultSets: 3 },
  { name: 'Nordic Curl', muscleGroups: [MG.HAMSTRINGS], family: FAM.LEG_CURL, defaultRepRange: [5, 8], defaultSets: 2 },
  { name: 'Glute Ham Raise', muscleGroups: [MG.HAMSTRINGS, MG.GLUTES], family: FAM.LEG_CURL, defaultRepRange: [5, 8], defaultSets: 2 },

  // Lower body — glutes
  { name: 'Barbell Hip Thrust', muscleGroups: [MG.GLUTES, MG.HAMSTRINGS], family: FAM.HIP_THRUST, defaultRepRange: [8, 12], defaultSets: 2 },
  { name: 'Cable Hip Thrust', muscleGroups: [MG.GLUTES, MG.HAMSTRINGS], family: FAM.HIP_THRUST, defaultRepRange: [8, 12], defaultSets: 2 },
  { name: 'DB Hip Thrust', muscleGroups: [MG.GLUTES, MG.HAMSTRINGS], family: FAM.HIP_THRUST, defaultRepRange: [8, 12], defaultSets: 2 },
  { name: 'KB Hip Thrust', muscleGroups: [MG.GLUTES, MG.HAMSTRINGS], family: FAM.HIP_THRUST, defaultRepRange: [8, 12], defaultSets: 2 },

  // Lower body — calves
  { name: 'Standing Calf Raise', muscleGroups: [MG.CALVES], family: FAM.CALF_RAISE, defaultRepRange: [15, 20], defaultSets: 3 },
  { name: 'Standing Calf Raise Machine', muscleGroups: [MG.CALVES], family: FAM.CALF_RAISE, defaultRepRange: [15, 20], defaultSets: 3 },
  { name: 'Single-Leg DB Calf Raise', muscleGroups: [MG.CALVES], family: FAM.CALF_RAISE, defaultRepRange: [15, 20], defaultSets: 3, unilateral: true },
  { name: 'Seated Calf Raise', muscleGroups: [MG.CALVES], family: FAM.CALF_RAISE, defaultRepRange: [15, 20], defaultSets: 3 },
  { name: 'Seated DB Calf Raise', muscleGroups: [MG.CALVES], family: FAM.CALF_RAISE, defaultRepRange: [15, 20], defaultSets: 3 },

  // Upper body — chest
  { name: 'Flat Barbell Bench Press', muscleGroups: [MG.CHEST, MG.TRICEPS], family: FAM.PRESS, defaultRepRange: [5, 5], defaultSets: 3 },
  { name: 'Incline DB Press', muscleGroups: [MG.CHEST, MG.SHOULDERS], family: FAM.PRESS, defaultRepRange: [8, 12], defaultSets: 4 },
  { name: 'Incline Barbell Press', muscleGroups: [MG.CHEST, MG.SHOULDERS], family: FAM.PRESS, defaultRepRange: [8, 12], defaultSets: 4 },
  { name: 'Machine Incline Press', muscleGroups: [MG.CHEST, MG.SHOULDERS], family: FAM.PRESS, defaultRepRange: [8, 12], defaultSets: 4 },
  { name: 'Incline Cable Fly', muscleGroups: [MG.CHEST], family: FAM.FLY, defaultRepRange: [10, 12], defaultSets: 3 },
  { name: 'Incline DB Fly', muscleGroups: [MG.CHEST], family: FAM.FLY, defaultRepRange: [12, 15], defaultSets: 3 },
  { name: 'Pec Deck', muscleGroups: [MG.CHEST], family: FAM.FLY, defaultRepRange: [12, 15], defaultSets: 3 },
  { name: 'Flat Cable Fly', muscleGroups: [MG.CHEST], family: FAM.FLY, defaultRepRange: [12, 15], defaultSets: 3 },
  { name: 'Decline Cable Fly', muscleGroups: [MG.CHEST], family: FAM.FLY, defaultRepRange: [12, 15], defaultSets: 3 },

  // Upper body — back
  { name: 'Weighted Pull-Up', muscleGroups: [MG.BACK, MG.BICEPS], family: FAM.PULL, defaultRepRange: [6, 10], defaultSets: 4 },
  { name: 'Pull-Up', muscleGroups: [MG.BACK, MG.BICEPS], family: FAM.PULL, defaultRepRange: [8, 12], defaultSets: 3 },
  { name: 'Lat Pulldown', muscleGroups: [MG.BACK, MG.BICEPS], family: FAM.PULL, defaultRepRange: [8, 12], defaultSets: 3 },
  { name: 'Band-Assisted Pull-Up', muscleGroups: [MG.BACK, MG.BICEPS], family: FAM.PULL, defaultRepRange: [8, 12], defaultSets: 3 },
  { name: 'Seated Cable Row', muscleGroups: [MG.BACK], family: FAM.ROW, defaultRepRange: [8, 12], defaultSets: 3 },
  { name: 'Barbell Bent-Over Row', muscleGroups: [MG.BACK], family: FAM.ROW, defaultRepRange: [8, 10], defaultSets: 3 },
  { name: 'DB Bent-Over Row', muscleGroups: [MG.BACK], family: FAM.ROW, defaultRepRange: [8, 10], defaultSets: 3 },
  { name: 'Chest-Supported DB Row', muscleGroups: [MG.BACK], family: FAM.ROW, defaultRepRange: [10, 12], defaultSets: 3 },
  { name: 'Single-Arm DB Row', muscleGroups: [MG.BACK], family: FAM.ROW, defaultRepRange: [10, 12], defaultSets: 3, unilateral: true },
  { name: 'Machine Row', muscleGroups: [MG.BACK], family: FAM.ROW, defaultRepRange: [10, 12], defaultSets: 3 },
  { name: 'Machine Chest-Supported Row', muscleGroups: [MG.BACK], family: FAM.ROW, defaultRepRange: [10, 12], defaultSets: 3 },
  { name: 'Cable Face Pull', muscleGroups: [MG.BACK, MG.SHOULDERS], family: FAM.REAR_DELT, defaultRepRange: [12, 15], defaultSets: 3 },
  { name: 'Band Face Pull', muscleGroups: [MG.BACK, MG.SHOULDERS], family: FAM.REAR_DELT, defaultRepRange: [12, 15], defaultSets: 3 },
  { name: 'Rear Delt Fly', muscleGroups: [MG.SHOULDERS, MG.BACK], family: FAM.REAR_DELT, defaultRepRange: [12, 15], defaultSets: 3 },
  { name: 'Reverse Cable Crossover', muscleGroups: [MG.SHOULDERS, MG.BACK], family: FAM.REAR_DELT, defaultRepRange: [12, 15], defaultSets: 3 },
  { name: 'Lying DB Reverse Fly', muscleGroups: [MG.SHOULDERS, MG.BACK], family: FAM.REAR_DELT, defaultRepRange: [12, 15], defaultSets: 3 },

  // Upper body — shoulders
  { name: 'Barbell Overhead Press', muscleGroups: [MG.SHOULDERS, MG.TRICEPS], family: FAM.PRESS, defaultRepRange: [5, 8], defaultSets: 3 },
  { name: 'Seated DB Shoulder Press', muscleGroups: [MG.SHOULDERS, MG.TRICEPS], family: FAM.PRESS, defaultRepRange: [8, 12], defaultSets: 3 },
  { name: 'Standing DB Shoulder Press', muscleGroups: [MG.SHOULDERS, MG.TRICEPS], family: FAM.PRESS, defaultRepRange: [8, 12], defaultSets: 3 },
  { name: 'Machine Shoulder Press', muscleGroups: [MG.SHOULDERS, MG.TRICEPS], family: FAM.PRESS, defaultRepRange: [8, 12], defaultSets: 3 },
  { name: 'Cable Lateral Raise', muscleGroups: [MG.SHOULDERS], family: FAM.LATERAL_RAISE, defaultRepRange: [12, 15], defaultSets: 4 },
  { name: 'DB Lateral Raise', muscleGroups: [MG.SHOULDERS], family: FAM.LATERAL_RAISE, defaultRepRange: [12, 15], defaultSets: 4 },
  { name: 'Incline Dumbbell Y Raise', muscleGroups: [MG.SHOULDERS], family: FAM.LATERAL_RAISE, defaultRepRange: [12, 15], defaultSets: 3 },
  { name: 'Machine Lateral Raise', muscleGroups: [MG.SHOULDERS], family: FAM.LATERAL_RAISE, defaultRepRange: [12, 15], defaultSets: 4 },

  // Upper body — triceps
  { name: 'Tricep Rope Pushdown', muscleGroups: [MG.TRICEPS], family: FAM.PUSHDOWN, defaultRepRange: [10, 12], defaultSets: 4 },
  { name: 'Tricep Bar Pushdown', muscleGroups: [MG.TRICEPS], family: FAM.PUSHDOWN, defaultRepRange: [10, 12], defaultSets: 4 },
  { name: 'Band Tricep Pushdown', muscleGroups: [MG.TRICEPS], family: FAM.PUSHDOWN, defaultRepRange: [10, 12], defaultSets: 4 },
  { name: 'Cable Overhead Tricep Extension', muscleGroups: [MG.TRICEPS], family: FAM.EXTENSION, defaultRepRange: [10, 12], defaultSets: 2 },
  { name: 'DB Overhead Tricep Extension', muscleGroups: [MG.TRICEPS], family: FAM.EXTENSION, defaultRepRange: [10, 12], defaultSets: 2 },

  // Upper body — biceps
  { name: 'Incline DB Curl', muscleGroups: [MG.BICEPS], family: FAM.CURL, defaultRepRange: [10, 12], defaultSets: 3 },
  { name: 'EZ Bar Curl', muscleGroups: [MG.BICEPS], family: FAM.CURL, defaultRepRange: [10, 12], defaultSets: 4 },
  { name: 'DB Curl', muscleGroups: [MG.BICEPS], family: FAM.CURL, defaultRepRange: [10, 12], defaultSets: 4 },
  { name: 'Barbell Curl', muscleGroups: [MG.BICEPS], family: FAM.CURL, defaultRepRange: [10, 12], defaultSets: 4 },
  { name: 'Bicep Curl Machine', muscleGroups: [MG.BICEPS], family: FAM.CURL, defaultRepRange: [10, 12], defaultSets: 4 },
  { name: 'DB Preacher Curl', muscleGroups: [MG.BICEPS], family: FAM.CURL, defaultRepRange: [10, 12], defaultSets: 4 },
  { name: 'EZ Preacher Curl', muscleGroups: [MG.BICEPS], family: FAM.CURL, defaultRepRange: [10, 12], defaultSets: 4 },
  { name: 'Hammer Curl', muscleGroups: [MG.BICEPS], family: FAM.CURL, defaultRepRange: [10, 12], defaultSets: 3 },
  { name: 'Cross-Body Hammer Curl', muscleGroups: [MG.BICEPS], family: FAM.CURL, defaultRepRange: [10, 12], defaultSets: 3 },

  // Abs
  { name: 'Cable Crunch', muscleGroups: [MG.CORE], family: FAM.ABS, defaultRepRange: [15, 20], defaultSets: 4 },
]
