# Five-Day Split — Implementation Addendum

Changes required to support Upper C, Upper A-5, and Upper B-5 as session options.

---

## Stable Slot IDs

Before adding new session types, introduce stable `slotId` fields on every exercise in the program config. This replaces fragile array-index-based history lookup and eliminates the need for a hardcoded `ANALOGOUS_SESSION_TYPES` map.

### Design
- Each exercise slot gets a short human-readable ID (e.g. `ua-bench`, `lb-squat`)
- Analogous exercises across session variants share the **same** `slotId` — `upper-a` and `upper-a-5` both use `ua-bench`, `ua-lateral`, etc.
- At runtime, derive a `slotIdToSessionTypes` map from the program config (not hardcoded)
- History lookup: query all session types that contain the target `slotId`, find the matching exercise by `slotId` (not array index) within each session

### SlotId scheme

**Lower A**
| slotId | Exercise |
|---|---|
| `la-squat` | Barbell Back Squat |
| `la-legpress` | Leg Press |
| `la-rdl` | Romanian Deadlift |
| `la-hipthrust` | Barbell Hip Thrust |
| `la-calf` | Standing Calf Raise |

**Upper A + Upper A-5 (shared)**
| slotId | Exercise |
|---|---|
| `ua-bench` | Flat Barbell Bench Press |
| `ua-pullup` | Weighted Pull-Up |
| `ua-row` | Seated Cable Row |
| `ua-press` | Seated DB Shoulder Press |
| `ua-lateral` | Cable Lateral Raise |
| `ua-fly` | Incline Cable Fly |
| `ua-tri` | Tricep Rope Pushdown |
| `ua-curl` | EZ Bar Curl |

**Lower B**
| slotId | Exercise |
|---|---|
| `lb-squat` | Pendulum Squat |
| `lb-legcurl` | Seated Leg Curl |
| `lb-rdl` | Single-Leg Romanian Deadlift |
| `lb-legext` | Leg Extension |
| `lb-calf` | Seated Calf Raise |

**Upper B + Upper B-5 (shared)**
| slotId | Exercise |
|---|---|
| `ub-press` | Incline DB Press |
| `ub-pullup` | Pull-Up |
| `ub-row` | Chest-Supported DB Row |
| `ub-fly` | Incline Cable Fly |
| `ub-facepull` | Cable Face Pull |
| `ub-lateral` | Cable Lateral Raise |
| `ub-tri` | Cable Overhead Tricep Extension |
| `ub-curl` | Hammer Curl |

**Upper C**
| slotId | Exercise |
|---|---|
| `uc-pulldown` | Lat Pulldown |
| `uc-lateral` | Cable Lateral Raise |
| `uc-facepull` | Cable Face Pull |
| `uc-tri` | Tricep Rope Pushdown |
| `uc-curl` | Incline DB Curl |
| `uc-oht` | Cable Overhead Tricep Extension |
| `uc-hammer` | Hammer Curl |

### Migration
Existing session records in DynamoDB do not have `slotId`. A one-time migration script (`scripts/migrate-slot-ids.mjs`) should:
1. Load all sessions across all session types
2. Match each exercise to the program config by array index (current behavior)
3. Write the corresponding `slotId` onto each exercise object
4. PutItem the updated session back to DynamoDB

Run this after deploying the seed changes but before relying on slotId-based history.

---

## New Session Types

Add `slotId` to all exercises. Configs below include IDs.

### `upper-c` — Upper C (Arms + Delts, Sunday)
```js
{
  name: 'Upper C',
  day: 'Sunday',
  focus: 'Arms + Delts',
  exercises: [
    { slotId: 'uc-pulldown', name: 'Lat Pulldown', sets: 3, repRange: [8, 12], rir: 2, rest: '90 sec' },
    { slotId: 'uc-lateral',  name: 'Cable Lateral Raise', sets: 3, repRange: [12, 15], rir: 1, rest: '60 sec', superset: 'A', subs: ['DB Lateral Raise', 'Incline Dumbbell Y Raise', 'Machine Lateral Raise'] },
    { slotId: 'uc-facepull', name: 'Cable Face Pull', sets: 3, repRange: [12, 15], rir: 1, rest: '60 sec', superset: 'A', subs: ['Rear Delt Fly', 'Reverse Cable Crossover', 'Lying DB Reverse Fly'] },
    { slotId: 'uc-tri',      name: 'Tricep Bar Pushdown', sets: 3, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'B', subs: ['Tricep Rope Pushdown', 'Band Tricep Pushdown'] },
    { slotId: 'uc-curl',     name: 'Incline DB Curl', sets: 3, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'B' },
    { slotId: 'uc-oht',      name: 'Cable Overhead Tricep Extension', sets: 2, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'C', subs: ['DB Overhead Tricep Extension'] },
    { slotId: 'uc-hammer',   name: 'Hammer Curl', sets: 2, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'C', subs: ['Cross-Body Hammer Curl'] },
  ],
}
```

