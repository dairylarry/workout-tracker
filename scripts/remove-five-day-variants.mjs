/**
 * remove-five-day-variants.mjs
 *
 * Deletes the upper-a-5 and upper-b-5 session type records from DynamoDB.
 * These were auto-seeded by ProgramContext but are no longer needed —
 * the 5-day volume adjustment is handled by a toggle in the session UI instead.
 *
 * No session records are affected (none were ever saved for these types).
 *
 * Usage:
 *   node scripts/remove-five-day-variants.mjs
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb'

const __dirname = dirname(fileURLToPath(import.meta.url))

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
const TABLE = 'workout-tracker-db'
const PROGRAM_PK = 'PROGRAM#spring2026'

const TO_DELETE = ['upper-a-5', 'upper-b-5']

for (const stId of TO_DELETE) {
  const key = { PK: PROGRAM_PK, SK: `SESSION_TYPE#${stId}` }
  await db.send(new DeleteCommand({ TableName: TABLE, Key: key }))
  console.log(`Deleted ${stId}`)
}

console.log('Done.')
