import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getSession, deleteSession } from '../lib/dynamodb'
import { PROGRAM } from '../lib/programConfig'
import '../styles/SessionDetail.css'

export default function SessionDetail() {
  const { sessionType, date } = useParams()
  const navigate = useNavigate()
  const config = PROGRAM.sessionTypes[sessionType]
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await getSession(sessionType, date)
        setSession(data)
      } catch (e) {
        console.error('Failed to load session:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionType, date])

  async function handleDelete() {
    try {
      await deleteSession(sessionType, date)
      navigate('/history')
    } catch (e) {
      console.error('Failed to delete session:', e)
    }
  }

  if (loading) return <div className="session-detail"><p>Loading...</p></div>
  if (!session) return <div className="session-detail"><p>Session not found.</p></div>

  return (
    <div className="session-detail">
      <button className="back" onClick={() => navigate('/history')}>← Back</button>
      <h2>{config?.name || sessionType}</h2>
      <p className="detail-date">
        {date}
        {session.deload && <span className="deload-badge">Deload</span>}
      </p>

      {session.exercises?.map(exercise => (
        <div key={exercise.name} className="detail-exercise">
          <h3>{exercise.name}</h3>
          <div className="detail-sets">
            <div className="detail-set-row detail-set-header">
              <span>Set</span>
              <span>Weight</span>
              <span>Reps</span>
              <span>RIR</span>
            </div>
            {exercise.sets?.map(set => (
              <div key={set.setNumber} className="detail-set-row">
                <span>{set.setNumber}</span>
                <span>{set.weight ? `${set.weight} ${set.weightUnit || 'lbs'}` : '—'}</span>
                <span>{set.reps || '—'}</span>
                <span>{set.rir !== '' && set.rir !== undefined ? set.rir : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="delete-section">
        {!confirmDelete ? (
          <button className="delete-btn" onClick={() => setConfirmDelete(true)}>
            Delete Session
          </button>
        ) : (
          <div className="confirm-delete">
            <p>Delete this session permanently?</p>
            <div className="confirm-actions">
              <button className="confirm-yes" onClick={handleDelete}>Yes, delete</button>
              <button className="confirm-no" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
