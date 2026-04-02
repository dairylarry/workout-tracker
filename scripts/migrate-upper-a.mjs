/**
 * One-time migration: fix Upper A slot indices for the 2026-03-24 session.
 *
 * Incline Cable Fly was inserted at slot 5 (between Cable Lateral Raise and
 * Tricep Rope Pushdown) after the 2026-03-24 session. This shifts slots 5/6/7
 * off by one in that session. Fix: insert an empty Incline Cable Fly entry at
 * index 5 so slot-based history reads correctly going forward.
 *
 * Before (2026-03-24 session exercises):
 *   [0] Flat Barbell Bench Press
 *   [1] Weighted Pull-Up
 *   [2] Seated Cable Row
 *   [3] Seated DB Shoulder Press
 *   [4] Cable Lateral Raise
 *   [5] Tricep Rope Pushdown  ← should be slot 6
 *   [6] EZ Bar Curl           ← should be slot 7
 *
 * After:
 *   [0] Flat Barbell Bench Press
 *   [1] Weighted Pull-Up
 *   [2] Seated Cable Row
 *   [3] Seated DB Shoulder Press
 *   [4] Cable Lateral Raise
 *   [5] Incline Cable Fly (empty placeholder)
 *   [6] Tricep Rope Pushdown
 *   [7] EZ Bar Curl
 *
 * Run with:
 *   AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=xxx AWS_REGION=xxx node migrate-upper-a.mjs
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

const TABLE = 'workout-tracker-db'
const SESSION_TYPE = 'upper-a'
const SESSION_DATE = '2026-03-24'
const INSERT_AT_INDEX = 5
const INSERT_EXERCISE = {
  name: 'Incline Cable Fly',
  weightUnit: 'lbs',
  sets: [],
}

const region = process.env.AWS_REGION || process.env.VITE_AWS_REGION
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.VITE_AWS_ACCESS_KEY_ID
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.VITE_AWS_SECRET_ACCESS_KEY

if (!region || !accessKeyId || !secretAccessKey) {
  console.error('Missing credentials. Run with:')
  console.error('  AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=xxx AWS_REGION=xxx node migrate-upper-a.mjs')
  process.exit(1)
}

const client = new DynamoDBClient({ region, credentials: { accessKeyId, secretAccessKey } })
const db = DynamoDBDocumentClient.from(client)

async function run() {
  const PK = `SESSION#${SESSION_TYPE}`
  const SK = `DATE#${SESSION_DATE}`

  console.log(`Fetching session: ${PK} / ${SK}`)
  const { Item: session } = await db.send(new GetCommand({ TableName: TABLE, Key: { PK, SK } }))

  if (!session) {
    console.error('Session not found. Double-check the date and session type.')
    process.exit(1)
  }

  const exercises = session.exercises || []
  console.log(`\nCurrent exercises (${exercises.length}):`)
  exercises.forEach((ex, i) => {
    console.log(`  [${i}] ${ex.name}${ex.swappedName ? ` → ${ex.swappedName}` : ''}`)
  })

  if (exercises[INSERT_AT_INDEX]?.name === INSERT_EXERCISE.name) {
    console.log('\nIncline Cable Fly already at slot 5 — nothing to do.')
    process.exit(0)
  }

  const updated = [
    ...exercises.slice(0, INSERT_AT_INDEX),
    INSERT_EXERCISE,
    ...exercises.slice(INSERT_AT_INDEX),
  ]

  console.log(`\nUpdated exercises (${updated.length}):`)
  updated.forEach((ex, i) => {
    console.log(`  [${i}] ${ex.name}${ex.swappedName ? ` → ${ex.swappedName}` : ''}`)
  })

  console.log('\nWriting to DynamoDB...')
  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK, SK },
    UpdateExpression: 'SET exercises = :exercises',
    ExpressionAttributeValues: { ':exercises': updated },
  }))

  console.log('Done. Slot indices for 2026-03-24 are now correct.')
}

run().catch(e => {
  console.error('Migration failed:', e)
  process.exit(1)
})
