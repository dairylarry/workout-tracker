import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { reseedExerciseLibraryMetaOnly } from './seeds/reseed.js'
import { backfillDeloadHistory } from './seeds/reseed'
import App from './App.jsx'

window.reseedExerciseLibraryMetaOnly = reseedExerciseLibraryMetaOnly
window.backfillDeloadHistory = backfillDeloadHistory

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
