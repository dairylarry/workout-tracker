import { useNavigate } from 'react-router-dom'
import { getToday } from '../lib/date'
import '../styles/StartSession.css'

const SESSION_TYPES = [
  { id: 'lower-a', label: 'Lower A', day: 'Monday', focus: 'Strength + Hypertrophy' },
  { id: 'upper-a', label: 'Upper A', day: 'Tuesday', focus: 'Strength + Hypertrophy' },
  { id: 'lower-b', label: 'Lower B', day: 'Thursday', focus: 'Hypertrophy' },
  { id: 'upper-b', label: 'Upper B', day: 'Friday', focus: 'Hypertrophy' },
]

export default function StartSession() {
  const navigate = useNavigate()

  function handleSelect(sessionId) {
    const today = getToday()
    navigate(`/session/${sessionId}/${today}`)
  }

  return (
    <div className="start-session">
      <button className="back" onClick={() => navigate('/')}>← Back</button>
      <h2>Start Session</h2>
      <div className="session-list">
        {SESSION_TYPES.map(s => (
          <button key={s.id} className="session-card" onClick={() => handleSelect(s.id)}>
            <span className="session-label">{s.label}</span>
            <span className="session-meta">{s.day} · {s.focus}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
