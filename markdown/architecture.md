# Workout Tracker — System Design & Architecture

## Goal
Mobile-friendly PWA to log workouts from the Spring 2026 program (plans/final.md). Replaces spreadsheet tracking with a purpose-built UI supporting double progression, RIR-based logging, 5s PRO tracking, exercise management, and offline use.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), PWA with service worker |
| Hosting | GitHub Pages |
| Auth | None (v1 — single user) |
| Database | AWS DynamoDB (free tier, single-table design) |
| CI/CD | GitHub Actions → GitHub Pages on push to main |
| Backend | None — browser calls DynamoDB directly via AWS SDK |

---

## Pages & User Flows

### Home
Landing page with navigation:
- **Resume Session** — one tap back to today's most recent session (hidden if none exists today)
- **New Session** — pick session type (Lower A / Upper A / Lower B / Upper B), starts or resumes for today's date
- **View Sessions** — session history list
- **View Plan** — static rendering of final.md
- **Log Weight** — bodyweight logging
- **Manage Workout** — program config viewer + exercise library
- **5s PRO Config** — training max management
- **Progression Guide** — double progression reference

### Active Session
Core logging UI. Route: `/session/:sessionType/:date`
- Exercises listed with target sets/reps/RIR from program config
- Per-exercise: weight, reps, RIR inputs per set
- lbs/kg toggle per exercise
- Exercise swap panel (configured subs from program config + custom subs from Manage Workout)
- Last session reference (1 shown, expandable to 3, then 5) — reads from recent sessions by slot position
- Progression flag when all sets hit top of rep range at target RIR
- 5s PRO exercises show target weights based on training max and selected week
- Deload toggle (adjusts 5s PRO targets to deload percentages)
- Manual save button (writes session + exercise history)
- Session start time displayed at top
- Session notes textarea (persisted on save, visibility change, unmount)
- Supplemental exercises: ad hoc additions per session, appended below program exercises, marked with a badge, history tracked by name

### View Sessions
Calendar view of session history. Month grid (Sunday-start) with completed days shaded. Left/right arrows navigate months; left arrow hidden at/before earliest logged month, right arrow hidden at current month. Clicking anywhere in a week row selects that week and shows its session cards below the calendar. Each card shows date + session type (+ deload badge) on top; if the session has notes, a horizontal divider separates the top from the notes text below. Clicking a card opens read-only Session Detail (edit/delete unchanged there).

### Manage Workout
Two sections:
1. **Exercise Library** (top) — full catalog of exercises with metadata. Filter by muscle group and family. Add new exercises. Delete with confirmation mode.
2. **Program View** (below) — all 4 sessions displayed in order, card-per-exercise layout. Read-only by default, "Edit Workout" button enables editing. In edit mode, can add/remove subs for each exercise by picking from the exercise library (filtered by muscle group and family). Superset badges displayed.

### 5s PRO Config
- Set training max for Squat and Bench
- Full wave table showing all 3 weeks with warmup + working sets, weights rounded to nearest 5 (ceiling)
- Deload row at the bottom
- Training max history with delete mode

### Log Weight
- Date input (default today), weight input, lbs/kg toggle
- Entries listed newest first with time-of-day label (morning/afternoon/night)
- Delete mode with confirmation

---

## Key Design Decisions

- **No auth (v1):** Single user. IAM credentials passed as env vars at build time, baked into JS bundle. Blast radius = one DynamoDB table of workout data. Cognito planned for v2.
- **Manual save:** Active Session uses a manual save button that writes to DynamoDB. This triggers both the session instance write and exercise history denormalization.
- **No backend:** DynamoDB called directly from browser via AWS SDK. No API Gateway, no Lambda.
- **PWA + offline:** Service worker caches app shell. localStorage provides offline data fallback with sync queue that flushes when online.
- **No lock file committed:** Work machine uses corporate npm proxy; package-lock.json is gitignored. CI installs fresh from public registry.
- **4am date rollover:** "Today" rolls over at 4am instead of midnight to handle late-night sessions.
- **Program config flow:** programConfig.js is the seed source. On first load, it's written to DynamoDB. After that, DynamoDB is the runtime source of truth. Plan.jsx stays hardcoded/static and independent.
- **Slot-based history (intentional):** Active Session history is read by slot position (array index) from recent sessions, not by exercise name. This is intentional — a slot represents a movement pattern (e.g. "bicep curl"), and different variations (DB Curl, EZ Bar Curl) should all show under the same slot history. Name-based lookup would fragment this. See known limitation below.
- **Slot history known limitation:** If exercises are inserted, removed, or reordered in the program config, slot indices shift and historical sessions display under the wrong card. Mitigation: a slot migration tool in Manage Workout lets you re-map past session exercises after a program restructure. Long-term solution (not yet implemented): assign each program exercise a stable slot ID in the config so order changes don't affect history lookup — see V2 Roadmap.

---

## IAM Setup

- DynamoDB table: `workout-tracker-db` (PK: String, SK: String)
- GSI: `date-index` (PK: `type`, SK: `date`)
- IAM user: `workout-tracker-app` — inline policy scoped to table + GSI
- Permissions: GetItem, PutItem, UpdateItem, DeleteItem, Query, ListTables
- Credentials stored as GitHub repository secrets, injected at build time
- AWS budget alarm at $1/month, alert at 50%

---

## Offline Strategy

1. **Service worker** — caches all app files (HTML/JS/CSS) for offline loading
2. **localStorage fallback** — Active Session caches data locally on every change
3. **Sync queue** — failed DynamoDB writes queue in localStorage, flush on reconnect
4. **PWA manifest** — installable to home screen, standalone display

---

## V1 Status (Complete)
- Session logging with double progression
- 5s PRO tracking with training max config
- Exercise swaps (configured subs + custom subs via Manage Workout)
- Exercise library with metadata and history
- Session history with edit/delete
- Bodyweight logging
- PWA with offline support
- Manage Workout with exercise library and sub editing
- Session notes (active session + session detail view/edit)
- Supplemental exercises (ad hoc per-session additions, name-based history)
- Slot migration tool (Manage Workout) — remaps slot indices in past sessions after program restructure

## V2 Roadmap
- [ ] Auth (Cognito) + multiple users with `USER#<id>` PK prefix; admin role gates Manage Workout
- [ ] Stable slot IDs — assign each program exercise a stable `slotId` in program config; sessions reference by ID instead of array position; eliminates slot drift when program is restructured
- [ ] Rest timer
- [ ] Full workout creation/editing via Manage Workout UI
- [ ] Progress charts per exercise
- [ ] Exercise history backfill from sessions
