# Interval Timer — Design & Architecture

## Goal

Replace the static, hardcoded interval timer with a dynamic system that generates audio cues from workout routines stored in DynamoDB. Each routine defines its own exercises, work/rest intervals, circuit rounds, and finisher — the timer reads this data and schedules all tones at playback time using the Web Audio API. No pre-generated MP3 files.

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

It becomes a two-pass loop over the routine's exercise list:

```
for each round (1..circuit_rounds):
  for each exercise in circuit:
    schedule work beep → exercise.work_seconds
    schedule rest beep → exercise.rest_seconds (skip if 0)
for each exercise in finisher:
  schedule work beep → exercise.work_seconds
  schedule rest beep → exercise.rest_seconds (skip if 0)
```

Total duration is derived (sum of all intervals). No `TOTAL_MIN` constant.

Everything else — the Web Audio API scheduling, wake lock, ambient audio session, countdown, warning ticks, end beep — stays identical.

---

## Routine Data Model

### Shape

```json
{
  "id": "front-line",
  "name": "Front Line",
  "circuit_rounds": 2,
  "circuit": [
    {
      "name": "Dead Bug",
      "work_seconds": 40,
      "rest_seconds": 20,
      "cue": "rib cage pinned, move slow"
    },
    {
      "name": "Bicycle Crunch",
      "work_seconds": 40,
      "rest_seconds": 20,
      "cue": "full rotation, 2 sec per rep"
    }
  ],
  "finisher": [
    {
      "name": "Hollow Hold",
      "work_seconds": 45,
      "rest_seconds": 10,
      "cue": "long body, squeeze"
    },
    {
      "name": "Plank",
      "work_seconds": 45,
      "rest_seconds": 0,
      "cue": "RKC, full tension"
    }
  ]
}
```

### Fields used for tone generation

| Field | Purpose |
|---|---|
| `work_seconds` | Duration of work phase (silence + warning ticks) |
| `rest_seconds` | Duration of rest phase. **0 = no rest**, next work beep fires immediately after ticks |
| `circuit[]` | Ordered exercise list, looped `circuit_rounds` times |
| `circuit_rounds` | Number of times to repeat the circuit |
| `finisher[]` | Exercises played once after all circuit rounds complete |

### Fields used for UI display only

| Field | Purpose |
|---|---|
| `name` | Shown in status display (replaces "Work 1" with "Dead Bug") |
| `cue` | Coaching cue shown below exercise name during the interval |
| `id` | DynamoDB key, used for selection and routing |
| `structure`, `focus`, `type` | Metadata for future use (filtering, categorization). Not needed for tone generation |

### Timer-level constants (not per-routine)

These rarely change and stay as constants at the top of the file:

| Constant | Default | Notes |
|---|---|---|
| `COUNTDOWN_S` | 10 | Lead-in before first exercise |
| `TICKS` | 3 | Warning ticks before each transition |
| `TRANSITION_S` | 0.5 | Duration of work/rest beep tones |
| `VOLUME` | 0.65 | Master volume scalar |

If per-routine countdown is ever needed, add an optional `countdown_seconds` field to the routine object and fall back to the constant.

---

## DynamoDB Storage

### Key scheme

```
PK: ROUTINE#<id>
SK: ROUTINE#<id>
```

Single item per routine. The full routine object (circuit + finisher + metadata) is stored as one document. At ~2-3 KB per routine, well within DynamoDB's 400 KB item limit.

### Why not normalize exercises into separate items?

Exercises only exist within a routine's context (order matters, intervals are per-routine). There's no cross-routine querying needed. A single document read is simpler, faster, and avoids multi-item fetches.

---

## Audio Scheduling Details

### Tone types (unchanged from current implementation)

| Tone | Frequency | Duration | Volume | When |
|---|---|---|---|---|
| Countdown tick | 440 Hz | 0.1s | 0.3 | Last 3s of countdown |
| Work beep | 784 Hz | 0.5s | 0.4 | Start of each work phase |
| Rest beep | 523 Hz | 0.5s | 0.3 | Start of each rest phase |
| Warning tick | 440 Hz | 0.1s | 0.3 | 3s before each phase transition |
| Last-exercise double-tap | 784 Hz | 0.08s + 0.36s | 0.5/0.6 | Start of the final exercise |
| End beep | 523 Hz | 1.0s | 0.4 | Workout complete |

### Zero-rest transitions

When `rest_seconds` is 0:
1. Work phase ends with warning ticks as normal
2. No rest beep is scheduled
3. Next work beep fires immediately
4. The UI skips the "Rest" phase label — status goes directly from one exercise name to the next

### Last-exercise detection

The double-tap fires on the final exercise. Detection logic:
- If `finisher` is non-empty: last exercise in `finisher[]`
- If `finisher` is empty: last exercise in the final circuit round

### Phase list (for UI display)

The scheduler builds a `phases` array used by the UI display interval:

```
{ label: "Countdown",       start: 0,    end: 10,  next: "Dead Bug" }
{ label: "Dead Bug",        start: 10,   end: 50,  cue: "rib cage pinned, move slow",  next: "Rest" }
{ label: "Rest",            start: 50,   end: 70,  next: "Bicycle Crunch" }
{ label: "Bicycle Crunch",  start: 70,   end: 110, cue: "full rotation, 2 sec per rep", next: "Rest" }
{ label: "Rest",            start: 110,  end: 130, next: "Dead Bug" }
...
{ label: "Plank",           start: 545,  end: 590, cue: "RKC, full tension", next: null }  ← double-tap, last exercise
{ label: "Done",            start: 590,  end: 592  }
```

Each phase carries a `next` field pointing to the upcoming exercise name. The UI renders this as "Next: Hollow Body Rock" during work/rest, or "Last exercise" when `next` is null.

---

## UI Flow

### Page structure

```
Home  →  "Interval Timer" button  →  /audio-test (rename to /timer)
```

### Timer page states

**1. Selection** (idle)
- List of saved routines fetched from DynamoDB
- Tap a routine to load it

**2. Ready** (routine loaded)
- Routine name displayed
- Total duration shown (computed from routine data)
- "Start" button active

**3. Running**
- Large status: exercise name + countdown (e.g. "Dead Bug — 23s")
- Cue text below (e.g. "rib cage pinned, move slow")
- Next exercise preview (e.g. "Next: Hollow Body Rock") — shown during both work and rest phases so you can mentally prepare. During the last exercise, shows "Last exercise" instead
- "Stop" button active
- Wake lock held

**4. Done**
- Status shows "Done"
- Wake lock released

### Managing routines

For v1, seed routines from a JSON file (like the existing program config pattern). A management UI can come later — the data model supports it but the priority is getting playback working.

---

## Implementation Plan

1. **Add routine data model** — DynamoDB key scheme, seed from JSON
2. **Refactor `buildTimer`** — accept a routine object instead of using constants
3. **Update phase display** — show exercise name + cue instead of "Work N"
4. **Add routine selection UI** — list routines, tap to load
5. **Rename route** — `/audio-test` → `/timer`, update nav button text
