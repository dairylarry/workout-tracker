import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { flushWriteQueue } from './lib/dynamodb'
import { ProgramProvider } from './context/ProgramContext'
import Home from './pages/Home'
import StartSession from './pages/StartSession'
import ActiveSession from './pages/ActiveSession'
import History from './pages/History'
import SessionDetail from './pages/SessionDetail'
import Plan from './pages/Plan'
import DoubleProgression from './pages/DoubleProgression'
import LogWeight from './pages/LogWeight'
import FiveThreeOneConfig from './pages/FiveThreeOneConfig'
import ManageWorkout from './pages/ManageWorkout'
import ExerciseLibrary from './pages/ExerciseLibrary'
import AudioTest from './pages/AudioTest'
import './styles/App.css'

export default function App() {
  useEffect(() => {
    flushWriteQueue()
    window.addEventListener('online', flushWriteQueue)
    return () => window.removeEventListener('online', flushWriteQueue)
  }, [])

  return (
    <ProgramProvider>
    <BrowserRouter basename="/workout-tracker">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/session/start" element={<StartSession />} />
        <Route path="/session/:sessionType/:date" element={<ActiveSession />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:sessionType/:date" element={<SessionDetail />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/progression" element={<DoubleProgression />} />
        <Route path="/weight" element={<LogWeight />} />
        <Route path="/531" element={<FiveThreeOneConfig />} />
        <Route path="/manage" element={<ManageWorkout />} />
        <Route path="/manage/library" element={<ExerciseLibrary />} />
        <Route path="/audio-test" element={<AudioTest />} />
      </Routes>
    </BrowserRouter>
    </ProgramProvider>
  )
}
