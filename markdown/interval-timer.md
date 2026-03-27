# Interval Timer — Design & Architecture

## Goal

Replace the static, hardcoded interval timer with a dynamic system that generates audio cues from workout routines stored in DynamoDB. Each routine defines ordered blocks of exercises with per-exercise work/rest intervals — the timer unfurls blocks into a flat exercise list, then schedules all tones at playback time using the Web Audio API. No pre-generated MP3 files.

---

## How It Works Today

`AudioTest.jsx` uses hardcoded constants (`WORK_S=40`, `REST_S=20`, `TOTAL_MIN=10`) to pre-schedule ~80 oscillator tones on the Web Audio API audio thread. A wake lock keeps the screen on so iOS doesn't suspend audio. `navigator.audioSession.type = 'ambient'` mixes cues over Spotify.

This works but only supports a single fixed interval pattern.

---

## What Changes

The `buildTimer(ctx)` function currently loops with fixed intervals:

```
while (elapsed < TOTAL_S) → schedule 40s work / 20s rest every cycle
```

It becomes a loop over the unfurled exercise list:

```
unfurled = unfurl(routine)   // flatten blocks × numberOfTimes, force last rest to 0

for each exercise in unfurled:
  if last exercise: schedule triple-tap bell
  else: schedule work beep
  schedule work phase (exercise.workSeconds)
  if exercise.restSeconds > 0:
    schedule rest beep
    schedule rest phase (exercise.restSeconds)
```

Total duration is derived (sum of all intervals). No `TOTAL_MIN` constant.

Everything else — the Web Audio API scheduling, wake lock, ambient audio session, countdown, warning ticks, end beep — stays identical.

---

## Routine Data Model

### Shape

```json
{
  "id": "ground-level",
  "name": "Ground Level",
  "category": "mat",
  "difficulty": 3,
  "equipment": "mat",
  "equipmentOptional": "dumbbell or kettlebell",
  "routine": [
    {
      "numberOfTimes": 2,
      "exercises": [
        { "name": "Dead Bug", "workSeconds": 40, "restSeconds": 20, "cue": "lower back pinned" },
        { "name": "Hollow Body Hold", "workSeconds": 40, "restSeconds": 20, "cue": "rib cage down" },
        { "name": "Left Side Plank Hold", "workSeconds": 40, "restSeconds": 0, "cue": "hips stacked" },
        { "name": "Right Side Plank Hold", "workSeconds": 40, "restSeconds": 60, "cue": "hips stacked" }
      ]
    },
    {
      "label": "Finisher",
      "numberOfTimes": 1,
      "exercises": [
        { "name": "Forearm Plank Hold", "workSeconds": 60, "restSeconds": 0, "cue": "RKC grip, squeeze" }
      ]
    }
  ]
}
```

### Unfurling

At playback time, the `routine` array is flattened into a linear exercise list:

1. For each block, repeat its `exercises` array `numberOfTimes` times
2. Concatenate all blocks in order
3. **Force `restSeconds = 0` on the final exercise** — no point resting after the workout is done

This is a runtime transformation, not baked into the seed data. The seed data preserves the author's intent (e.g. a 60s rest between rounds), and the unfurler only overrides the very last exercise.

Example (Ground Level, abbreviated):

```
Block 1, round 1: Dead Bug → Hollow → L Side Plank (rest:0) → R Side Plank (rest:60)
Block 1, round 2: Dead Bug → Hollow → L Side Plank (rest:0) → R Side Plank (rest:60)
Block 2, round 1: Forearm Plank Hold (rest:0)  ← last exercise, rest forced to 0
```

### Fields used for tone generation

| Field | Purpose |
|---|---|
| `workSeconds` | Duration of work phase (beep + silence + warning ticks) |
| `restSeconds` | Duration of rest phase. **0 = no rest**, next work beep fires immediately after ticks |
| `routine[].exercises[]` | Ordered exercise list within a block |
| `routine[].numberOfTimes` | How many times to repeat the block's exercises |

### Fields used for UI display only

| Field | Required | Purpose |
|---|---|---|
| `name` (exercise) | yes | Shown in status display (e.g. "Dead Bug — 23s") |
| `cue` | no | Coaching cue shown below exercise name. Not always present — UI omits if absent |
| `routine[].label` | no | Block name shown during playback (e.g. "Phase 2 — 45/15"). Omit for unlabelled blocks |
| `id` | yes | DynamoDB key, also used for localStorage "last selected" |
| `name` (routine) | yes | Shown in routine selection list and at top of idle page |
| `category` | yes | Filter dimension in selection view. Values: `mat` \| `handstand` \| `skill` \| `equipment` |
| `difficulty` | yes | Filter dimension. Values: 3 \| 4 \| 5 |
| `equipment` | yes | Shown in selection list so you know what you need |
| `equipmentOptional` | no | Shown in selection list as secondary info |
| `notes` | no | Shown on routine detail if needed |

### Timer-level constants (not per-routine)

These rarely change and stay as constants at the top of the file:

