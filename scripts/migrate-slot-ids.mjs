/**
 * migrate-slot-ids.mjs
 *
 * One-time migration for the 5-day-split rollout. Adds stable `slotId` fields to:
 *   1. Existing session-type configs in DynamoDB (PROGRAM#spring2026 / SESSION_TYPE#*)
 *   2. Every historical session record (SESSION#{type} / DATE#{date})
 *
 * Without this, old session-type configs loaded from DynamoDB have no slotId,
 * and history lookup across analogous sessions (e.g. upper-a ↔ upper-a-5) silently
 * falls back to array-index matching.
 *
 * ------------------------------------------------------------
 * Running the migration
 * ------------------------------------------------------------
 *
 * Prerequisites:
 *   - Deploy the code changes first (programConfigSeed.js, ActiveSession.jsx, StartSession.jsx).
 *     The new upper-c / upper-a-5 / upper-b-5 session types will auto-seed on first app load
 *     (ProgramContext detects missing session types). This migration handles the existing types.
 *   - AWS creds in frontend/.env.local (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION)
 *
 * Recommended order:
 *   1. Dry-run first to preview:
 *        node scripts/migrate-slot-ids.mjs --dry-run
 *   2. Apply:
 *        node scripts/migrate-slot-ids.mjs
 *   3. Open the app — ProgramContext seeds the 3 new session types automatically.
 *   4. (Optional) Re-run sync-check.mjs to confirm no drift.
 *
 * Idempotent: safe to re-run. Records that already have the correct slotId are skipped.
 *
 * ------------------------------------------------------------
 * What it does
 * ------------------------------------------------------------
 *
 * Phase 1 — Session type configs:
 *   For each of lower-a, upper-a, lower-b, upper-b, writes the updated config from the
 *   local seed (which now includes slotIds). New types (upper-c, upper-a-5, upper-b-5)
 *   are seeded by the app on next load — skipped here to keep responsibilities clear.
 *
 * Phase 2 — Session records:
 *   For each session record in DynamoDB, matches each exercise to the program config by
 *   array index (the existing contract), copies slotId from the config onto the exercise,
 *   and writes the record back. Supplemental exercises (added via the add-on flow) have
 *   no slotId and are left alone.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DRY_RUN = process.argv.includes('--dry-run')
const TABLE = 'workout-tracker-db'
const PROGRAM_PK = 'PROGRAM#spring2026'

// Only these existing types are re-seeded here. The new types (upper-c, upper-a-5,
// upper-b-5) auto-seed from the frontend on next app load.
const EXISTING_SESSION_TYPES = ['lower-a', 'upper-a', 'lower-b', 'upper-b']

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

// --- Load seed program from source of truth ---
const { PROGRAM } = await import(resolve(__dirname, '../frontend/src/seeds/programConfigSeed.js'))

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

// --- Phase 1: re-seed existing session type configs ---
async function migrateSessionTypes() {
  console.log('\n=== Phase 1: session type configs ===')
  for (const stId of EXISTING_SESSION_TYPES) {
    const config = PROGRAM.sessionTypes[stId]
    if (!config) {
      console.warn(`  Skipping ${stId} — not in local seed`)
      continue
    }
    const missingSlotIds = config.exercises.filter(ex => !ex.slotId)
    if (missingSlotIds.length > 0) {
      console.warn(`  Skipping ${stId} — seed exercises missing slotId:`, missingSlotIds.map(e => e.name))
      continue
    }
    log(`  Re-seeding ${stId} (${config.exercises.length} exercises)`)
    if (!DRY_RUN) {
      await db.send(new PutCommand({
        TableName: TABLE,
        Item: { PK: PROGRAM_PK, SK: `SESSION_TYPE#${stId}`, ...config },
      }))
    }
  }
}

// --- Phase 2: backfill slotId on historical session records ---
async function migrateSessionRecords() {
  console.log('\n=== Phase 2: session records ===')
  let totalTouched = 0
  let totalSkipped = 0

  // Include the NEW session types too, in case any test sessions were created before migration.
  const allTypes = [...EXISTING_SESSION_TYPES, 'upper-c', 'upper-a-5', 'upper-b-5']

  for (const stId of allTypes) {
    const config = PROGRAM.sessionTypes[stId]
    if (!config) continue

    const sessions = await queryAll('PK = :pk', { ':pk': `SESSION#${stId}` })
    console.log(`\n  ${stId}: ${sessions.length} sessions`)

    for (const session of sessions) {
      const exercises = session.exercises || []
      let changed = false
      const updated = exercises.map((ex, i) => {
        if (ex.supplemental) return ex // supplementals don't have a slot
        if (ex.slotId) return ex // already migrated
        const cfg = config.exercises[i]
        if (!cfg?.slotId) return ex // no config match for this index
        changed = true
        return { ...ex, slotId: cfg.slotId }
      })

      if (!changed) {
        totalSkipped++
        continue
      }

      const date = session.date || session.SK?.replace('DATE#', '')
      log(`    ${date}: adding slotIds to ${updated.filter((e, i) => e.slotId && !exercises[i].slotId).length} exercises`)
      totalTouched++

      if (!DRY_RUN) {
        await db.send(new UpdateCommand({
          TableName: TABLE,
          Key: { PK: session.PK, SK: session.SK },
          UpdateExpression: 'SET exercises = :exercises',
          ExpressionAttributeValues: { ':exercises': updated },
        }))
      }
    }
  }

  console.log(`\n  Updated: ${totalTouched} sessions · Skipped (already migrated or no match): ${totalSkipped}`)
}

async function run() {
  if (DRY_RUN) console.log('Running in --dry-run mode. No writes will be performed.\n')
  await migrateSessionTypes()
  await migrateSessionRecords()
  console.log('\nDone.')
  if (DRY_RUN) console.log('Re-run without --dry-run to apply.')
}

run().catch(e => {
  console.error('Migration failed:', e)
  process.exit(1)
})
