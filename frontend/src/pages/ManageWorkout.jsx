import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgram } from '../lib/ProgramContext'
import { putSessionType, putExercise, deleteExercise, getExerciseLibrary } from '../lib/dynamodb'
import '../styles/ManageWorkout.css'

const SESSION_ORDER = ['lower-a', 'upper-a', 'lower-b', 'upper-b']
const MUSCLE_GROUPS = ['quads', 'hamstrings', 'glutes', 'calves', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'core']

export default function ManageWorkout() {
  const navigate = useNavigate()
  const { program, exerciseLibrary, updateProgram, refreshExerciseLibrary } = useProgram()
  const [editingSubs, setEditingSubs] = useState(null) // { sessionId, exerciseName }
  const [addingExercise, setAddingExercise] = useState(false)
  const [libraryFilter, setLibraryFilter] = useState('')
  const [subFilter, setSubFilter] = useState('')

  // New exercise form state
  const [newName, setNewName] = useState('')
  const [newMuscleGroups, setNewMuscleGroups] = useState([])
  const [newFamily, setNewFamily] = useState('')
  const [newRepRange, setNewRepRange] = useState(['', ''])
  const [newSets, setNewSets] = useState('')

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

  async function handleAddExercise() {
    if (!newName.trim() || newMuscleGroups.length === 0) return
    const exercise = {
      name: newName.trim(),
      muscleGroups: newMuscleGroups,
      family: newFamily.trim() || null,
      defaultRepRange: newRepRange[0] && newRepRange[1] ? [Number(newRepRange[0]), Number(newRepRange[1])] : null,
      defaultSets: newSets ? Number(newSets) : null,
      createdAt: new Date().toISOString().split('T')[0],
    }
    await putExercise(exercise)
    const lib = await getExerciseLibrary()
    refreshExerciseLibrary(lib)
    setNewName('')
    setNewMuscleGroups([])
    setNewFamily('')
    setNewRepRange(['', ''])
    setNewSets('')
    setAddingExercise(false)
  }

  async function handleDeleteExercise(name) {
    await deleteExercise(name)
    const lib = await getExerciseLibrary()
    refreshExerciseLibrary(lib)
  }

  function toggleMuscleGroup(group) {
    setNewMuscleGroups(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    )
  }

  // Filter exercise library for sub picker
  function getFilteredLibrary(exerciseName) {
    const currentExConfig = null // could use to get family later
    return exerciseLibrary
      .filter(ex => ex.name !== exerciseName) // don't show the primary exercise
      .filter(ex => !subFilter || ex.muscleGroups?.some(mg => mg === subFilter))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const filteredLibrary = exerciseLibrary
    .filter(ex => !libraryFilter || ex.muscleGroups?.some(mg => mg === libraryFilter))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="manage-workout">
      <button className="back" onClick={() => navigate('/')}>← Back</button>
      <h2>Manage Workout</h2>

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
                    <div className="mw-exercise-name">{ex.name}</div>
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
                              <button className="mw-sub-remove" onClick={() => handleRemoveSub(sessionId, ex.name, subName)}>✕</button>
                            </div>
                          )
                        })}
                      </div>
                      <button
                        className="mw-add-sub-btn"
                        onClick={() => setEditingSubs(isEditing ? null : { sessionId, exerciseName: ex.name })}
                      >
                        {isEditing ? 'Done' : '+ Add Sub'}
                      </button>

                      {isEditing && (
                        <div className="mw-sub-picker">
                          <select value={subFilter} onChange={e => setSubFilter(e.target.value)} className="mw-filter">
                            <option value="">All muscle groups</option>
                            {MUSCLE_GROUPS.map(mg => (
                              <option key={mg} value={mg}>{mg}</option>
                            ))}
                          </select>
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

      <div className="mw-library-section">
        <h3>Exercise Library</h3>
        <p className="mw-library-count">{exerciseLibrary.length} exercises</p>

        <select value={libraryFilter} onChange={e => setLibraryFilter(e.target.value)} className="mw-filter">
          <option value="">All muscle groups</option>
          {MUSCLE_GROUPS.map(mg => (
            <option key={mg} value={mg}>{mg}</option>
          ))}
        </select>

        <div className="mw-library-list">
          {filteredLibrary.map(ex => (
            <div key={ex.name} className="mw-library-item">
              <div>
                <span className="mw-library-name">{ex.name}</span>
                <span className="mw-library-meta">
                  {ex.muscleGroups?.join(', ')}
                  {ex.family ? ` · ${ex.family}` : ''}
                  {ex.defaultRepRange ? ` · ${ex.defaultRepRange[0]}–${ex.defaultRepRange[1]}` : ''}
                  {ex.defaultSets ? ` · ${ex.defaultSets} sets` : ''}
                </span>
              </div>
              <button className="mw-library-delete" onClick={() => handleDeleteExercise(ex.name)}>✕</button>
            </div>
          ))}
        </div>

        {!addingExercise ? (
          <button className="mw-add-exercise-btn" onClick={() => setAddingExercise(true)}>+ Add Exercise</button>
        ) : (
          <div className="mw-add-form">
            <input
              type="text"
              placeholder="Exercise name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="mw-input"
            />
            <div className="mw-muscle-groups">
              {MUSCLE_GROUPS.map(mg => (
                <button
                  key={mg}
                  className={`mw-mg-btn ${newMuscleGroups.includes(mg) ? 'active' : ''}`}
                  onClick={() => toggleMuscleGroup(mg)}
                >
                  {mg}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Family (e.g. curl, press, row)"
              value={newFamily}
              onChange={e => setNewFamily(e.target.value)}
              className="mw-input"
            />
            <div className="mw-rep-range-row">
              <input
                type="number"
                inputMode="numeric"
                placeholder="Min reps"
                value={newRepRange[0]}
                onChange={e => setNewRepRange([e.target.value, newRepRange[1]])}
                className="mw-input-small"
              />
              <span>–</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Max reps"
                value={newRepRange[1]}
                onChange={e => setNewRepRange([newRepRange[0], e.target.value])}
                className="mw-input-small"
              />
              <input
                type="number"
                inputMode="numeric"
                placeholder="Sets"
                value={newSets}
                onChange={e => setNewSets(e.target.value)}
                className="mw-input-small"
              />
            </div>
            <div className="mw-form-actions">
              <button className="mw-save-btn" onClick={handleAddExercise} disabled={!newName.trim() || newMuscleGroups.length === 0}>
                Save
              </button>
              <button className="mw-cancel-btn" onClick={() => setAddingExercise(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
