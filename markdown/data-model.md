# Data Model

## Hierarchy

```
Exercise Library (catalog of all known exercises)
Program Config (which exercises are in each session, with subs)
└── Session Type (Lower A / Upper A / Lower B / Upper B)
    └── Session Instance (a logged workout on a specific date)
        └── Exercise (with optional swap)
            └── Set (weight / reps / RIR)
```

---

## DynamoDB — Single Table: `workout-tracker-db`

### Program Config

Stores the session definitions. Seeded from programConfig.js on first load. Four items (one per session type). DynamoDB is the runtime source of truth after seeding.

```
PK: PROGRAM#spring2026
SK: SESSION_TYPE#lower-a
---
{
  name: "Lower A",
  day: "Monday",
  focus: "Strength + Hypertrophy",
  exercises: [
    {
      name: "Barbell Back Squat",
      sets: 0,
      repRange: [0, 0],
      rir: 0,
      rest: "3-4 min",
      is531: true,
      subs: []
    },
    {
      name: "Leg Press",
      sets: 3,
      repRange: [10, 15],
      rir: 2,
      rest: "90 sec",
      subs: ["Hack Squat", "Front Squat", "Heel-Elevated Goblet Squat"],
      perSide: false
    },
    ...
  ]
}
```

Key exercise fields:
- `name` — primary exercise name
- `sets`, `repRange`, `rir`, `rest` — programming
- `subs` — list of substitute exercise names (configured via Manage Workout)
- `is531` — marks 5s PRO exercises (sets/reps driven by training max config)
- `superset` — superset grouping label ("A", "B", etc.)
- `perSide` — unilateral exercise flag
- `optional` — can be skipped on heavy weeks

### Session Instance

One item per logged workout. Exercises and sets embedded directly.

```
PK: SESSION#lower-a
SK: DATE#2026-03-22
---
{
  type: "SESSION",
  sessionType: "lower-a",
  date: "2026-03-22",
  startedAt: "2026-03-22T18:45:00Z",
  deload: false,
  notes: "Felt strong today, bumped weight on last set",   // optional free-text
  exercises: [
    {
      name: "Leg Press",
      swappedName: "Hack Squat",    // only present if swapped
      weightUnit: "lbs",
      sets: [
        { setNumber: 1, weight: 295, reps: 10, rir: 2 },
        { setNumber: 2, weight: 295, reps: 9, rir: 2 },
        { setNumber: 3, weight: 295, reps: 8, rir: 1 }
      ]
    },
    {
      name: "DB Preacher Curl",
      supplemental: true,           // ad hoc addition, not in program config
      weightUnit: "lbs",
      sets: [
        { setNumber: 1, weight: 30, reps: 12, rir: 2 }
      ]
    },
    ...
  ]
}
```

Key fields:
- `name` — original exercise from program config (for slot tracking). For supplemental exercises, the name chosen from the library.
- `swappedName` — actual exercise performed (if different from program exercise)
- `supplemental` — true for ad hoc exercises added during the session; not present on program exercises. History for supplemental exercises is tracked by name, not slot position.
- `weightUnit` — lbs or kg, set per exercise
- `deload` — marks the session as a deload week
- `notes` — optional free-text session notes, shown in Session Detail
- `startedAt` — timestamp for display

For 5s PRO exercises:
```
{
  name: "Barbell Back Squat",
  is531: true,
  week: 1,
  trainingMax: 225,    // snapshot at time of session
  weightUnit: "lbs",
  sets: [
    { setNumber: 1, weight: 100, reps: 5, rir: null },   // warmup
    { setNumber: 2, weight: 125, reps: 5, rir: null },
    { setNumber: 3, weight: 150, reps: 3, rir: null },
    { setNumber: 4, weight: 165, reps: 5, rir: 3 },      // working
    { setNumber: 5, weight: 190, reps: 5, rir: 2 },
    { setNumber: 6, weight: 215, reps: 5, rir: 1 }
  ]
}
```

### Exercise Library

Catalog of all known exercises. Seeded from exerciseLibrarySeed.js on first load. Managed via the Exercise Library section in Manage Workout.

```
PK: EXERCISE_LIB
SK: EXERCISE#lat-pulldown
---
{
  name: "Lat Pulldown",
  muscleGroups: ["back"],
  family: "pull",
  defaultRepRange: [8, 12],
  defaultSets: 3,
  unilateral: false,
  history: [
    {
      date: "2026-03-24",
      sessionType: "upper-a",
      slotIndex: 2,
      sets: [
        { setNumber: 1, weight: 120, reps: 10, rir: 2 },
        ...
      ],
      weightUnit: "lbs"
    },
    ...
  ],
  createdAt: "2026-03-24"
}
```

Key fields:
- `muscleGroups` — array, supports multiple (e.g. ["hamstrings", "glutes"])
- `family` — exercise category for smart sub suggestions ("curl", "leg-curl", "row", "pull", "press", "fly", "squat", "hinge", "raise", "lateral-raise", "rear-delt", "extension", "leg-extension", "pushdown", "calf", "hip-thrust")
- `unilateral` — flag for per-side exercises
- `history` — denormalized array of past logged data. Written on manual save alongside the session instance. Each entry keyed by `date + sessionType + slotIndex` for uniqueness (handles duplicate exercises in same session).
- `defaultRepRange`, `defaultSets` — used as fallback when the exercise is selected as a sub with custom rep range overrides

