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

const LOWER_A = {
  name: 'Lower A',
  day: 'Monday',
  focus: 'Strength + Hypertrophy',
  exercises: [
    { slotId: 'la-squat',     name: 'Barbell Back Squat', sets: 0, repRange: null, rir: null, rest: '3–4 min', is531: true, note: '5s PRO — track manually' },
    { slotId: 'la-legpress',  name: 'Leg Press', sets: 3, repRange: [10, 12], rir: 2, rest: '90 sec', subs: [{ name: 'Bulgarian Split Squat', sets: 2, repRange: [8, 8], rir: 2, perSide: true }, 'Goblet Squat', 'Seated Leg Press Machine'] },
    { slotId: 'la-rdl',       name: 'Romanian Deadlift', sets: 3, repRange: [6, 10], rir: 2, rest: '2 min', subs: ['DB Romanian Deadlift', 'KB Romanian Deadlift'] },
    { slotId: 'la-hipthrust', name: 'Barbell Hip Thrust', sets: 2, repRange: [8, 12], rir: 1, rest: '90 sec', subs: ['DB Hip Thrust', 'KB Hip Thrust', 'Cable Hip Thrust'] },
    { slotId: 'la-calf',      name: 'Standing Calf Raise', sets: 3, repRange: [15, 20], rir: 1, rest: '60 sec', subs: ['Single-Leg DB Calf Raise', 'Standing Calf Raise Machine', 'Leg Press Calf Raise'] },
  ],
}

const UPPER_A = {
  name: 'Upper A',
  day: 'Tuesday',
  focus: 'Strength + Hypertrophy',
  exercises: [
    { slotId: 'ua-bench',   name: 'Flat Barbell Bench Press', sets: 0, repRange: null, rir: null, rest: '3–4 min', is531: true, note: '5s PRO — track manually' },
    { slotId: 'ua-pullup',  name: 'Weighted Pull-Up', sets: 4, repRange: [6, 10], rir: 2, rest: '90 sec', subs: ['Lat Pulldown', 'Band-Assisted Pull-Up', 'Pull-Up'] },
    { slotId: 'ua-row',     name: 'Seated Cable Row', sets: 3, repRange: [8, 12], rir: 2, rest: '90 sec', subs: ['Barbell Bent-Over Row', 'DB Bent-Over Row'] },
    { slotId: 'ua-press',   name: 'Seated DB Shoulder Press', sets: 3, repRange: [8, 12], rir: 2, rest: '90 sec', subs: ['Standing DB Shoulder Press', 'Machine Shoulder Press'] },
    { slotId: 'ua-lateral', name: 'Cable Lateral Raise', sets: 4, repRange: [12, 15], rir: 1, rest: '60 sec', subs: ['DB Lateral Raise', 'Incline Dumbbell Y Raise', 'Machine Lateral Raise'] },
    { slotId: 'ua-fly',     name: 'Incline Cable Fly', sets: 2, repRange: [10, 12], rir: 1, rest: '60 sec', subs: ['Incline DB Fly', 'Pec Deck', 'Flat Cable Fly', 'Decline Cable Fly'] },
    { slotId: 'ua-tri',     name: 'EZ Bar Skullcrusher', sets: 4, repRange: [8, 12], rir: 1, rest: '60 sec', superset: 'A', subs: ['Overhead Cable Extension'] },
    { slotId: 'ua-curl',    name: 'EZ Bar Curl', sets: 4, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'A', subs: ['DB Curl', 'Barbell Curl', 'Bicep Curl Machine', 'DB Preacher Curl', 'EZ Preacher Curl'] },
  ],
}

const updates = [
  { id: 'lower-a', data: LOWER_A },
  { id: 'upper-a', data: UPPER_A },
]

for (const { id, data } of updates) {
  const item = { PK: PROGRAM_PK, SK: `SESSION_TYPE#${id}`, ...data }
  console.log(`Writing ${id}...`)
  await db.send(new PutCommand({ TableName: TABLE, Item: item }))
  console.log(`  Done.`)
}

console.log('Fall 2026 migration complete.')
