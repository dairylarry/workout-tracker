/**
 * reseed.js — Manual reseed utilities for DynamoDB.
 *
 * NOT wired into the UI. Call these from the browser console only.
 *
 * ─────────────────────────────────────────────────────────────────
 * HOW TO RESEED THE EXERCISE LIBRARY (metadata only, keeps history)
 * ─────────────────────────────────────────────────────────────────
 * 1. Add to main.jsx temporarily:
 *      import { reseedExerciseLibraryMetaOnly } from './seeds/reseed'
 *      window.reseedExerciseLibraryMetaOnly = reseedExerciseLibraryMetaOnly
 *
 * 2. Push, open the deployed site, open browser console (Safari:
 *    Develop → your device → Console), and run:
 *      await window.reseedExerciseLibraryMetaOnly()
 *
 * 3. Remove the import and window line from main.jsx, push again.
 *
 * ─────────────────────────────────────────────────────────────────
 * HOW TO FULL RESEED THE EXERCISE LIBRARY (overwrites history too)
 * ─────────────────────────────────────────────────────────────────
 * Same steps but use seedExerciseLibrary from ProgramContext instead.
 * WARNING: this will wipe all exercise history arrays.
 *
 * ─────────────────────────────────────────────────────────────────
 * HOW TO RESEED THE PROGRAM CONFIG
 * ─────────────────────────────────────────────────────────────────
 * Same steps but use seedFromConfig from ProgramContext instead.
 * WARNING: this will overwrite any custom subs added via Manage Workout.
 *
 * ─────────────────────────────────────────────────────────────────
 * HOW TO BACKFILL DELOAD FLAG ON ALL EXERCISE HISTORY (ONE-TIME)
 * ─────────────────────────────────────────────────────────────────
 * Same steps but use backfillDeloadHistory.
 * WARNING: marks every existing history entry as deload: true.
 * Delete this function and its import from main.jsx after running.
 * ─────────────────────────────────────────────────────────────────
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { EXERCISE_SEED } from './exerciseLibrarySeed'
import { updateExerciseMeta, getExerciseLibrary } from '../lib/dynamodb'

const _client = new DynamoDBClient({
  region: import.meta.env.VITE_AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
})
const _docClient = DynamoDBDocumentClient.from(_client)
const TABLE = 'workout-tracker-db'

/**
 * ONE-TIME BACKFILL — delete after running.
 * Marks every existing exercise history entry as deload: true.
 * Safe to re-run (skips entries already flagged).
 */
export async function backfillDeloadHistory() {
  const exercises = await getExerciseLibrary()
  let updated = 0

  for (const ex of exercises) {
    if (!ex.history?.length) continue

    let anyChanged = false
    const newHistory = ex.history.map(h => {
      if (h.deload) return h
      anyChanged = true
      return { ...h, deload: true }
    })
    if (!anyChanged) continue

    const sk = `EXERCISE#${ex.name.toLowerCase().replace(/\s+/g, '-')}`
    await _docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: 'EXERCISE_LIB', SK: sk },
      UpdateExpression: 'SET history = :history',
      ExpressionAttributeValues: { ':history': newHistory },
    }))
    updated++
    console.log(`Updated: ${ex.name}`)
  }

  console.log(`Done. Backfilled deload flag on ${updated} exercise(s).`)
}

/**
 * Reseed exercise library metadata only.
 * Preserves history arrays — safe to run at any time after logging sessions.
 * Use this whenever exerciseLibrarySeed.js is updated.
 */
export async function reseedExerciseLibraryMetaOnly() {
  let count = 0
  for (const exercise of EXERCISE_SEED) {
    await updateExerciseMeta(exercise)
    count++
  }
  console.log(`Reseeded metadata for ${count} exercises. History preserved.`)
}
