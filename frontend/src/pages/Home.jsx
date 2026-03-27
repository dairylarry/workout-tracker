import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToday } from '../lib/date'
import { getSession } from '../lib/dynamodb'
import { useProgram } from '../context/ProgramContext'
import '../styles/Home.css'

export default function Home() {
  const navigate = useNavigate()
  const { program, loading: programLoading } = useProgram()
  const [todaySession, setTodaySession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (programLoading || !program) return
    async function findToday() {
      const today = getToday()
      const sessionTypes = Object.keys(program.sessionTypes)
      try {
        for (const type of sessionTypes) {
          const session = await getSession(type, today)
          if (session) {
            setTodaySession({ type, date: today, name: program.sessionTypes[type].name })
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
  }, [programLoading, program])

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
        <button onClick={() => navigate('/weight')}>Log Weight</button>
        <button onClick={() => navigate('/manage')}>Manage Workout</button>
        <button onClick={() => navigate('/531')}>5/3/1 Config</button>
        <button onClick={() => navigate('/plan')}>View Plan</button>
        <button onClick={() => navigate('/progression')}>Progression Guide</button>
        <button onClick={() => navigate('/core')}>Core Work</button>
      </nav>
    </div>
  )
}
