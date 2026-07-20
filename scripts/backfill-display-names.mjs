/**
 * backfill-display-names.mjs
 *
 * One-time migration: adds a `displayName` field to every exercise in the library
 * that doesn't already have one. For existing exercises, displayName = name.
 *
 * Background:
 *   Exercise `name` is now the immutable stable ID used as the DynamoDB SK key and
 *   referenced throughout workout plan slots and session records. It never changes.
 *   `displayName` is the user-facing label — it's what gets updated when an exercise
 *   is renamed via the Edit Exercises UI. Old records had no displayName; this script
 *   backfills them so all records are consistent.
 *
 *   New exercises created after this change will always have displayName set on
 *   creation (name = "<slug>-<timestamp>", displayName = user input).
 *
 * Future migration path (if full UUID keys are ever needed):
 *   1. Generate slug-timestamp IDs for all old exercise records
 *   2. Script-update workout plan slots + session records to reference the new IDs
 *   3. The display layer needs no changes — displayName is already separate from name
 *
 * ------------------------------------------------------------
 * Running the migration
 * ------------------------------------------------------------
 *
 * Prerequisites:
 *   - AWS creds in frontend/.env.local (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION)
 *
 * Dry-run first:
 *   node scripts/backfill-display-names.mjs --dry-run
 *
 * Apply:
 *   node scripts/backfill-display-names.mjs
 *
 * Idempotent: safe to re-run. Exercises that already have displayName are skipped.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DRY_RUN = process.argv.includes('--dry-run')
const TABLE = 'workout-tracker-db'

// --- Env ---
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

function log(...args) {
  console.log(DRY_RUN ? '[DRY-RUN]' : '[APPLY]', ...args)
}

async function queryAll(keyExpr, values) {
  const items = []
  let ExclusiveStartKey
  do {
    const res = await db.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: keyExpr,
      ExpressionAttributeValues: values,
      ExclusiveStartKey,
    }))
    items.push(...(res.Items || []))
    ExclusiveStartKey = res.LastEvaluatedKey
  } while (ExclusiveStartKey)
  return items
}

async function run() {
  if (DRY_RUN) console.log('Running in --dry-run mode. No writes will be performed.\n')

  const exercises = await queryAll('PK = :pk', { ':pk': 'EXERCISE_LIB' })
  console.log(`Found ${exercises.length} exercises in library`)

  let updated = 0
  let skipped = 0

  for (const ex of exercises) {
    if (ex.displayName) {
      skipped++
      continue
    }
    log(`  Setting displayName = "${ex.name}" on ${ex.SK}`)
    if (!DRY_RUN) {
      await db.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: ex.PK, SK: ex.SK },
        UpdateExpression: 'SET displayName = :dn',
        ExpressionAttributeValues: { ':dn': ex.name },
      }))
    }
    updated++
  }

  console.log(`\nUpdated: ${updated} · Skipped (already had displayName): ${skipped}`)
  if (DRY_RUN) console.log('\nRe-run without --dry-run to apply.')
  console.log('Done.')
}

run().catch(e => {
  console.error('Migration failed:', e)
  process.exit(1)
})
