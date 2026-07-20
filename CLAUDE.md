# Claude Guidelines — Workout Tracker

## Workflow
- **Confirm before coding** — discuss and propose first; implement only when explicitly asked
- **Don't commit** unless explicitly asked
- **Bump the version** on every shipped change — assume minor unless told otherwise; update the version string in `frontend/src/constants/version.js`

## Code Style
- **Minimal changes** — no abstractions, refactors, or cleanup beyond what the task requires
- **No overengineering** — don't design for hypothetical future requirements
- **Good practices** — no comments explaining what the code does; no duplicate state; no unnecessary complexity
- **Fix all call sites** — when fixing a bug, scan for the same pattern elsewhere and fix them together

## UI/UX
- **Style guide** — see `STYLE.md` for button conventions, label rules (× vs Remove), chip/tag patterns, and iOS considerations
- **Describe before implementing** — for any UI/UX change, explain the approach and get approval first
- **Propose alternatives sparingly** — only suggest a different approach if it is genuinely better than what was asked AND follows established UI/UX best practices; otherwise implement as requested
- **Mobile-first** — this is a PWA used on iOS; watch for tap target sizes, input zoom (font-size < 16px triggers iOS zoom), and scroll behavior

## Data & CSS
- **Guard against missing fields** — DynamoDB records from older writes may lack fields; always use `?.` and `|| ''` fallbacks in sorts and filters
- **CSS specificity** — component-level styles override global rules; account for this when writing shared styles
