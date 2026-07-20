// Exercise identity design:
// `name` is the immutable stable ID — used as the DynamoDB SK key and referenced
// throughout workout plan slots and session records. It never changes after creation.
// New exercises get name = "<slug>-<timestamp>" (e.g. "low-bar-squat-1737500000000").
// Old exercises (pre-displayName) keep their human-readable names as IDs.
//
// `displayName` is the user-facing label; editing an exercise only updates this field.
// All exercise records now have displayName set (see scripts/backfill-display-names.mjs).
// Session exercises are enriched with displayName at load time from the library.
//
// Current asymmetry: old exercises have human-readable name IDs; new ones have slug-timestamp IDs.
// Future migration to resolve this:
//   1. Generate slug-timestamp IDs for all old exercise records
//   2. Script-update workout plan slots + session records to reference the new IDs
//   3. The display layer needs no changes — displayName is already separate

// One-off lookup by stable name ID when you don't have the full exercise object.
export function getDisplayName(name, exerciseLibrary) {
  return exerciseLibrary?.find(e => e.name === name)?.displayName || name
}

// Adds displayName to an exercise object by looking up the active name (swappedName ?? name) in the library.
export function enrichExercise(ex, exerciseLibrary) {
  const activeName = ex.swappedName || ex.name
  return {
    ...ex,
    displayName: exerciseLibrary?.find(e => e.name === activeName)?.displayName || activeName,
  }
}
