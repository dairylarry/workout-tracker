import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToday } from '../lib/date'
import { getSession } from '../lib/dynamodb'
import { PROGRAM } from '../lib/programConfig'
import '../styles/Home.css'

const SESSION_TYPES = Object.keys(PROGRAM.sessionTypes)

export default function Home() {
  const navigate = useNavigate()
  const [todaySession, setTodaySession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function findToday() {
      const today = getToday()
      try {
        for (const type of SESSION_TYPES) {
          const session = await getSession(type, today)
          if (session) {
            setTodaySession({ type, date: today, name: PROGRAM.sessionTypes[type].name })
            break
          }
        }
      } catch (e) {
        console.warn('Failed to check today sessions:', e.message)
      } finally {
        setLoading(false)
      }
    }
    findToday()
  }, [])

  return (
    <div className="home">
      <h1>Workout Tracker</h1>
      <nav className="home-nav">
        {!loading && todaySession && (
          <button
            className="resume-btn"
            onClick={() => navigate(`/session/${todaySession.type}/${todaySession.date}`)}
          >
            Resume Session — {todaySession.name}
          </button>
        )}
        <button onClick={() => navigate('/session/start')}>New Session</button>
        <button onClick={() => navigate('/history')}>View Sessions</button>
        <button onClick={() => navigate('/plan')}>View Plan</button>
      </nav>
    </div>
  )
}
