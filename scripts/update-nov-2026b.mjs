import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TABLE = 'workout-tracker-db'
const PROGRAM_PK = 'PROGRAM#spring2026'

const envPath = resolve(__dirname, '../frontend/.env.local')
const env = readFileSync(envPath, 'utf8')
  .split('\n')
  .filter(l => l.includes('='))
  .reduce((acc, l) => {
    const [k, ...v] = l.split('=')
    acc[k.trim()] = v.join('=').trim()
    return acc
  }, {})

const client = new DynamoDBClient({
  region: env.AWS_REGION || env.VITE_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID || env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || env.VITE_AWS_SECRET_ACCESS_KEY,
  },
})
const db = DynamoDBDocumentClient.from(client)

// Lower A: lateral raise rep range 12–15 → 12–20
const LOWER_A = {
  name: 'Lower A',
  day: 'Monday',
  focus: 'Strength + Hypertrophy',
  exercises: [
    { slotId: 'la-squat',     name: 'Barbell Back Squat', sets: 0, repRange: null, rir: null, rest: '3–4 min', is531: true, note: '5s PRO — track manually' },
    { slotId: 'la-legpress',  name: 'Leg Press', sets: 3, repRange: [10, 12], rir: 2, rest: '90 sec', subs: [{ name: 'Bulgarian Split Squat', sets: 2, repRange: [8, 8], rir: 2, perSide: true }, 'Goblet Squat', 'Seated Leg Press Machine'] },
    { slotId: 'la-rdl',       name: 'Romanian Deadlift', sets: 3, repRange: [6, 10], rir: 2, rest: '2 min', subs: ['DB Romanian Deadlift', 'KB Romanian Deadlift'] },
    { slotId: 'la-hipthrust', name: 'Barbell Hip Thrust', sets: 2, repRange: [8, 12], rir: 1, rest: '90 sec', subs: ['DB Hip Thrust', 'KB Hip Thrust', 'Cable Hip Thrust'] },
    { slotId: 'la-calf',      name: 'Standing Calf Raise', sets: 3, repRange: [15, 20], rir: 1, rest: '60 sec', superset: 'A', subs: ['Single-Leg DB Calf Raise', 'Standing Calf Raise Machine', 'Leg Press Calf Raise'] },
    { slotId: 'la-lateral',   name: 'Cable Lateral Raise', sets: 4, repRange: [12, 20], rir: 1, rest: '60 sec', superset: 'A', subs: ['DB Lateral Raise', 'Incline Dumbbell Y Raise', 'Machine Lateral Raise'] },
  ],
}

// Lower B: Hack Squat as primary (was Pendulum Squat), Lying Leg Curl promoted in subs
const LOWER_B = {
  name: 'Lower B',
  day: 'Thursday',
  focus: 'Hypertrophy',
  exercises: [
    { slotId: 'lb-squat',   name: 'Hack Squat', sets: 3, repRange: [8, 12], rir: 2, rest: '2 min', subs: ['Pendulum Squat', 'Belt Squat', 'Front Squat', 'Goblet Squat'] },
    { slotId: 'lb-legcurl', name: 'Seated Leg Curl', sets: 3, repRange: [10, 12], rir: 1, rest: '90 sec', subs: ['Lying Leg Curl', { name: 'Nordic Curl', sets: 2, repRange: [5, 8], rir: 2 }, { name: 'Glute Ham Raise', sets: 2, repRange: [5, 8], rir: 2 }] },
    { slotId: 'lb-rdl',     name: 'Single-Leg Romanian Deadlift', sets: 2, repRange: [8, 10], rir: 2, rest: '90 sec', perSide: true, subs: ['DB Single-Leg RDL', 'KB Single-Leg RDL'] },
    { slotId: 'lb-legext',  name: 'Leg Extension', sets: 3, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'A', subs: ['Cable Leg Extension'] },
    { slotId: 'lb-calf',    name: 'Seated Calf Raise', sets: 3, repRange: [15, 20], rir: 1, rest: '60 sec', superset: 'A', subs: ['Seated DB Calf Raise', 'Leg Press Calf Raise'] },
  ],
}

