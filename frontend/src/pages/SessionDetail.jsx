import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getSession, deleteSession, updateSessionExercises, updateSessionField, getTags, putTags } from '../lib/dynamodb'
import { useProgram } from '../context/ProgramContext'
import { getDisplayName } from '../constants/exercises'
import NoteRenderer from '../components/NoteRenderer'
import TagChip from '../components/TagChip'
import { DEFAULT_TAGS, resolveSessionTags } from '../constants/tags'
import '../styles/SessionDetail.css'

export default function SessionDetail() {
  const { sessionType, date } = useParams()
  const navigate = useNavigate()
  const { program, exerciseLibrary } = useProgram()
  const config = program?.sessionTypes[sessionType]
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editExercises, setEditExercises] = useState(null)
  const [editTags, setEditTags] = useState([])
  const [allTags, setAllTags] = useState([])
  const [swapOpen, setSwapOpen] = useState(null)
  const [editNotes, setEditNotes] = useState('')
  const [saveStatus, setSaveStatus] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [data, tagsResult] = await Promise.all([
          getSession(sessionType, date),
          getTags(),
        ])
        setSession(data)
        let loadedTags = tagsResult
        if (loadedTags === null) {
          loadedTags = DEFAULT_TAGS
          putTags(loadedTags)
        }
        setAllTags(loadedTags)
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
    setEditTags(resolveSessionTags(session))
    setEditNotes(session.notes || '')
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
      const prevTags = resolveSessionTags(session)
      if (JSON.stringify([...editTags].sort()) !== JSON.stringify([...prevTags].sort())) {
        await updateSessionField(sessionType, date, 'tags', editTags)
      }
      if (editNotes !== (session.notes || '')) {
        await updateSessionField(sessionType, date, 'notes', editNotes)
      }
      setSession(prev => ({ ...prev, exercises: editExercises, tags: editTags, notes: editNotes }))
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

  function handleNoteChange(exIndex, value) {
    setEditExercises(prev => prev.map((ex, ei) => {
      if (ei !== exIndex) return ex
      return { ...ex, note: value }
    }))
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
  const displayTags = (editing ? editTags : resolveSessionTags(session))
    .map(id => allTags.find(t => t.id === id))
    .filter(Boolean)

  return (
    <div className="session-detail">
      <button className="back" onClick={() => navigate('/history')}>← Back</button>
      <h2>{config?.name || sessionType}</h2>
      <p className="detail-date">
        {date}
        {!editing && displayTags.length > 0 && (
          <span className="session-tags-display">
            {displayTags.map(tag => <TagChip key={tag.id} tag={tag} />)}
          </span>
        )}
      </p>

      {editing && allTags.filter(t => !t.deleted).length > 0 && (
        <div className="session-tags-row">
          {allTags.filter(t => !t.deleted).map(tag => (
            <TagChip
              key={tag.id}
              tag={tag}
              active={editTags.includes(tag.id)}
              onToggle={id => setEditTags(prev =>
                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
              )}
            />
          ))}
        </div>
      )}

      {!editing && (
        <button className="edit-btn" onClick={startEditing}>Edit Session</button>
      )}

      {exercises?.map((exercise, exIndex) => {
        const exConfig = config?.exercises.find(e => e.name === exercise.name)
        const displayName = getDisplayName(exercise.swappedName || exercise.name, exerciseLibrary)
        const isSwapped = !!exercise.swappedName
        const isSwapOpen = swapOpen === exIndex

        return (
          <div key={exercise.name} className="detail-exercise">
            <div className="detail-exercise-header">
              <h3>{displayName}{exercise.supplemental && <span className="addon-badge">Add-on</span>}</h3>
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
              <span className="swapped-from">Originally: {getDisplayName(exercise.name, exerciseLibrary)}</span>
            )}

            {editing && isSwapOpen && exConfig && (
              <div className="swap-panel">
                {exConfig.subs?.map(sub => (
                  <button key={sub} className="swap-option" onClick={() => handleSwap(exIndex, sub)}>
                    {getDisplayName(sub, exerciseLibrary)}
                  </button>
                ))}
                {isSwapped && (
                  <button className="swap-reset" onClick={() => handleResetSwap(exIndex)}>
                    Reset to {getDisplayName(exercise.name, exerciseLibrary)}
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
            {editing ? (
              <div className="detail-exercise-note-edit">
                <hr className="exercise-note-divider" />
                <textarea
                  className="exercise-note-input"
                  placeholder="Exercise note..."
                  value={exercise.note || ''}
                  onChange={e => handleNoteChange(exIndex, e.target.value)}
                  rows={2}
                />
              </div>
            ) : exercise.note ? (
              <div className="detail-exercise-note">
                <hr className="exercise-note-divider" />
                <NoteRenderer className="history-exercise-note">{exercise.note}</NoteRenderer>
              </div>
            ) : null}
          </div>
        )
      })}

      {editing ? (
        <div className="detail-notes">
          <label className="detail-notes-label" htmlFor="detail-notes">Notes</label>
          <textarea
            id="detail-notes"
            className="detail-notes-input"
            value={editNotes}
            placeholder="Session notes..."
            onChange={e => setEditNotes(e.target.value)}
            rows={3}
          />
        </div>
      ) : session.notes ? (
        <div className="detail-notes">
          <span className="detail-notes-label">Notes</span>
          <NoteRenderer className="detail-notes-text">{session.notes}</NoteRenderer>
        </div>
      ) : null}

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
