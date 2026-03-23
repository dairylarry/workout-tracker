# Data Model

## Hierarchy

```
Program
└── Session Type (Lower A / Upper A / Lower B / Upper B)
    └── Session Instance (a logged workout on a specific date)
        └── Exercise
            └── Set (weight / reps / RIR)
```

---

## DynamoDB — Single Table: `workout-tracker`

### Item Types

#### Program Config
Stores the program metadata. One item.

```
PK: PROGRAM#spring2026
SK: CONFIG
---
{ name: "Spring 2026", startDate: "2026-03-01" }
```

#### Session Type (template)
Defines which exercises belong to each day. Seeded once from final.md. Four items.

```
PK: PROGRAM#spring2026
SK: SESSION_TYPE#lower-a
---
{
  name: "Lower A",
  day: "Monday",
  focus: "Strength + Hypertrophy",
  exercises: [
    { name: "Bulgarian Split Squat", sets: 3, repRange: [8, 12], rir: 2, rest: "90 sec" },
    { name: "Romanian Deadlift",     sets: 3, repRange: [6, 10], rir: 2, rest: "2 min"  },
    { name: "Barbell Hip Thrust",    sets: 3, repRange: [8, 12], rir: 2, rest: "90 sec" },
    { name: "Standing Calf Raise",   sets: 3, repRange: [12,15], rir: 1, rest: "60 sec" }
  ]
}
```

*(Bench and Squat excluded from v1 tracking — 5/3/1 handled manually)*

#### Session Instance (logged workout)
One item per workout. Exercises and sets embedded directly.

```
PK: SESSION#lower-a
SK: DATE#2026-03-22
---
{
  type: "SESSION",
  sessionType: "lower-a",
  date: "2026-03-22",
  startedAt: "2026-03-22T10:00:00Z",
  deload: false,
  exercises: [
    {
      name: "Bulgarian Split Squat",
      sets: [
        { setNumber: 1, weight: 40, weightUnit: "lbs", reps: 10, rir: 2 },
        { setNumber: 2, weight: 40, weightUnit: "lbs", reps: 9,  rir: 2 },
        { setNumber: 3, weight: 40, weightUnit: "lbs", reps: 8,  rir: 1 }
      ]
    },
    ...
  ]
}
```

---

## GSI — All Sessions by Date

| | Value |
|---|---|
| Index name | `date-index` |
| Partition key | `type = "SESSION"` (add this static attribute to all session instances) |
| Sort key | `date` |

Enables: "get all sessions across all types sorted by date" — useful for history/calendar view.

---

## Access Patterns

| Pattern | Query |
|---|---|
| Get session type config | `PK = PROGRAM#spring2026, SK = SESSION_TYPE#lower-a` |
| Get all session types | `PK = PROGRAM#spring2026, SK begins_with SESSION_TYPE#` |
| Start / update a session | `PutItem / UpdateItem` on `PK = SESSION#lower-a, SK = DATE#2026-03-22` |
| Get last session of a type | `PK = SESSION#lower-a`, sort SK descending, limit 1 |
| Get full history for a type | `PK = SESSION#lower-a`, sort SK descending |
| Get all sessions by date | GSI: `type = "SESSION"`, sort `date` descending |

---

## Notes

- Sets are embedded in the session item — no separate set items. Simple and sufficient for this scale.
- Every set update = `UpdateItem` on the session item (instant sync, no save button).
- Past sessions are editable — same `UpdateItem` call, no special handling needed.
- Weight unit stored per set (`lbs`). Change to `kg` per set if needed in future.
- No `completedAt` — all sessions assumed complete.
- No user prefix in v1 — single user assumed. Add `USER#<id>` prefix to PK in v2 when auth is added.
- GSI on `date` attribute recommended in v2 for cross-type history/calendar view.