// Upper B: Machine Chest-Supported Row as primary (was CS DB Row), rep ranges updated
const UPPER_B = {
  name: 'Upper B',
  day: 'Friday',
  focus: 'Hypertrophy',
  exercises: [
    { slotId: 'ub-press',    name: 'Incline DB Press', sets: 4, repRange: [8, 12], rir: 2, rest: '90 sec', subs: ['Incline Barbell Press', 'Machine Incline Press'] },
    { slotId: 'ub-pullup',   name: 'Pull-Up', sets: 3, repRange: [8, 12], rir: 2, rest: '90 sec', subs: ['Lat Pulldown', 'Band-Assisted Pull-Up'] },
    { slotId: 'ub-row',      name: 'Machine Chest-Supported Row', sets: 3, repRange: [8, 12], rir: 2, rest: '90 sec', subs: ['T-Bar Row', 'Chest-Supported DB Row', 'Single-Arm DB Row'] },
    { slotId: 'ub-fly',      name: 'Incline Cable Fly', sets: 3, repRange: [10, 12], rir: 1, rest: '60 sec', subs: ['Incline DB Fly', 'Pec Deck', 'Flat Cable Fly', 'Decline Cable Fly'] },
    { slotId: 'ub-facepull', name: 'Cable Face Pull', sets: 3, repRange: [12, 15], rir: 1, rest: '60 sec', superset: 'A', subs: ['Rear Delt Fly', 'Reverse Cable Crossover', 'Lying DB Reverse Fly'] },
    { slotId: 'ub-lateral',  name: 'Cable Lateral Raise', sets: 4, repRange: [12, 20], rir: 1, rest: '60 sec', superset: 'A', subs: ['DB Lateral Raise', 'Incline Dumbbell Y Raise', 'Machine Lateral Raise'] },
    { slotId: 'ub-tri',      name: 'Cable Overhead Tricep Extension', sets: 2, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'B', subs: ['DB Overhead Tricep Extension', 'Skullcrusher'] },
    { slotId: 'ub-curl',     name: 'Hammer Curl', sets: 3, repRange: [10, 15], rir: 1, rest: '60 sec', superset: 'B', subs: ['Cross-Body Hammer Curl'] },
  ],
}

// Upper C: lateral raise 12–20, hammer curl 10–15
const UPPER_C = {
  name: 'Upper C',
  day: 'Sunday',
  focus: 'Arms + Delts',
  exercises: [
    { slotId: 'uc-pulldown', name: 'Lat Pulldown', sets: 3, repRange: [8, 12], rir: 2, rest: '90 sec' },
    { slotId: 'uc-lateral',  name: 'Cable Lateral Raise', sets: 3, repRange: [12, 20], rir: 1, rest: '60 sec', superset: 'A', subs: ['DB Lateral Raise', 'Incline Dumbbell Y Raise', 'Machine Lateral Raise'] },
    { slotId: 'uc-facepull', name: 'Cable Face Pull', sets: 3, repRange: [12, 15], rir: 1, rest: '60 sec', superset: 'A', subs: ['Rear Delt Fly', 'Reverse Cable Crossover', 'Lying DB Reverse Fly'] },
    { slotId: 'uc-tri',      name: 'Tricep Bar Pushdown', sets: 3, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'B', subs: ['Tricep Rope Pushdown', 'Band Tricep Pushdown'] },
    { slotId: 'uc-curl',     name: 'Incline DB Curl', sets: 3, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'B' },
    { slotId: 'uc-oht',      name: 'Cable Overhead Tricep Extension', sets: 2, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'C', subs: ['DB Overhead Tricep Extension'] },
    { slotId: 'uc-hammer',   name: 'Hammer Curl', sets: 2, repRange: [10, 15], rir: 1, rest: '60 sec', superset: 'C', subs: ['Cross-Body Hammer Curl'] },
  ],
}

const updates = [
  { id: 'lower-a', data: LOWER_A },
  { id: 'lower-b', data: LOWER_B },
  { id: 'upper-b', data: UPPER_B },
  { id: 'upper-c', data: UPPER_C },
]

for (const { id, data } of updates) {
  const item = { PK: PROGRAM_PK, SK: `SESSION_TYPE#${id}`, ...data }
  console.log(`Writing ${id}...`)
  await db.send(new PutCommand({ TableName: TABLE, Item: item }))
  console.log(`  Done.`)
}

console.log('Nov 2026b migration complete.')
