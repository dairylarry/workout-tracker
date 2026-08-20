import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TABLE = 'workout-tracker-db'

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

const ROUND_EXERCISES = [
  { name: 'Hollow Body Hold',     workSeconds: 45, restSeconds: 0,  cue: 'long body, rib cage down, press lower back into mat' },
  { name: 'Reverse Plank',        workSeconds: 45, restSeconds: 0,  cue: 'hips up, squeeze glutes, drive heels into floor' },
  { name: 'Plank Shoulder Tap',   workSeconds: 45, restSeconds: 0,  cue: 'hips still, feet wide if needed, slow taps' },
  { name: 'Left Side Plank Hold', workSeconds: 45, restSeconds: 0,  cue: 'hips stacked, drive top hip to ceiling' },
  { name: 'Right Side Plank Hold',workSeconds: 45, restSeconds: 40, cue: 'hips stacked, drive top hip to ceiling' },
]

const updated = {
  id: 'ground-level',
  name: 'Ground Level',
  category: 'mat',
  difficulty: 3,
  equipment: 'mat',
  equipmentOptional: 'dumbbell or kettlebell',
  routine: [
    {
      label: 'Warm-up',
      numberOfTimes: 1,
      exercises: [
        { name: 'Dead Bug (alternating arm and leg)', workSeconds: 45, restSeconds: 0, cue: 'lower back pinned to mat, move only as far as you can control' },
      ],
    },
    {
      label: 'Round 1',
      numberOfTimes: 1,
      exercises: ROUND_EXERCISES,
    },
    {
      label: 'Round 2',
      numberOfTimes: 1,
      exercises: ROUND_EXERCISES.map((ex, i) =>
        i === ROUND_EXERCISES.length - 1 ? { ...ex, restSeconds: 0 } : ex
      ),
    },
    {
      label: 'Finisher',
      numberOfTimes: 1,
      exercises: [
        { name: 'Forearm Plank Hold', workSeconds: 45, restSeconds: 0, cue: 'full tension, RKC grip, squeeze everything' },
      ],
    },
  ],
  notes: 'Post-strength finisher. Two rounds of five holds with a 40s rest between rounds.',
  progressions: [
    'Harder variation: hollow hold → hollow body rock; dead bug → 3-second lowering.',
    'Reduce rest: cut the inter-round rest from 40s to 20s.',
    'Add load: hold a light dumbbell or kettlebell overhead on dead bug and hollow hold.',
  ],
}

const item = {
  PK: 'CORE_ROUTINE',
  SK: `ROUTINE#${updated.id}`,
  ...updated,
}

console.log('Writing ground-level routine...')
await db.send(new PutCommand({ TableName: TABLE, Item: item }))
console.log('Done.')