### 5s PRO Config

Training max configuration for 5s PRO exercises.

```
PK: 531_CONFIG
SK: EXERCISE#squat
---
{
  type: "531_CONFIG",
  exercise: "squat",
  trainingMax: 225,
  history: [
    { date: "2026-03-24", tm: 225 },
    { date: "2026-03-01", tm: 215 }
  ]
}
```

Wave percentages (applied to training max, rounded up to nearest 5):
- Warmup: 40%, 50%, 60% (same every week)
- Week 1: 65%, 75%, 85%
- Week 2: 70%, 80%, 90%
- Week 3: 75%, 85%, 95%
- Deload: 40%, 50%, 60%

### Bodyweight Log

```
PK: BODYWEIGHT
SK: DATE#2026-03-22
---
{
  type: "BODYWEIGHT",
  date: "2026-03-22",
  weight: 180,
  weightUnit: "lbs",
  timeOfDay: "morning"
}
```

### Sub Overrides (custom subs from Manage Workout)

Stored on the program config items. When a user adds/removes subs via Manage Workout, the `subs` array on the exercise in the session type config is updated directly.

---

## GSI: `date-index`

| Field | Value |
|---|---|
| Partition key | `type` (String) |
| Sort key | `date` (String) |

Enables cross-session-type queries: "get all sessions sorted by date regardless of type."

---

## Access Patterns

| Pattern | Query |
|---|---|
| Get all session types | `PK = PROGRAM#spring2026, SK begins_with SESSION_TYPE#` |
| Get one session type | `PK = PROGRAM#spring2026, SK = SESSION_TYPE#lower-a` |
| Start / resume a session | `GetItem` then `PutItem / UpdateItem` on `PK = SESSION#lower-a, SK = DATE#2026-03-22` |
| Get recent sessions of a type | `PK = SESSION#lower-a`, sort SK descending, limit N |
| Get all sessions by date | GSI: `type = "SESSION"`, sort `date` descending |
| Get exercise from library | `PK = EXERCISE_LIB, SK = EXERCISE#lat-pulldown` |
| Get all exercises | `PK = EXERCISE_LIB, SK begins_with EXERCISE#` |
| Get 5s PRO config | `PK = 531_CONFIG, SK = EXERCISE#squat` |
| Get bodyweight history | `PK = BODYWEIGHT, SK begins_with DATE#`, sort descending |

---

## Data Flow: Saving a Session

When the user taps "Save" in Active Session:
1. **Write session instance** — `PutItem` to `SESSION#<type> / DATE#<date>`
2. **Write exercise history** — for each exercise in the session, `UpdateItem` to append a history entry on `EXERCISE_LIB / EXERCISE#<name>` with `{ date, sessionType, slotIndex, sets, weightUnit }`

Both writes hit the same DynamoDB table (different PK/SK). 8 operations for a 7-exercise session. Standard DynamoDB denormalization pattern.

---

## Data Flow: Reading History

Two different history reads serve different purposes:

1. **Active Session (slot history)** — queries recent sessions of the same type, reads by slot position. Shows all exercise variations used in that slot (including swaps). Source: session instances. **Supplemental exercises** use name-based lookup instead.
2. **Exercise Library (exercise history)** — reads from the exercise library item's `history` array. Shows all logged data for that exercise across all sessions. Source: exercise library items.

### Slot-based history: design rationale and known limitation

Slot position is intentional for program exercises. A slot represents a movement pattern (e.g. "bicep curl"), not a specific exercise. Using slot-based lookup means DB Curl and EZ Bar Curl logged in the same slot on different days will both appear in that slot's history — which is the desired behavior for tracking progression across variations.

**Known limitation:** If exercises are inserted, removed, or reordered in the program config, slot indices shift and past sessions display under the wrong card. Mitigation in v1: a manual migration (run in Manage Workout or via admin script) that re-maps `name` fields in past session exercise arrays to realign with the new slot order.

**Long-term solution (v2):** Assign each program exercise a stable `slotId` string in the program config (e.g. `"bicep-curl-slot"`). Session exercises store this ID alongside the name. History lookup uses `slotId` instead of array index, making insertions and reordering completely safe.

---

## Notes

- Sets embedded in session items — no separate set table
- Weight unit stored per exercise (not per set)
- 4am date rollover — "today" resets at 4am local time
- No `completedAt` — all sessions assumed complete
- No user prefix in v1 — add `USER#<id>` prefix to PK in v2 for multi-user
- programConfig.js and exerciseLibrarySeed.js are seed-only files. Not read at runtime after initial seed. Reseed manually when the plan changes.
- `notes` field on session is optional; absent on sessions created before the field was introduced
- `supplemental: true` on an exercise marks it as a per-session addition outside the program config; absent on program exercises (not `false`, just absent)
