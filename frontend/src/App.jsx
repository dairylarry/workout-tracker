import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { flushWriteQueue } from './lib/dynamodb'
import Home from './pages/Home'
import StartSession from './pages/StartSession'
import ActiveSession from './pages/ActiveSession'
import History from './pages/History'
import SessionDetail from './pages/SessionDetail'
import Plan from './pages/Plan'
import './styles/App.css'

export default function App() {
  useEffect(() => {
    flushWriteQueue()
    window.addEventListener('online', flushWriteQueue)
    return () => window.removeEventListener('online', flushWriteQueue)
  }, [])

  return (
    <BrowserRouter basename="/workout-tracker">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/session/start" element={<StartSession />} />
        <Route path="/session/:sessionType/:date" element={<ActiveSession />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:sessionType/:date" element={<SessionDetail />} />
        <Route path="/plan" element={<Plan />} />
      </Routes>
    </BrowserRouter>
  )
}
