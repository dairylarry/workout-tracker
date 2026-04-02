# workout-tracker

This is a workout tracker. :)

## Dev setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```
VITE_AWS_REGION=us-east-1
VITE_AWS_ACCESS_KEY_ID=your_access_key
VITE_AWS_SECRET_ACCESS_KEY=your_secret_key
```

```bash
npm run dev
```

App runs at http://localhost:5173.

## Deploy

```bash
npm run deploy
```