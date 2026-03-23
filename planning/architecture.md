# Workout Tracker — System Design & Architecture

## Goal
Mobile-friendly app to log workouts from the Spring 2026 program (plans/final.md). Replaces spreadsheet tracking with a purpose-built UI that supports double progression and RIR-based logging.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), hosted on GitHub Pages |
| Auth | None (v1 — single user, no auth) |
| Database | AWS DynamoDB (free tier, single-table design) |
| CI/CD | GitHub Actions → GitHub Pages on push to main |
| Backend | None (browser calls DynamoDB directly via AWS SDK) |

---

## Core User Flows

1. **Start a session** — pick today's day (Lower A / Upper A / Lower B / Upper B)
2. **Log sets** — for each exercise, enter weight / reps / RIR per set
3. **Progression indicator** — app flags when all sets hit top of rep range at RIR ≤ 1 (time to add load)
4. **Reference last session** — previous session's numbers shown alongside current input
5. **Session history** — view past sessions by day

---

## Data Model (DynamoDB — single table)

| PK | SK | Data |
|---|---|---|
| `user#<id>` | `session#<date>#<day>` | `{ exercises: [{ name, sets: [{ weight, reps, rir }] }] }` |
| `user#<id>` | `config#program` | `{ days, exercises per day, rep ranges }` |

---

## Program Config (from plans/final.md)

### Days
- **Lower A** — Mon — Strength + Hypertrophy
- **Upper A** — Tue — Strength + Hypertrophy
- **Lower B** — Thu — Hypertrophy
- **Upper B** — Fri — Hypertrophy

### Progression Rules
- **Double progression only (v1):** add reps to top of range at RIR ≤ 1, then add load and reset
- **5/3/1** (Bench Press, Back Squat) — not tracked in v1, logged manually if at all

---

## Key Design Decisions

- **No auth (v1):** Single user, no login. AWS credentials hardcoded or via env vars. Auth added in v2 via Cognito.
- **Optimistic instant sync:** Every set logged is immediately written to DynamoDB. No save button, no batching.
- **No backend:** DynamoDB called directly from browser via AWS SDK. Avoids API Gateway cost and complexity.
- **No lock file committed:** Work machine uses Indeed npm proxy; package-lock.json is gitignored. CI installs fresh from public registry each run.
- **Single-table DynamoDB:** All data under one table, access patterns covered by PK/SK structure.

---

## IAM Setup (v1)

1. Create a DynamoDB table `workout-tracker` with `PK` (String) and `SK` (String)
2. Create an IAM user `workout-tracker-app` with no console access
3. Attach an inline policy scoped to only that table:
   - `dynamodb:GetItem`
   - `dynamodb:PutItem`
   - `dynamodb:UpdateItem`
   - `dynamodb:Query`
   - `dynamodb:DeleteItem`
   - Resource: `arn:aws:dynamodb:<region>:<account-id>:table/workout-tracker`
4. Generate access key + secret for that user
5. Add to GitHub repo secrets:
   - `VITE_AWS_ACCESS_KEY_ID`
   - `VITE_AWS_SECRET_ACCESS_KEY`
   - `VITE_AWS_REGION`
6. Reference in app via `import.meta.env.VITE_AWS_ACCESS_KEY_ID` etc.
7. Add to CI workflow as env vars on the build step

---

## V1 Scope

- [ ] Session selection (pick the day)
- [ ] Exercise list per day (from final.md)
- [ ] Log sets: weight / reps / RIR
- [ ] Show last session's numbers as reference
- [ ] Progression flag when criteria met
- [ ] Session history view

## Out of Scope (v1)
- Auth
- 5/3/1 tracking
- Offline support
- Multiple users
