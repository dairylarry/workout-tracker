export const PROGRAM = {
  name: 'Spring 2026',
  sessionTypes: {
    'lower-a': {
      name: 'Lower A',
      day: 'Monday',
      focus: 'Strength + Hypertrophy',
      exercises: [
        { name: 'Barbell Back Squat', sets: 0, repRange: null, rir: null, rest: '3–4 min', is531: true, note: '5s PRO — track manually' },
        { name: 'Leg Press', sets: 3, repRange: [10, 15], rir: 2, rest: '90 sec', subs: [{ name: 'Bulgarian Split Squat', sets: 2, repRange: [8, 8], rir: 2, perSide: true }, 'Goblet Squat'] },
        { name: 'Romanian Deadlift', sets: 3, repRange: [6, 10], rir: 2, rest: '2 min', subs: ['DB Romanian Deadlift', 'KB Romanian Deadlift'] },
        { name: 'Barbell Hip Thrust', sets: 2, repRange: [8, 12], rir: 2, rest: '90 sec', subs: ['DB Hip Thrust', 'KB Hip Thrust'] },
        { name: 'Standing Calf Raise', sets: 3, repRange: [15, 20], rir: 1, rest: '60 sec', subs: ['Single-Leg DB Calf Raise'] },
      ],
    },
    'upper-a': {
      name: 'Upper A',
      day: 'Tuesday',
      focus: 'Strength + Hypertrophy',
      exercises: [
        { name: 'Flat Barbell Bench Press', sets: 0, repRange: null, rir: null, rest: '3–4 min', is531: true, note: '5s PRO — track manually' },
        { name: 'Weighted Pull-Up', sets: 4, repRange: [6, 10], rir: 2, rest: '90 sec', subs: ['Lat Pulldown', 'Band-Assisted Pull-Up', 'Pull-Up'] },
        { name: 'Seated Cable Row', sets: 3, repRange: [8, 10], rir: 2, rest: '90 sec', subs: ['Barbell Bent-Over Row', 'DB Bent-Over Row'] },
        { name: 'Seated DB Shoulder Press', sets: 3, repRange: [8, 12], rir: 2, rest: '90 sec', subs: ['Standing DB Shoulder Press', 'Machine Shoulder Press'] },
        { name: 'Cable Lateral Raise', sets: 4, repRange: [12, 15], rir: 1, rest: '60 sec', subs: ['DB Lateral Raise'] },
        { name: 'Incline Cable Fly', sets: 2, repRange: [12, 15], rir: 1, rest: '60 sec', subs: ['Incline DB Fly', 'Pec Deck', 'Flat Cable Fly', 'Decline Cable Fly'] },
        { name: 'Tricep Rope Pushdown', sets: 4, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'A', subs: ['Tricep Bar Pushdown', 'Band Tricep Pushdown'] },
        { name: 'EZ Bar Curl', sets: 4, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'A', subs: ['DB Curl', 'Barbell Curl'] },
      ],
    },
    'lower-b': {
      name: 'Lower B',
      day: 'Thursday',
      focus: 'Hypertrophy',
      exercises: [
        { name: 'Pendulum Squat', sets: 3, repRange: [8, 12], rir: 2, rest: '2 min', subs: ['Hack Squat', 'Front Squat', 'Goblet Squat'] },
        { name: 'Seated Leg Curl', sets: 3, repRange: [10, 12], rir: 2, rest: '90 sec', subs: [{ name: 'Nordic Curl', sets: 2, repRange: [5, 8], rir: 2 }, { name: 'Glute Ham Raise', sets: 2, repRange: [5, 8], rir: 2 }, 'Lying Leg Curl'] },
        { name: 'Single-Leg Romanian Deadlift', sets: 2, repRange: [8, 10], rir: 2, rest: '90 sec', perSide: true, subs: ['DB Single-Leg RDL', 'KB Single-Leg RDL'] },
        { name: 'Leg Extension', sets: 3, repRange: [12, 15], rir: 1, rest: '60 sec', superset: 'A', subs: ['Cable Leg Extension'] },
        { name: 'Seated Calf Raise', sets: 3, repRange: [15, 20], rir: 1, rest: '60 sec', superset: 'A', subs: ['Seated DB Calf Raise'] },
      ],
    },
    'upper-b': {
      name: 'Upper B',
      day: 'Friday',
      focus: 'Hypertrophy',
      exercises: [
        { name: 'Incline DB Press', sets: 4, repRange: [8, 12], rir: 2, rest: '90 sec', subs: ['Incline Barbell Press', 'Machine Incline Press'] },
        { name: 'Pull-Up', sets: 3, repRange: [8, 12], rir: 2, rest: '90 sec', subs: ['Lat Pulldown', 'Band-Assisted Pull-Up'] },
        { name: 'Chest-Supported DB Row', sets: 3, repRange: [10, 12], rir: 2, rest: '90 sec', subs: ['Single-Arm DB Row', 'Machine Row'] },
        { name: 'Incline Cable Fly', sets: 3, repRange: [12, 15], rir: 1, rest: '60 sec', subs: ['Incline DB Fly', 'Pec Deck', 'Flat Cable Fly', 'Decline Cable Fly'] },
        { name: 'Cable Face Pull', sets: 3, repRange: [12, 15], rir: 1, rest: '60 sec', superset: 'A', subs: ['Band Face Pull', 'Rear Delt Fly'] },
        { name: 'Cable Lateral Raise', sets: 4, repRange: [15, 20], rir: 1, rest: '60 sec', superset: 'A', subs: ['DB Lateral Raise'] },
        { name: 'Cable Overhead Tricep Extension', sets: 2, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'B', subs: ['DB Overhead Tricep Extension'] },
        { name: 'Hammer Curl', sets: 3, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'B', subs: ['Cross-Body Hammer Curl'] },
      ],
    },
  },
}
