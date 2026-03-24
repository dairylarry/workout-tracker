import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getSession, deleteSession, updateSessionExercises, updateSessionField } from '../lib/dynamodb'
import { useProgram } from '../context/ProgramContext'
import '../styles/SessionDetail.css'

export default function SessionDetail() {
  const { sessionType, date } = useParams()
  const navigate = useNavigate()
  const { program } = useProgram()
  const config = program?.sessionTypes[sessionType]
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editExercises, setEditExercises] = useState(null)
  const [editDeload, setEditDeload] = useState(false)
  const [swapOpen, setSwapOpen] = useState(null)
  const [saveStatus, setSaveStatus] = useState(null)

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

  function startEditing() {
    setEditExercises(JSON.parse(JSON.stringify(session.exercises)))
    setEditDeload(session.deload || false)
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setEditExercises(null)
    setSwapOpen(null)

    setSaveStatus(null)
  }

  async function handleSave() {
    setSaveStatus('saving')
    try {
      await updateSessionExercises(sessionType, date, editExercises)
      if (editDeload !== (session.deload || false)) {
        await updateSessionField(sessionType, date, 'deload', editDeload)
      }
      setSession(prev => ({ ...prev, exercises: editExercises, deload: editDeload }))
      setEditing(false)
      setEditExercises(null)
      setSaveStatus(null)
    } catch (e) {
      console.error('Failed to save:', e)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  function handleSetChange(exIndex, setIndex, field, value) {
    setEditExercises(prev => prev.map((ex, ei) => {
      if (ei !== exIndex) return ex
      return {
        ...ex,
        sets: ex.sets.map((s, si) => {
          if (si !== setIndex) return s
          return { ...s, [field]: value }
        }),
      }
    }))
  }

  function handleSwap(exIndex, newName) {
    setEditExercises(prev => prev.map((ex, ei) => {
      if (ei !== exIndex) return ex
      return { ...ex, swappedName: newName }
    }))
    setSwapOpen(null)

  }

  function handleResetSwap(exIndex) {
    setEditExercises(prev => prev.map((ex, ei) => {
      if (ei !== exIndex) return ex
      const { swappedName, ...rest } = ex
      return rest
    }))
    setSwapOpen(null)
  }

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

  const exercises = editing ? editExercises : session.exercises
  const deload = editing ? editDeload : (session.deload || false)

  return (
    <div className="session-detail">
      <button className="back" onClick={() => navigate('/history')}>← Back</button>
      <h2>{config?.name || sessionType}</h2>
      <p className="detail-date">
        {date}
        {deload && !editing && <span className="deload-badge">Deload</span>}
      </p>

      {editing && (
        <label className="deload-toggle">
          <input
            type="checkbox"
            checked={editDeload}
            onChange={e => setEditDeload(e.target.checked)}
          />
          Deload week
        </label>
      )}

      {!editing && (
        <button className="edit-btn" onClick={startEditing}>Edit Session</button>
      )}

      {exercises?.map((exercise, exIndex) => {
        const exConfig = config?.exercises.find(e => e.name === exercise.name)
        const displayName = exercise.swappedName || exercise.name
        const isSwapped = !!exercise.swappedName
        const isSwapOpen = swapOpen === exIndex

        return (
          <div key={exercise.name} className="detail-exercise">
            <div className="detail-exercise-header">
              <h3>{displayName}</h3>
              {editing && exConfig && !exConfig.is531 && (
                <button
                  className="swap-btn"
                  onClick={() => setSwapOpen(isSwapOpen ? null : exIndex)}
                >
                  Swap
                </button>
              )}
            </div>
            {isSwapped && (
              <span className="swapped-from">Originally: {exercise.name}</span>
            )}

            {editing && isSwapOpen && exConfig && (
              <div className="swap-panel">
                {exConfig.subs?.map(sub => (
                  <button key={sub} className="swap-option" onClick={() => handleSwap(exIndex, sub)}>
                    {sub}
                  </button>
                ))}
                {isSwapped && (
                  <button className="swap-reset" onClick={() => handleResetSwap(exIndex)}>
                    Reset to {exercise.name}
                  </button>
                )}
              </div>
            )}

            <div className="detail-sets">
              <div className="detail-set-row detail-set-header">
                <span>Set</span>
                <span>Weight</span>
                {editing && <span>Unit</span>}
                <span>Reps</span>
                <span>RIR</span>
              </div>
              {exercise.sets?.map((set, setIndex) => (
                <div key={set.setNumber} className={`detail-set-row ${editing ? 'detail-set-editing' : ''}`}>
                  <span>{set.setNumber}</span>
                  {editing ? (
                    <>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={set.weight}
                        placeholder="—"
                        onChange={e => handleSetChange(exIndex, setIndex, 'weight', e.target.value)}
                      />
                      <select
                        value={set.weightUnit || 'lbs'}
                        onChange={e => handleSetChange(exIndex, setIndex, 'weightUnit', e.target.value)}
                      >
                        <option value="lbs">lbs</option>
                        <option value="kg">kg</option>
                      </select>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={set.reps}
                        placeholder="—"
                        onChange={e => handleSetChange(exIndex, setIndex, 'reps', e.target.value)}
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        value={set.rir}
                        placeholder="—"
                        onChange={e => handleSetChange(exIndex, setIndex, 'rir', e.target.value)}
                      />
                    </>
                  ) : (
                    <>
                      <span>{set.weight ? `${set.weight} ${set.weightUnit || 'lbs'}` : '—'}</span>
                      <span>{set.reps || '—'}</span>
                      <span>{set.rir !== '' && set.rir !== undefined ? set.rir : '—'}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {editing && (
        <div className="edit-actions">
          <button className="save-btn" onClick={handleSave} disabled={saveStatus === 'saving'}>
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'error' ? 'Save failed — retry' : 'Save'}
          </button>
          <button className="cancel-btn" onClick={cancelEditing}>Cancel</button>
        </div>
      )}

      {!editing && (
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
      )}
    </div>
  )
}
