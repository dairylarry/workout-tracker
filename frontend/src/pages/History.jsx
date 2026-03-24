import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllSessionsForType } from '../lib/dynamodb'
import { useProgram } from '../context/ProgramContext'
import '../styles/History.css'

export default function History() {
  const navigate = useNavigate()
  const { program } = useProgram()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!program) return
    async function load() {
      try {
        const results = await Promise.all(
          Object.keys(program.sessionTypes).map(type => getAllSessionsForType(type))
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
  }, [program])

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
          const config = program?.sessionTypes[session.sessionType]
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
