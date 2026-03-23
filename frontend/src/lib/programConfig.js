export const PROGRAM = {
  name: 'Spring 2026',
  sessionTypes: {
    'lower-a': {
      name: 'Lower A',
      day: 'Monday',
      focus: 'Strength + Hypertrophy',
      exercises: [
        { name: 'Barbell Back Squat', sets: 0, repRange: null, rir: null, rest: '3–4 min', is531: true, note: '5/3/1 — track manually' },
        { name: 'Bulgarian Split Squat', sets: 3, repRange: [8, 12], rir: 2, rest: '90 sec', perSide: true },
        { name: 'Romanian Deadlift', sets: 3, repRange: [6, 10], rir: 2, rest: '2 min' },
        { name: 'Barbell Hip Thrust', sets: 3, repRange: [8, 12], rir: 2, rest: '90 sec' },
        { name: 'Standing Calf Raise', sets: 3, repRange: [12, 15], rir: 1, rest: '60 sec' },
      ],
    },
    'upper-a': {
      name: 'Upper A',
      day: 'Tuesday',
      focus: 'Strength + Hypertrophy',
      exercises: [
        { name: 'Flat Barbell Bench Press', sets: 0, repRange: null, rir: null, rest: '3–4 min', is531: true, note: '5/3/1 — track manually' },
        { name: 'Weighted Pull-Up', sets: 3, repRange: [6, 10], rir: 2, rest: '90 sec' },
        { name: 'Barbell Bent-Over Row', sets: 3, repRange: [8, 10], rir: 2, rest: '90 sec' },
        { name: 'Seated DB Shoulder Press', sets: 3, repRange: [8, 12], rir: 2, rest: '90 sec' },
        { name: 'Cable Lateral Raise', sets: 3, repRange: [12, 15], rir: 1, rest: '60 sec' },
        { name: 'Tricep Rope Pushdown', sets: 3, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'A' },
        { name: 'EZ Bar Curl', sets: 3, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'A' },
      ],
    },
    'lower-b': {
      name: 'Lower B',
      day: 'Thursday',
      focus: 'Hypertrophy',
      exercises: [
        { name: 'Hack Squat', sets: 3, repRange: [8, 12], rir: 2, rest: '2 min' },
        { name: 'Single-Leg Romanian Deadlift', sets: 3, repRange: [8, 10], rir: 2, rest: '90 sec', perSide: true },
        { name: 'Nordic Curl', sets: 3, repRange: [5, 8], rir: 2, rest: '2 min' },
        { name: 'Barbell Hip Thrust', sets: 3, repRange: [8, 12], rir: 2, rest: '90 sec' },
        { name: 'Leg Extension', sets: 3, repRange: [12, 15], rir: 1, rest: '60 sec', optional: true, superset: 'A' },
        { name: 'Seated Calf Raise', sets: 3, repRange: [15, 20], rir: 1, rest: '60 sec', superset: 'A' },
      ],
    },
    'upper-b': {
      name: 'Upper B',
      day: 'Friday',
      focus: 'Hypertrophy',
      exercises: [
        { name: 'Barbell Overhead Press', sets: 3, repRange: [6, 8], rir: 2, rest: '2 min' },
        { name: 'Pull-Up', sets: 3, repRange: [8, 12], rir: 2, rest: '90 sec' },
        { name: 'Incline DB Press', sets: 3, repRange: [8, 12], rir: 2, rest: '90 sec' },
        { name: 'Chest-Supported DB Row', sets: 3, repRange: [10, 12], rir: 2, rest: '90 sec' },
        { name: 'Cable Face Pull', sets: 3, repRange: [12, 15], rir: 1, rest: '60 sec', superset: 'A' },
        { name: 'Cable Lateral Raise', sets: 3, repRange: [15, 20], rir: 1, rest: '60 sec', superset: 'A' },
        { name: 'Overhead Tricep Extension', sets: 3, repRange: [10, 12], rir: 1, rest: '60 sec', optional: true, superset: 'B' },
        { name: 'Hammer Curl', sets: 3, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'B' },
      ],
    },
  },
}
