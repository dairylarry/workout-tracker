import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToday } from '../lib/date'
import { getSession } from '../lib/dynamodb'
import { useProgram } from '../context/ProgramContext'
import { VERSION } from '../constants/version'
import '../styles/Home.css'

const RESUME_CACHE_KEY = 'resume-session-cache'

function readResumeCache() {
  try {
    const raw = localStorage.getItem(RESUME_CACHE_KEY)
    if (!raw) return []
    const cached = JSON.parse(raw)
    const today = getToday()
    // Support both old single-object format and new array format
    const arr = Array.isArray(cached) ? cached : [cached]
    if (arr[0]?.date !== today) {
      localStorage.removeItem(RESUME_CACHE_KEY)
      return []
    }
    return arr
  } catch {
    return []
  }
}

function writeResumeCache(sessions) {
  try {
    if (sessions.length > 0) {
      localStorage.setItem(RESUME_CACHE_KEY, JSON.stringify(sessions))
    } else {
      localStorage.removeItem(RESUME_CACHE_KEY)
    }
  } catch {
    // ignore storage errors
  }
}

export default function Home() {
  const navigate = useNavigate()
  const { program, loading: programLoading } = useProgram()
  // Show cached resume-sessions immediately (for today only) to avoid flash
  const [todaySessions, setTodaySessions] = useState(() => readResumeCache())

  useEffect(() => {
    if (programLoading || !program) return
    async function findToday() {
      const today = getToday()
      const sessionTypes = Object.keys(program.sessionTypes)
      try {
        const found = []
        for (const type of sessionTypes) {
          const session = await getSession(type, today)
          if (session) found.push({ type, date: today, name: program.sessionTypes[type].name })
        }
        setTodaySessions(found)
        writeResumeCache(found)
      } catch (e) {
        console.warn('Failed to check today sessions:', e.message)
      }
    }
    findToday()
  }, [programLoading, program])

  return (
    <div className="home">
      <h1>Workout Tracker</h1>
      <p className="app-version">v {VERSION}</p>
      <nav className="home-nav">
        {todaySessions.map(s => (
          <button
            key={s.type}
            className="resume-btn"
            onClick={() => navigate(`/session/${s.type}/${s.date}`)}
          >
            Resume Session — {s.name}
          </button>
        ))}
        <button onClick={() => navigate('/session/start')}>New Session</button>
        <button onClick={() => navigate('/history')}>View Sessions</button>
        <button onClick={() => navigate('/weight')}>Log Weight</button>
        <button onClick={() => navigate('/manage')}>Manage Workout</button>
        <button onClick={() => navigate('/531')}>5/3/1 Config</button>
        <button onClick={() => navigate('/plan')}>View Plan</button>
        <button onClick={() => navigate('/progression')}>Progression Guide</button>
        <button onClick={() => navigate('/interval')}>Interval Timer</button>
      </nav>
    </div>
  )
}
