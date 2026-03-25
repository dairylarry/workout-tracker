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
 * ─────────────────────────────────────────────────────────────────
 */

import { EXERCISE_SEED } from './exerciseLibrarySeed'
import { updateExerciseMeta } from '../lib/dynamodb'

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
