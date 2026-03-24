import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgram } from '../lib/ProgramContext'
import { putExercise, deleteExercise, getExerciseLibrary } from '../lib/dynamodb'
import '../styles/ManageWorkout.css'

const MUSCLE_GROUPS = ['quads', 'hamstrings', 'glutes', 'calves', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'core']

export default function ExerciseLibrary() {
  const navigate = useNavigate()
  const { exerciseLibrary, refreshExerciseLibrary } = useProgram()
  const [libraryFilter, setLibraryFilter] = useState('')
  const [familyFilter, setFamilyFilter] = useState('')
  const [addingExercise, setAddingExercise] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // exercise name pending confirmation

  // New exercise form state
  const [newName, setNewName] = useState('')
  const [newMuscleGroups, setNewMuscleGroups] = useState([])
  const [newFamily, setNewFamily] = useState('')
  const [newRepRange, setNewRepRange] = useState(['', ''])
  const [newSets, setNewSets] = useState('')

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

  async function handleConfirmDelete(name) {
    await deleteExercise(name)
    const lib = await getExerciseLibrary()
    refreshExerciseLibrary(lib)
    setConfirmDelete(null)
  }

  function toggleMuscleGroup(group) {
    setNewMuscleGroups(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    )
  }

  const muscleFiltered = exerciseLibrary
    .filter(ex => !libraryFilter || ex.muscleGroups?.some(mg => mg === libraryFilter))
  const availableFamilies = [...new Set(muscleFiltered.map(ex => ex.family).filter(Boolean))].sort()
  const filteredLibrary = muscleFiltered
    .filter(ex => !familyFilter || ex.family === familyFilter)
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="manage-workout">
      <button className="back" onClick={() => navigate('/manage')}>← Back to Manage Workout</button>
      <h2>Exercise Library</h2>
      <p className="mw-library-count">{exerciseLibrary.length} exercises</p>

      <div className="mw-filter-row">
        <select value={libraryFilter} onChange={e => { setLibraryFilter(e.target.value); setFamilyFilter('') }} className="mw-filter">
          <option value="">All muscle groups</option>
          {MUSCLE_GROUPS.map(mg => (
            <option key={mg} value={mg}>{mg}</option>
          ))}
        </select>
        <select value={familyFilter} onChange={e => setFamilyFilter(e.target.value)} className="mw-filter">
          <option value="">All families</option>
          {availableFamilies.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

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
            {deleteMode && (
              confirmDelete === ex.name ? (
                <div className="mw-confirm-delete">
                  <button className="mw-confirm-yes" onClick={() => handleConfirmDelete(ex.name)}>Delete</button>
                  <button className="mw-confirm-no" onClick={() => setConfirmDelete(null)}>Cancel</button>
                </div>
              ) : (
                <button className="mw-library-delete" onClick={() => setConfirmDelete(ex.name)}>✕</button>
              )
            )}
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

      <button
        className="delete-mode-btn"
        onClick={() => { setDeleteMode(!deleteMode); setConfirmDelete(null) }}
      >
        {deleteMode ? 'Done' : 'Delete Exercises'}
      </button>
    </div>
  )
}