| Constant | Default | Notes |
|---|---|---|
| `COUNTDOWN_S` | 10 | Lead-in before first exercise |
| `TICKS` | 3 | Warning ticks before each transition |
| `TRANSITION_S` | 0.5 | Duration of work/rest beep tones |
| `VOLUME` | 0.65 | Master volume scalar (passed through to all tones) |

If per-routine countdown is ever needed, add an optional `countdownSeconds` field to the routine object and fall back to the constant.

---

## DynamoDB Storage

### Key scheme

```
PK: CORE_ROUTINE#<id>
SK: CORE_ROUTINE#<id>
```

Single item per routine. The full routine object (blocks + metadata) is stored as one document. At ~2-4 KB per routine, well within DynamoDB's 400 KB item limit.

### Access patterns

| Pattern | Query |
|---|---|
| Get all routines | `PK begins_with CORE_ROUTINE#` |
| Get one routine | `PK = CORE_ROUTINE#ground-level, SK = CORE_ROUTINE#ground-level` |

### Why not normalize exercises into separate items?

Exercises only exist within a routine's context (order matters, intervals are per-routine). There's no cross-routine querying needed. A single document read is simpler, faster, and avoids multi-item fetches.

### Seeding

Seed file: `frontend/src/seeds/coreWorkoutLibrarySeed.js`. Same pattern as `exerciseLibrarySeed.js` — exported constant, seeded on first load, DynamoDB is the runtime source of truth after seeding. Reseed manually when routines change.

---

## Audio Scheduling Details

### Tone types

| Tone | Frequency | Duration | Volume | When |
|---|---|---|---|---|
| Countdown tick | 440 Hz | 0.1s | 0.3 | Last 3s of countdown |
| Work beep | 784 Hz | 0.5s | 0.4 | Start of each work phase |
| Rest beep | 523 Hz | 0.5s | 0.3 | Start of each rest phase |
| Warning tick | 440 Hz | 0.1s | 0.3 | 3s before each phase transition |
| Last-exercise triple-tap | 784 Hz | 0.08s + 0.08s + 0.30s | 0.55/0.50/0.45 | Start of the final exercise |
| End beep | 523 Hz | 1.0s | 0.4 | Workout complete |

All volumes are relative — multiplied by the master `VOLUME` scalar at scheduling time.

### Triple-tap bell (last exercise signal)

Three strikes with tightening gaps and tapering volume to mimic a natural bell hit:

```
Strike 1:  784 Hz, 0.08s, vol 0.55   ← strong initial hit
   gap:    0.06s
Strike 2:  784 Hz, 0.08s, vol 0.50   ← quick follow
   gap:    0.04s                      ← shorter gap (acceleration)
Strike 3:  784 Hz, 0.30s, vol 0.45   ← longer ring-out, slightly softer
```

Total: ~0.56s. More distinct than a double-tap — harder to miss during a set.

### Zero-rest transitions

When `restSeconds` is 0:
1. Work phase ends with warning ticks as normal
2. No rest beep is scheduled
3. Next work beep fires immediately
4. The UI skips the "Rest" phase label — status goes directly from one exercise name to the next

### Last-exercise detection

After unfurling, the last exercise in the flat list gets the triple-tap bell instead of a normal work beep.

### Phase list (for UI display)

The scheduler builds a `phases` array used by the UI display interval:

```
{ label: "Countdown",           start: 0,    end: 10,  next: "Dead Bug" }
{ label: "Dead Bug",            start: 10,   end: 50,  cue: "lower back pinned",  next: "Hollow Body Hold" }
{ label: "Rest",                start: 50,   end: 70,  next: "Hollow Body Hold" }
{ label: "Hollow Body Hold",    start: 70,   end: 110, cue: "rib cage down",      next: "Left Side Plank Hold" }
...
{ label: "Forearm Plank Hold",  start: 545,  end: 605, cue: "RKC grip, squeeze",  next: null }  ← triple-tap
{ label: "Done",                start: 605,  end: 607  }
```

Each phase carries a `next` field pointing to the upcoming exercise name. The UI renders this as "Next: Hollow Body Hold" during work/rest, or "Last exercise" when `next` is null.

---

## Timer UI

### Layout (running state)

```
┌─────────────────────────────────┐
│  4 / 11                         │  ← exercise counter (precomputed, top corner)
│                                 │
│           23s                   │  ← time remaining (large, prominent)
│                                 │
│      Dead Bug                   │  ← exercise name
│  lower back pinned              │  ← cue text (smaller, muted, omitted if absent)
│                                 │
│  Next: Hollow Body Hold         │  ← next exercise preview
│                                 │
│   [ Start ]    [ Stop ]         │  ← action buttons
│                                 │
│          ← Back                 │
└─────────────────────────────────┘
```

The exercise counter (`4 / 11`) is precomputed from the unfurled list length at schedule-build time and stored on each phase entry. Updates each time a new work phase starts. Not shown during countdown, rest, or done states.

### Display hierarchy

