import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { backfillExerciseHistory } from './lib/dynamodb'

// Expose for one-time console use: window.backfillExerciseHistory()
window.backfillExerciseHistory = backfillExerciseHistory

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