### `upper-a-5` — Upper A (5-day variant)
Same `slotId`s as `upper-a` — shared IDs enable unified history lookup.
```js
{
  name: 'Upper A-5',
  day: 'Tuesday',
  focus: 'Strength + Hypertrophy',
  exercises: [
    { slotId: 'ua-bench',   name: 'Flat Barbell Bench Press', sets: 0, repRange: null, rir: null, rest: '3–4 min', is531: true, note: '5s PRO — track manually' },
    { slotId: 'ua-pullup',  name: 'Weighted Pull-Up', sets: 4, repRange: [6, 10], rir: 2, rest: '90 sec', subs: ['Lat Pulldown', 'Band-Assisted Pull-Up', 'Pull-Up'] },
    { slotId: 'ua-row',     name: 'Seated Cable Row', sets: 3, repRange: [8, 12], rir: 2, rest: '90 sec', subs: ['Barbell Bent-Over Row', 'DB Bent-Over Row'] },
    { slotId: 'ua-press',   name: 'Seated DB Shoulder Press', sets: 3, repRange: [8, 12], rir: 2, rest: '90 sec', subs: ['Standing DB Shoulder Press', 'Machine Shoulder Press'] },
    { slotId: 'ua-lateral', name: 'Cable Lateral Raise', sets: 4, repRange: [12, 15], rir: 1, rest: '60 sec', subs: ['DB Lateral Raise', 'Incline Dumbbell Y Raise', 'Machine Lateral Raise'] },
    { slotId: 'ua-fly',     name: 'Incline Cable Fly', sets: 2, repRange: [10, 12], rir: 1, rest: '60 sec', subs: ['Incline DB Fly', 'Pec Deck', 'Flat Cable Fly', 'Decline Cable Fly'] },
    { slotId: 'ua-tri',     name: 'Tricep Bar Pushdown', sets: 3, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'A', subs: ['Tricep Rope Pushdown', 'Band Tricep Pushdown'] },
    { slotId: 'ua-curl',    name: 'EZ Bar Curl', sets: 3, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'A', subs: ['DB Curl', 'Barbell Curl', 'Bicep Curl Machine', 'DB Preacher Curl', 'EZ Preacher Curl'] },
  ],
}
```

### `upper-b-5` — Upper B (5-day variant)
Same `slotId`s as `upper-b`.
```js
{
  name: 'Upper B-5',
  day: 'Friday',
  focus: 'Hypertrophy',
  exercises: [
    { slotId: 'ub-press',    name: 'Incline DB Press', sets: 4, repRange: [8, 12], rir: 2, rest: '90 sec', subs: ['Incline Barbell Press', 'Machine Incline Press'] },
    { slotId: 'ub-pullup',   name: 'Pull-Up', sets: 3, repRange: [8, 12], rir: 2, rest: '90 sec', subs: ['Lat Pulldown', 'Band-Assisted Pull-Up'] },
    { slotId: 'ub-row',      name: 'Chest-Supported DB Row', sets: 3, repRange: [10, 12], rir: 2, rest: '90 sec', subs: ['Single-Arm DB Row', 'Machine Row', 'Machine Chest-Supported Row'] },
    { slotId: 'ub-fly',      name: 'Incline Cable Fly', sets: 3, repRange: [10, 12], rir: 1, rest: '60 sec', subs: ['Incline DB Fly', 'Pec Deck', 'Flat Cable Fly', 'Decline Cable Fly'] },
    { slotId: 'ub-facepull', name: 'Cable Face Pull', sets: 3, repRange: [12, 15], rir: 1, rest: '60 sec', superset: 'A', subs: ['Rear Delt Fly', 'Reverse Cable Crossover', 'Lying DB Reverse Fly'] },
    { slotId: 'ub-lateral',  name: 'Cable Lateral Raise', sets: 3, repRange: [12, 15], rir: 1, rest: '60 sec', superset: 'A', subs: ['DB Lateral Raise', 'Incline Dumbbell Y Raise', 'Machine Lateral Raise'] },
    { slotId: 'ub-tri',      name: 'Cable Overhead Tricep Extension', sets: 2, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'B', subs: ['DB Overhead Tricep Extension'] },
    { slotId: 'ub-curl',     name: 'Hammer Curl', sets: 2, repRange: [10, 12], rir: 1, rest: '60 sec', superset: 'B', subs: ['Cross-Body Hammer Curl'] },
  ],
}
```

