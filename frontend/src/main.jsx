import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import { reseedExerciseLibraryMetaOnly } from './seeds/reseed.js'
import App from './App.jsx'

// window.reseedExerciseLibraryMetaOnly = reseedExerciseLibraryMetaOnly

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