1. **Exercise counter** — top corner, small. e.g. "4 / 11". Precomputed, updates on each work phase
2. **Time remaining** — largest element, visible from across the room. Monospace, bold
3. **Exercise name** — what you're doing right now
4. **Cue** — coaching reminder, smaller muted text. Only shown when cue exists
5. **Next exercise** — "Next: \<name\>" during work/rest, "Last exercise" on the final exercise, hidden during countdown
6. **Buttons** — Start / Stop (Pause / Resume in v2)
7. **Back** — navigates home, stops timer if running

### Phase-specific display

| Phase | Counter | Time | Name | Cue | Next |
|---|---|---|---|---|---|
| Idle | — | — | — | — | — |
| Countdown | — | countdown seconds | "Get Ready" | — | first exercise name |
| Work | 4 / 11 | work seconds | exercise name | exercise cue (if present) | next exercise name |
| Rest | — | rest seconds | "Rest" | — | next exercise name |
| Done | — | — | "Done" | — | — |

---

## UI Flow

### Page structure

```
Home  →  "Core" button  →  /core  (idle timer page)
                               └→  /core/select  (routine selection library)
```

### Timer page states (`/core`)

**1. Idle** (routine loaded from localStorage, or default on first visit)
- Routine name shown
- Total duration shown (computed)
- Exercise list preview (optional, shows block structure)
- "Start" button
- "Select Workout" button → navigates to `/core/select`

**2. Running**
- Timer UI layout as described above
- Wake lock held
- Silent keepalive oscillator running
- "Stop" button; no pause in v1

**3. Done**
- Status shows "Done"
- Wake lock released
- Same routine stays loaded — tap "Start" to repeat, or "Select Workout" to change

Navigating away mid-timer stops it cleanly (unmount cleanup). No confirmation dialog.

### Selection page (`/core/select`)

- Full list of routines fetched from DynamoDB
- Filter bar: **Category** (mat / handstand / skill / equipment) and **Difficulty** (3 / 4 / 5)
- Filters are client-side — all routines loaded once, no re-fetching
- Tap a routine → saves id to localStorage, navigates back to `/core`

**Routine card layout:**

```
┌──────────────────────────────────────┐
│  Ground Level          [mat] [★★★]   │  ← name + category badge + difficulty
│  mat · 11:55 · 12 exercises          │  ← equipment, computed duration + count
│                                      │
│  Post-strength finisher. The 40/20   │  ← notes: 2-line truncated paragraph,
│  ratio is productive without being…  │    muted color. Full text on expand.
│                                      │
│  WARM-UP                             │  ← block label (small caps, muted)
│  Dead Bug · 45s                      │  ← exercise name · work duration
│                                      │
│  ×2                                  │  ← repeat count for unlabeled blocks
│  Hollow Body Hold · 40s              │
│  Reverse Crunch · 40s                │
│  Plank Shoulder Tap · 40s            │
│  Left Side Plank Hold · 45s          │
│  Right Side Plank Hold · 45s         │
│                                      │
│  FINISHER                            │
│  Forearm Plank Hold · 45s            │
│                                      │
│  ▸ How to progress                   │  ← collapsed disclosure; expands inline
└──────────────────────────────────────┘
```

**Exercise list rules:**
- One exercise per line: `Name · Xs` (work duration only — rest is not shown to keep it scannable)
- Block label shown as small muted all-caps above its exercises. Omit label row if no label.
- For unlabeled blocks with `numberOfTimes > 1`, show `×N` on its own line before the exercises
- For labeled blocks with `numberOfTimes > 1`, append `×N` to the label (e.g. `MAIN BLOCK ×2`)
- Notes shown as body text — truncated to 2 lines with a fade; tap to expand.
- Progressions behind a collapsed "How to progress" disclosure. Not needed when selecting, but valuable a tap away.
- Duration and exercise count computed from the unfurled routine at render time — no stored fields needed.

### Managing routines

For v1, seed routines from `coreWorkoutLibrarySeed.js` (same pattern as `exerciseLibrarySeed.js`). A management UI can come later — the data model supports it but the priority is getting playback working.

---

## Implementation Plan

1. **DynamoDB + seed** — add `putCoreRoutine` / `getCoreRoutines` to `dynamodb.js`, seed from `coreWorkoutLibrarySeed.js` on first load
2. **Unfurl function** — `unfurlRoutine(routine)` → flat exercise list, last rest forced to 0
3. **Refactor `buildTimer`** — split into `computeSchedule(unfurled)` (pure, returns `[{ relT, freq, dur, vol }]`) and `scheduleNodes(ctx, schedule, offsetSeconds)` (schedules only nodes where `relT > offset`). Remove hardcoded constants.
4. **Update phase list** — include exercise `cue`, `next` field, optional block `label`
5. **Update timer UI** — time prominent, exercise name, cue (if present), next exercise
6. **Wire up localStorage** — save/load last selected routine id
7. **Add routes** — `/core` (idle + running) and `/core/select` (library)
8. **Selection page** — routine cards with client-side category + difficulty filters
9. **Add pause** — add "Pause / Resume" button to running state. On pause: record `pausedAt = ctx.currentTime - origin`, cancel nodes, close context. On resume: reopen context, call `scheduleNodes` with `offsetSeconds = pausedAt` so only future tones are rescheduled
10. **Update Home** — rename "Audio Test" button to "Core"