---

## Files to Change

### `frontend/src/seeds/programConfigSeed.js`
1. Add `slotId` to every exercise in all existing session types (`lower-a`, `upper-a`, `lower-b`, `upper-b`) using the scheme above.
2. Add `upper-c`, `upper-a-5`, `upper-b-5` entries with `slotId`s as shown above.

### `frontend/src/pages/StartSession.jsx`
Add 3 new entries to `SESSION_TYPES`:
```js
{ id: 'upper-c',   label: 'Upper C',   day: 'Sunday',   focus: 'Arms + Delts' },
{ id: 'upper-a-5', label: 'Upper A-5', day: 'Tuesday',  focus: 'Strength + Hypertrophy (5-day)' },
{ id: 'upper-b-5', label: 'Upper B-5', day: 'Friday',   focus: 'Hypertrophy (5-day)' },
```

### `frontend/src/pages/ActiveSession.jsx`
Replace array-index-based slot history with `slotId`-based lookup:
1. Store `slotId` on each exercise when saving a session
2. At load time, derive `slotIdToSessionTypes` from the program config:
   ```js
   // e.g. { 'ua-bench': ['upper-a', 'upper-a-5'], 'la-squat': ['lower-a'], ... }
   const slotIdToSessionTypes = {}
   for (const [stId, st] of Object.entries(program.sessionTypes)) {
     for (const ex of st.exercises) {
       if (!slotIdToSessionTypes[ex.slotId]) slotIdToSessionTypes[ex.slotId] = []
       slotIdToSessionTypes[ex.slotId].push(stId)
     }
   }
   ```
3. When loading slot history for a slot, query all session types in `slotIdToSessionTypes[slotId]`, find the exercise matching `slotId` within each session (not by array index)
4. No `ANALOGOUS_SESSION_TYPES` map needed

### `frontend/src/lib/dynamodb.js`
No structural changes needed. History queries still use `getRecentSessions(sessionType)` — just called for each session type in `slotIdToSessionTypes[slotId]`.

### `scripts/migrate-slot-ids.mjs` (new)
One-time migration to backfill `slotId` into existing session records:
1. Load all sessions across all session types
2. Match each exercise to the program config by current array index
3. Add `slotId` from the program config to each exercise
4. Write updated sessions back to DynamoDB

Run after deploying seed changes, before relying on `slotId`-based history.

### Seeding
`ProgramContext.jsx` already has the missing-session-type auto-seed fix. New entries in `programConfigSeed.js` will be seeded automatically on next app load.

---

## Exercise Library
`Incline DB Curl` already added to `exerciseLibrarySeed.js`. Will be seeded automatically on next app load if missing.

---

## 5-Day Volume Adjustments

On weeks that include Upper C, reduce isolation volume on Upper A and Upper B.

**Upper A reductions (5-day):**

| Exercise        | 4-day | 5-day |
| --------------- | ----- | ----- |
| Tricep Pushdown | 4     | 3     |
| EZ Bar Curl     | 4     | 3     |

**Upper B reductions (5-day):**

| Exercise            | 4-day | 5-day |
| ------------------- | ----- | ----- |
| Cable Lateral Raise | 4     | 3     |
| Hammer Curl         | 3     | 2     |
