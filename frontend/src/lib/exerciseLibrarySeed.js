/**
 * Seed data for the exercise library.
 * Includes all exercises from programConfig + their subs.
 */
export const EXERCISE_SEED = [
  // Lower body — quads
  { name: 'Barbell Back Squat', muscleGroups: ['quads', 'glutes'], family: 'squat', defaultRepRange: [5, 5], defaultSets: 3 },
  { name: 'Leg Press', muscleGroups: ['quads', 'glutes'], family: 'squat', defaultRepRange: [10, 15], defaultSets: 3 },
  { name: 'Bulgarian Split Squat', muscleGroups: ['quads', 'glutes'], family: 'squat', defaultRepRange: [8, 12], defaultSets: 3, unilateral: true },
  { name: 'Goblet Squat', muscleGroups: ['quads', 'glutes'], family: 'squat', defaultRepRange: [8, 12], defaultSets: 3 },
  { name: 'Hack Squat', muscleGroups: ['quads'], family: 'squat', defaultRepRange: [8, 12], defaultSets: 3 },
  { name: 'Leg Extension', muscleGroups: ['quads'], family: 'leg-extension', defaultRepRange: [12, 15], defaultSets: 3 },
  { name: 'Cable Leg Extension', muscleGroups: ['quads'], family: 'leg-extension', defaultRepRange: [12, 15], defaultSets: 3 },

  // Lower body — hamstrings
  { name: 'Romanian Deadlift', muscleGroups: ['hamstrings', 'glutes'], family: 'hinge', defaultRepRange: [6, 10], defaultSets: 3 },
  { name: 'DB Romanian Deadlift', muscleGroups: ['hamstrings', 'glutes'], family: 'hinge', defaultRepRange: [6, 10], defaultSets: 3 },
  { name: 'KB Romanian Deadlift', muscleGroups: ['hamstrings', 'glutes'], family: 'hinge', defaultRepRange: [6, 10], defaultSets: 3 },
  { name: 'Single-Leg Romanian Deadlift', muscleGroups: ['hamstrings', 'glutes'], family: 'hinge', defaultRepRange: [8, 10], defaultSets: 2, unilateral: true },
  { name: 'DB Single-Leg RDL', muscleGroups: ['hamstrings', 'glutes'], family: 'hinge', defaultRepRange: [8, 10], defaultSets: 2, unilateral: true },
  { name: 'KB Single-Leg RDL', muscleGroups: ['hamstrings', 'glutes'], family: 'hinge', defaultRepRange: [8, 10], defaultSets: 2, unilateral: true },
  { name: 'Seated Leg Curl', muscleGroups: ['hamstrings'], family: 'leg-curl', defaultRepRange: [10, 12], defaultSets: 3 },
  { name: 'Lying Leg Curl', muscleGroups: ['hamstrings'], family: 'leg-curl', defaultRepRange: [10, 12], defaultSets: 3 },
  { name: 'Nordic Curl', muscleGroups: ['hamstrings'], family: 'leg-curl', defaultRepRange: [5, 8], defaultSets: 2 },
  { name: 'Glute Ham Raise', muscleGroups: ['hamstrings', 'glutes'], family: 'leg-curl', defaultRepRange: [5, 8], defaultSets: 2 },

  // Lower body — glutes
  { name: 'Barbell Hip Thrust', muscleGroups: ['glutes', 'hamstrings'], family: 'hip-thrust', defaultRepRange: [8, 12], defaultSets: 2 },
  { name: 'DB Hip Thrust', muscleGroups: ['glutes', 'hamstrings'], family: 'hip-thrust', defaultRepRange: [8, 12], defaultSets: 2 },
  { name: 'KB Hip Thrust', muscleGroups: ['glutes', 'hamstrings'], family: 'hip-thrust', defaultRepRange: [8, 12], defaultSets: 2 },

  // Lower body — calves
  { name: 'Standing Calf Raise', muscleGroups: ['calves'], family: 'calf-raise', defaultRepRange: [15, 20], defaultSets: 3 },
  { name: 'Single-Leg DB Calf Raise', muscleGroups: ['calves'], family: 'calf-raise', defaultRepRange: [15, 20], defaultSets: 3, unilateral: true },
  { name: 'Seated Calf Raise', muscleGroups: ['calves'], family: 'calf-raise', defaultRepRange: [15, 20], defaultSets: 3 },
  { name: 'Seated DB Calf Raise', muscleGroups: ['calves'], family: 'calf-raise', defaultRepRange: [15, 20], defaultSets: 3 },

  // Upper body — chest
  { name: 'Flat Barbell Bench Press', muscleGroups: ['chest', 'triceps'], family: 'press', defaultRepRange: [5, 5], defaultSets: 3 },
  { name: 'Incline DB Press', muscleGroups: ['chest', 'shoulders'], family: 'press', defaultRepRange: [8, 12], defaultSets: 4 },
  { name: 'Incline Barbell Press', muscleGroups: ['chest', 'shoulders'], family: 'press', defaultRepRange: [8, 12], defaultSets: 4 },
  { name: 'Machine Incline Press', muscleGroups: ['chest', 'shoulders'], family: 'press', defaultRepRange: [8, 12], defaultSets: 4 },
  { name: 'Incline Cable Fly', muscleGroups: ['chest'], family: 'fly', defaultRepRange: [12, 15], defaultSets: 3 },
  { name: 'Incline DB Fly', muscleGroups: ['chest'], family: 'fly', defaultRepRange: [12, 15], defaultSets: 3 },
  { name: 'Pec Deck', muscleGroups: ['chest'], family: 'fly', defaultRepRange: [12, 15], defaultSets: 3 },
  { name: 'Flat Cable Fly', muscleGroups: ['chest'], family: 'fly', defaultRepRange: [12, 15], defaultSets: 3 },
  { name: 'Decline Cable Fly', muscleGroups: ['chest'], family: 'fly', defaultRepRange: [12, 15], defaultSets: 3 },

  // Upper body — back
  { name: 'Weighted Pull-Up', muscleGroups: ['back', 'biceps'], family: 'pull', defaultRepRange: [6, 10], defaultSets: 4 },
  { name: 'Pull-Up', muscleGroups: ['back', 'biceps'], family: 'pull', defaultRepRange: [8, 12], defaultSets: 3 },
  { name: 'Lat Pulldown', muscleGroups: ['back', 'biceps'], family: 'pull', defaultRepRange: [8, 12], defaultSets: 3 },
  { name: 'Band-Assisted Pull-Up', muscleGroups: ['back', 'biceps'], family: 'pull', defaultRepRange: [8, 12], defaultSets: 3 },
  { name: 'Seated Cable Row', muscleGroups: ['back'], family: 'row', defaultRepRange: [8, 10], defaultSets: 3 },
  { name: 'Barbell Bent-Over Row', muscleGroups: ['back'], family: 'row', defaultRepRange: [8, 10], defaultSets: 3 },
  { name: 'DB Bent-Over Row', muscleGroups: ['back'], family: 'row', defaultRepRange: [8, 10], defaultSets: 3 },
  { name: 'Chest-Supported DB Row', muscleGroups: ['back'], family: 'row', defaultRepRange: [10, 12], defaultSets: 3 },
  { name: 'Single-Arm DB Row', muscleGroups: ['back'], family: 'row', defaultRepRange: [10, 12], defaultSets: 3, unilateral: true },
  { name: 'Machine Row', muscleGroups: ['back'], family: 'row', defaultRepRange: [10, 12], defaultSets: 3 },
  { name: 'Cable Face Pull', muscleGroups: ['back', 'shoulders'], family: 'rear-delt', defaultRepRange: [12, 15], defaultSets: 3 },
  { name: 'Band Face Pull', muscleGroups: ['back', 'shoulders'], family: 'rear-delt', defaultRepRange: [12, 15], defaultSets: 3 },
  { name: 'Rear Delt Fly', muscleGroups: ['shoulders', 'back'], family: 'rear-delt', defaultRepRange: [12, 15], defaultSets: 3 },

  // Upper body — shoulders
  { name: 'Seated DB Shoulder Press', muscleGroups: ['shoulders', 'triceps'], family: 'press', defaultRepRange: [8, 12], defaultSets: 3 },
  { name: 'Standing DB Shoulder Press', muscleGroups: ['shoulders', 'triceps'], family: 'press', defaultRepRange: [8, 12], defaultSets: 3 },
  { name: 'Machine Shoulder Press', muscleGroups: ['shoulders', 'triceps'], family: 'press', defaultRepRange: [8, 12], defaultSets: 3 },
  { name: 'Cable Lateral Raise', muscleGroups: ['shoulders'], family: 'lateral-raise', defaultRepRange: [12, 15], defaultSets: 4 },
  { name: 'DB Lateral Raise', muscleGroups: ['shoulders'], family: 'lateral-raise', defaultRepRange: [12, 15], defaultSets: 4 },

  // Upper body — triceps
  { name: 'Tricep Rope Pushdown', muscleGroups: ['triceps'], family: 'pushdown', defaultRepRange: [10, 12], defaultSets: 4 },
  { name: 'Tricep Bar Pushdown', muscleGroups: ['triceps'], family: 'pushdown', defaultRepRange: [10, 12], defaultSets: 4 },
  { name: 'Band Tricep Pushdown', muscleGroups: ['triceps'], family: 'pushdown', defaultRepRange: [10, 12], defaultSets: 4 },
  { name: 'Cable Overhead Tricep Extension', muscleGroups: ['triceps'], family: 'extension', defaultRepRange: [10, 12], defaultSets: 2 },
  { name: 'DB Overhead Tricep Extension', muscleGroups: ['triceps'], family: 'extension', defaultRepRange: [10, 12], defaultSets: 2 },

  // Upper body — biceps
  { name: 'EZ Bar Curl', muscleGroups: ['biceps'], family: 'curl', defaultRepRange: [10, 12], defaultSets: 4 },
  { name: 'DB Curl', muscleGroups: ['biceps'], family: 'curl', defaultRepRange: [10, 12], defaultSets: 4 },
  { name: 'Barbell Curl', muscleGroups: ['biceps'], family: 'curl', defaultRepRange: [10, 12], defaultSets: 4 },
  { name: 'Hammer Curl', muscleGroups: ['biceps'], family: 'curl', defaultRepRange: [10, 12], defaultSets: 3 },
  { name: 'Cross-Body Hammer Curl', muscleGroups: ['biceps'], family: 'curl', defaultRepRange: [10, 12], defaultSets: 3 },
]
