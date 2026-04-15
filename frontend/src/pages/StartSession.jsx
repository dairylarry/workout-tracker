import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToday } from '../lib/date'
import { getSession } from '../lib/dynamodb'
import '../styles/StartSession.css'

const SESSION_TYPES = [
  { id: 'lower-a',   label: 'Lower A',   day: 'Monday',   focus: 'Strength + Hypertrophy' },
  { id: 'upper-a',   label: 'Upper A',   day: 'Tuesday',  focus: 'Strength + Hypertrophy' },
  { id: 'lower-b',   label: 'Lower B',   day: 'Thursday', focus: 'Hypertrophy' },
  { id: 'upper-b',   label: 'Upper B',   day: 'Friday',   focus: 'Hypertrophy' },
  { id: 'upper-c',   label: 'Upper C',   day: 'Sunday',   focus: 'Arms + Delts' },
  { id: 'upper-a-5', label: 'Upper A-5', day: 'Tuesday',  focus: 'Strength + Hypertrophy (5-day)' },
  { id: 'upper-b-5', label: 'Upper B-5', day: 'Friday',   focus: 'Hypertrophy (5-day)' },
]

export default function StartSession() {
  const navigate = useNavigate()
  const today = getToday()
  const [inProgress, setInProgress] = useState({})

  useEffect(() => {
    async function checkToday() {
      const results = await Promise.all(
        SESSION_TYPES.map(async s => {
          const session = await getSession(s.id, today)
          return [s.id, !!session]
        })
      )
      setInProgress(Object.fromEntries(results))
    }
    checkToday()
  }, [today])

  function handleSelect(sessionId) {
    navigate(`/session/${sessionId}/${today}`)
  }

  return (
    <div className="start-session">
      <button className="back" onClick={() => navigate('/')}>← Back</button>
      <h2>Start / Resume Session</h2>
      <div className="session-list">
        {SESSION_TYPES.map(s => (
          <button key={s.id} className="session-card" onClick={() => handleSelect(s.id)}>
            <div className="session-card-top">
              <span className="session-label">{s.label}</span>
              {inProgress[s.id] && <span className="in-progress-badge">In progress</span>}
            </div>
            <span className="session-meta">{s.day} · {s.focus}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
