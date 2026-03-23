import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllSessionsForType } from '../lib/dynamodb'
import { PROGRAM } from '../lib/programConfig'
import '../styles/History.css'

const SESSION_TYPES = Object.keys(PROGRAM.sessionTypes)

export default function History() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const results = await Promise.all(
          SESSION_TYPES.map(type => getAllSessionsForType(type))
        )
        const all = results
          .flat()
          .sort((a, b) => b.date.localeCompare(a.date))
        setSessions(all)
      } catch (e) {
        console.error('Failed to load history:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="history">
      <button className="back" onClick={() => navigate('/')}>← Back</button>
      <h2>Session History</h2>

      {loading && <p>Loading...</p>}

      {!loading && sessions.length === 0 && (
        <p className="empty">No sessions logged yet.</p>
      )}

      <div className="history-list">
        {sessions.map(session => {
          const config = PROGRAM.sessionTypes[session.sessionType]
          return (
            <button
              key={`${session.sessionType}-${session.date}`}
              className="history-card"
              onClick={() => navigate(`/history/${session.sessionType}/${session.date}`)}
            >
              <span className="history-date">{session.date}</span>
              <span className="history-type">
                {config?.name || session.sessionType}
                {session.deload && <span className="deload-badge">Deload</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
