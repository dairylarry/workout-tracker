/**
 * export-csv.mjs
 *
 * Exports all DynamoDB data to CSV files in the exports/ folder.
 * Output files:
 *   exports/session_history.csv  — one row per set, sourced from SESSION#* records
 *   exports/exercise_history.csv — one row per set, sourced from EXERCISE_LIB history cache
 *
 * Usage:
 *   node scripts/export-csv.mjs
 *
 * Requires AWS credentials in frontend/.env.local:
 *   AWS_ACCESS_KEY_ID=...    (or VITE_AWS_ACCESS_KEY_ID)
 *   AWS_SECRET_ACCESS_KEY=... (or VITE_AWS_SECRET_ACCESS_KEY)
 *   AWS_REGION=...           (or VITE_AWS_REGION)
 *
 * Note: session_history.csv is the full ground truth.
 *       exercise_history.csv is the denormalized cache (max 20 entries per exercise)
 *       and may not include older sessions.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// --- Load env ---
const envPath = resolve(ROOT, 'frontend/.env.local')
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
const SESSION_TYPES = ['lower-a', 'upper-a', 'lower-b', 'upper-b']

// --- CSV helpers ---

function escapeCsv(val) {
  if (val == null) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function toCsvRow(fields) {
  return fields.map(escapeCsv).join(',')
}

// --- Query helpers ---

async function queryAll(pk) {
  const items = []
  let lastKey = undefined
  do {
    const res = await db.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': pk },
      ExclusiveStartKey: lastKey,
    }))
    items.push(...(res.Items || []))
    lastKey = res.LastEvaluatedKey
  } while (lastKey)
  return items
}

// --- session_history.csv ---

async function exportSessionHistory(today, outDir) {
  console.log('Fetching session history...')
  const allSessions = []
  for (const st of SESSION_TYPES) {
    const items = await queryAll(`SESSION#${st}`)
    allSessions.push(...items)
  }
  allSessions.sort((a, b) => a.date.localeCompare(b.date))

  const header = ['date', 'session_type', 'deload', 'exercise_name', 'original_name', 'slot_index', 'supplemental', 'set_number', 'weight', 'weight_unit', 'reps', 'rir', 'notes']
  const rows = [header.join(',')]

  for (const session of allSessions) {
    const exercises = session.exercises || []
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i]
      const sets = ex.sets || []
      if (sets.length === 0) continue

      const exerciseName = ex.swappedName || ex.name
      const originalName = ex.name
      const isSupplemental = ex.supplemental ? 'true' : 'false'
      const slotIndex = ex.supplemental ? '' : i

      for (let s = 0; s < sets.length; s++) {
        const set = sets[s]
        rows.push(toCsvRow([
          session.date,
          session.sessionType,
          session.deload ? 'true' : 'false',
          exerciseName,
          originalName,
          slotIndex,
          isSupplemental,
          s + 1,
          set.weight ?? '',
          ex.weightUnit || 'lbs',
          set.reps ?? '',
          set.rir ?? '',
          session.notes || '',
        ]))
      }
    }
  }

  const outPath = resolve(outDir, `session_history_${today}.csv`)
  writeFileSync(outPath, rows.join('\n'), 'utf8')
  console.log(`  ✓ ${rows.length - 1} set rows → exports/${today}/session_history_${today}.csv`)
}

// --- exercise_history.csv ---

async function exportExerciseHistory(today, outDir) {
  console.log('Fetching exercise library history...')
  const items = await queryAll('EXERCISE_LIB')

  const header = ['exercise_name', 'date', 'session_type', 'slot_index', 'supplemental', 'set_number', 'weight', 'weight_unit', 'reps', 'rir']
  const rows = [header.join(',')]

  for (const item of items) {
    const history = item.history || []
    for (const entry of history) {
      const sets = entry.sets || []
      for (let s = 0; s < sets.length; s++) {
        const set = sets[s]
        rows.push(toCsvRow([
          item.name,
          entry.date,
          entry.sessionType,
          entry.supplemental ? '' : (entry.slotIndex ?? ''),
          entry.supplemental ? 'true' : 'false',
          s + 1,
          set.weight ?? '',
          entry.weightUnit || 'lbs',
          set.reps ?? '',
          set.rir ?? '',
        ]))
      }
    }
  }

  const outPath = resolve(outDir, `exercise_history_${today}.csv`)
  writeFileSync(outPath, rows.join('\n'), 'utf8')
  console.log(`  ✓ ${rows.length - 1} set rows → exports/${today}/exercise_history_${today}.csv`)
}

// --- Main ---

async function main() {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const outDir = resolve(ROOT, `exports/${today}`)
  mkdirSync(outDir, { recursive: true })
  await exportSessionHistory(today, outDir)
  await exportExerciseHistory(today, outDir)
  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
