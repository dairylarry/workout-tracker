import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgram } from '../context/ProgramContext'
import { putSessionType } from '../lib/dynamodb'
import '../styles/ManageWorkout.css'

const SESSION_ORDER = ['lower-a', 'upper-a', 'lower-b', 'upper-b']
const MUSCLE_GROUPS = ['quads', 'hamstrings', 'glutes', 'calves', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'core']

export default function ManageWorkout() {
  const navigate = useNavigate()
  const { program, exerciseLibrary, updateProgram } = useProgram()
  const [editMode, setEditMode] = useState(false)
  const [editingSubs, setEditingSubs] = useState(null) // { sessionId, exerciseName }
  const [subFilter, setSubFilter] = useState('')
  const [subFamilyFilter, setSubFamilyFilter] = useState('')

  if (!program) return <div className="manage-workout"><p>Loading...</p></div>

  async function handleRemoveSub(sessionId, exerciseName, subToRemove) {
    const session = program.sessionTypes[sessionId]
    const updatedExercises = session.exercises.map(ex => {
      if (ex.name !== exerciseName) return ex
      const updatedSubs = (ex.subs || []).filter(s => {
        const name = typeof s === 'object' ? s.name : s
        return name !== subToRemove
      })
      return { ...ex, subs: updatedSubs }
    })
    const updatedSession = { ...session, exercises: updatedExercises }
    await putSessionType(sessionId, updatedSession)
    updateProgram(sessionId, updatedSession)
  }

  async function handleAddSub(sessionId, exerciseName, libExercise) {
    const session = program.sessionTypes[sessionId]
    const updatedExercises = session.exercises.map(ex => {
      if (ex.name !== exerciseName) return ex
      const currentSubs = ex.subs || []
      // Check if already a sub
      const alreadyExists = currentSubs.some(s => {
        const name = typeof s === 'object' ? s.name : s
        return name === libExercise.name
      })
      if (alreadyExists) return ex
      return { ...ex, subs: [...currentSubs, libExercise.name] }
    })
    const updatedSession = { ...session, exercises: updatedExercises }
    await putSessionType(sessionId, updatedSession)
    updateProgram(sessionId, updatedSession)
    setEditingSubs(null)
  }

  // Filter exercise library for sub picker
  function getFilteredLibrary(exerciseName) {
    const muscleFiltered = exerciseLibrary
      .filter(ex => ex.name !== exerciseName)
      .filter(ex => !subFilter || ex.muscleGroups?.some(mg => mg === subFilter))
    return muscleFiltered
      .filter(ex => !subFamilyFilter || ex.family === subFamilyFilter)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  // Get available families from muscle-filtered results
  function getAvailableFamilies(exerciseName) {
    const muscleFiltered = exerciseLibrary
      .filter(ex => ex.name !== exerciseName)
      .filter(ex => !subFilter || ex.muscleGroups?.some(mg => mg === subFilter))
    const families = new Set(muscleFiltered.map(ex => ex.family).filter(Boolean))
    return [...families].sort()
  }

  return (
    <div className="manage-workout">
      <button className="back" onClick={() => navigate('/')}>← Back</button>
      <h2>Manage Workout</h2>

      {!editMode && (
        <button className="mw-edit-btn" onClick={() => setEditMode(true)}>Edit Workout</button>
      )}
      {editMode && (
        <button className="mw-done-btn" onClick={() => { setEditMode(false); setEditingSubs(null) }}>Done Editing</button>
      )}

      <button className="mw-library-btn" onClick={() => navigate('/manage/library')}>
        Exercise Library ({exerciseLibrary.length})
      </button>

      {SESSION_ORDER.map(sessionId => {
        const session = program.sessionTypes[sessionId]
        if (!session) return null

        return (
          <div key={sessionId} className="mw-session">
            <h3>{session.name} <span className="mw-day">{session.day} · {session.focus}</span></h3>

            {session.exercises.map(ex => {
              const isEditing = editingSubs?.sessionId === sessionId && editingSubs?.exerciseName === ex.name

              return (
                <div key={ex.name} className="mw-exercise">
                  <div className="mw-exercise-header">
                    <div className="mw-exercise-name">
                      {ex.name}
                      {ex.superset && <span className={`mw-superset-badge superset-${ex.superset.toLowerCase()}`}>Superset {ex.superset}</span>}
                    </div>
                    {ex.is531 ? (
                      <span className="mw-badge-531">5s PRO</span>
                    ) : (
                      <span className="mw-exercise-meta">
                        {ex.sets} × {ex.repRange[0] === ex.repRange[1] ? ex.repRange[0] : `${ex.repRange[0]}–${ex.repRange[1]}`}
                        {ex.perSide ? '/side' : ''} · RIR {ex.rir} · {ex.rest}
                      </span>
                    )}
                  </div>

                  {!ex.is531 && (
                    <div className="mw-subs">
                      <div className="mw-subs-label">Subs:</div>
                      <div className="mw-subs-list">
                        {(ex.subs || []).length === 0 && <span className="mw-no-subs">None</span>}
                        {(ex.subs || []).map(sub => {
                          const subName = typeof sub === 'object' ? sub.name : sub
                          const subDetail = typeof sub === 'object'
                            ? ` (${sub.sets}×${sub.repRange[0] === sub.repRange[1] ? sub.repRange[0] : `${sub.repRange[0]}–${sub.repRange[1]}`}, RIR ${sub.rir})`
                            : ''
                          return (
                            <div key={subName} className="mw-sub-chip">
                              <span>{subName}{subDetail}</span>
                              {editMode && <button className="mw-sub-remove" onClick={() => handleRemoveSub(sessionId, ex.name, subName)}>✕</button>}
                            </div>
                          )
                        })}
                      </div>
                      {editMode && (
                        <button
                          className="mw-add-sub-btn"
                          onClick={() => { setEditingSubs(isEditing ? null : { sessionId, exerciseName: ex.name }); setSubFilter(''); setSubFamilyFilter('') }}
                        >
                          {isEditing ? 'Done' : '+ Add Sub'}
                        </button>
                      )}

                      {editMode && isEditing && (
                        <div className="mw-sub-picker">
                          <div className="mw-filter-row">
                            <select value={subFilter} onChange={e => { setSubFilter(e.target.value); setSubFamilyFilter('') }} className="mw-filter">
                              <option value="">All muscle groups</option>
                              {MUSCLE_GROUPS.map(mg => (
                                <option key={mg} value={mg}>{mg}</option>
                              ))}
                            </select>
                            <select value={subFamilyFilter} onChange={e => setSubFamilyFilter(e.target.value)} className="mw-filter">
                              <option value="">All families</option>
                              {getAvailableFamilies(ex.name).map(f => (
                                <option key={f} value={f}>{f}</option>
                              ))}
                            </select>
                          </div>
                          <div className="mw-sub-picker-list">
                            {getFilteredLibrary(ex.name).map(libEx => (
                              <button
                                key={libEx.name}
                                className="mw-sub-picker-item"
                                onClick={() => handleAddSub(sessionId, ex.name, libEx)}
                              >
                                {libEx.name}
                                <span className="mw-sub-picker-meta">
                                  {libEx.muscleGroups?.join(', ')}
                                  {libEx.family ? ` · ${libEx.family}` : ''}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

    </div>
  )
}
