import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgram } from '../context/ProgramContext'
import { putExercise, deleteExercise, getExerciseLibrary, updateExerciseMeta, getTags, putTags } from '../lib/dynamodb'
import { MUSCLE_GROUPS, EXERCISE_FAMILIES } from '../constants/exerciseEnums'
import { resolveHistoryTags, DEFAULT_TAGS } from '../constants/tags'
import TagChip from '../components/TagChip'
import '../styles/ManageWorkout.css'

const EXERCISES_531 = ['Barbell Back Squat', 'Flat Barbell Bench Press']

export default function ExerciseLibrary() {
  const navigate = useNavigate()
  const { exerciseLibrary, refreshExerciseLibrary } = useProgram()
  const [libraryFilter, setLibraryFilter] = useState('')
  const [familyFilter, setFamilyFilter] = useState('')
  const [addingExercise, setAddingExercise] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [allTags, setAllTags] = useState([])

  // Add exercise form state
  const [newName, setNewName] = useState('')
  const [newMuscleGroups, setNewMuscleGroups] = useState([])
  const [newFamily, setNewFamily] = useState('')
  const [newRepRange, setNewRepRange] = useState(['', ''])
  const [newSets, setNewSets] = useState('')

  // Inline edit state
  const [editingExercise, setEditingExercise] = useState(null) // stable name ID
  const [editExName, setEditExName] = useState('')
  const [editExMuscleGroups, setEditExMuscleGroups] = useState([])
  const [editExFamily, setEditExFamily] = useState('')
  const [editExRepRange, setEditExRepRange] = useState(['', ''])
  const [editExSets, setEditExSets] = useState('')

  const [expandedHistory, setExpandedHistory] = useState({})

  useEffect(() => {
    async function load() {
      let loaded = await getTags()
      if (loaded === null) {
        loaded = DEFAULT_TAGS
        putTags(loaded)
      }
      setAllTags(loaded)
    }
    load()
  }, [])

  async function handleAddExercise() {
    if (!newName.trim() || newMuscleGroups.length === 0) return
    const displayName = newName.trim()
    const slug = displayName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const name = `${slug}-${Date.now()}`
    const exercise = {
      name,
      displayName,
      muscleGroups: newMuscleGroups,
      family: newFamily || null,
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

  function startEditExercise(ex) {
    setEditingExercise(ex.name)
    setEditExName(ex.displayName || ex.name)
    setEditExMuscleGroups(ex.muscleGroups || [])
    setEditExFamily(ex.family || '')
    setEditExRepRange(ex.defaultRepRange ? [String(ex.defaultRepRange[0]), String(ex.defaultRepRange[1])] : ['', ''])
    setEditExSets(ex.defaultSets ? String(ex.defaultSets) : '')
  }

  function cancelEditExercise() {
    setEditingExercise(null)
  }

  async function handleSaveEditExercise() {
    const displayName = editExName.trim()
    if (!displayName || editExMuscleGroups.length === 0) return
    await updateExerciseMeta({
      name: editingExercise,
      displayName,
      muscleGroups: editExMuscleGroups,
      family: editExFamily || null,
      defaultRepRange: editExRepRange[0] && editExRepRange[1]
        ? [Number(editExRepRange[0]), Number(editExRepRange[1])]
        : null,
      defaultSets: editExSets ? Number(editExSets) : null,
    })
    const lib = await getExerciseLibrary()
    refreshExerciseLibrary(lib)
    setEditingExercise(null)
  }

  const exercisesWithHistory = useMemo(() => {
    return new Set(exerciseLibrary.filter(ex => ex.history?.length > 0).map(ex => ex.name))
  }, [exerciseLibrary])

  function toggleExerciseHistory(name) {
    setExpandedHistory(prev => {
      const current = prev[name] || 0
      return { ...prev, [name]: current === 0 ? 10 : 0 }
    })
  }

  function showMoreHistory(name) {
    setExpandedHistory(prev => ({ ...prev, [name]: (prev[name] || 10) + 10 }))
  }

  const muscleFiltered = exerciseLibrary
    .filter(ex => !libraryFilter || ex.muscleGroups?.some(mg => mg === libraryFilter))
  const availableFamilies = [...new Set(muscleFiltered.map(ex => ex.family).filter(Boolean))].sort()
  const filteredLibrary = muscleFiltered
    .filter(ex => !familyFilter || ex.family === familyFilter)
    .sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name))

  return (
    <div className="manage-workout">
      <button className="back" onClick={() => navigate('/manage')}>← Back to Manage Workout</button>
      <h2>Exercise Library</h2>
      <p className="mw-library-count">{exerciseLibrary.length} exercises</p>

      <div className="mw-filter-row">
        <select value={libraryFilter} onChange={e => { setLibraryFilter(e.target.value); setFamilyFilter('') }} className="mw-filter">
          <option value="">All muscle groups</option>
          {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
        </select>
        <select value={familyFilter} onChange={e => setFamilyFilter(e.target.value)} className="mw-filter">
          <option value="">All families</option>
          {availableFamilies.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        {(libraryFilter || familyFilter) && (
          <button className="mw-reset-filters" onClick={() => { setLibraryFilter(''); setFamilyFilter('') }}>Reset</button>
        )}
      </div>

      <div className="mw-library-list">
        {filteredLibrary.map(ex => {
          const historyCount = expandedHistory[ex.name] || 0
          const hasHistory = exercisesWithHistory.has(ex.name)
          const history = ex.history || []
          const isEditing = editingExercise === ex.name

          return (
            <div key={ex.name} className="mw-library-item-wrap">
              <div className="mw-library-item">
                <div className="mw-library-item-info">
                  <div>
                    <span className="mw-library-name">{ex.displayName || ex.name}</span>
                    <span className="mw-library-meta">
                      {ex.muscleGroups?.join(', ')}
                      {ex.family ? ` · ${ex.family}` : ''}
                      {ex.defaultRepRange ? ` · ${ex.defaultRepRange[0]}–${ex.defaultRepRange[1]}` : ''}
                      {ex.defaultSets ? ` · ${ex.defaultSets} sets` : ''}
                    </span>
                  </div>
                </div>
                <div className="mw-item-right">
                  {editMode && !isEditing && (
                    <button className="mw-edit-icon-btn" onClick={() => startEditExercise(ex)}>✎</button>
                  )}
                  {editMode && isEditing && (
                    <>
                      <button
                        className="mw-edit-icon-btn mw-edit-icon-btn--save"
                        onClick={handleSaveEditExercise}
                        disabled={!editExName.trim() || editExMuscleGroups.length === 0}
                      >✓</button>
                      <button className="mw-edit-icon-btn" onClick={cancelEditExercise}>×</button>
                    </>
                  )}
                  {!editMode && hasHistory && !EXERCISES_531.includes(ex.name) && (
                    <button className="mw-history-toggle" onClick={() => toggleExerciseHistory(ex.name)}>
                      {historyCount > 0 ? '−' : '+'}
                    </button>
                  )}
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
              </div>

              {isEditing && (
                <div className="mw-edit-exercise-form">
                  <input
                    type="text"
                    placeholder="Exercise name"
                    value={editExName}
                    onChange={e => setEditExName(e.target.value)}
                    className="mw-input"
                    autoFocus
                  />
                  <div className="mw-muscle-groups">
                    {MUSCLE_GROUPS.map(mg => (
                      <button
                        key={mg}
                        className={`mw-mg-btn${editExMuscleGroups.includes(mg) ? ' active' : ''}`}
                        onClick={() => setEditExMuscleGroups(prev =>
                          prev.includes(mg) ? prev.filter(g => g !== mg) : [...prev, mg]
                        )}
                      >{mg}</button>
                    ))}
                  </div>
                  <select value={editExFamily} onChange={e => setEditExFamily(e.target.value)} className="mw-input">
                    <option value="">Family (optional)</option>
                    {EXERCISE_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <div className="mw-rep-range-row">
                    <input type="number" inputMode="numeric" placeholder="Min reps"
                      value={editExRepRange[0]} onChange={e => setEditExRepRange([e.target.value, editExRepRange[1]])}
                      className="mw-input-small" />
                    <span>–</span>
                    <input type="number" inputMode="numeric" placeholder="Max reps"
                      value={editExRepRange[1]} onChange={e => setEditExRepRange([editExRepRange[0], e.target.value])}
                      className="mw-input-small" />
                    <input type="number" inputMode="numeric" placeholder="Sets"
                      value={editExSets} onChange={e => setEditExSets(e.target.value)}
                      className="mw-input-small" />
                  </div>
                </div>
              )}

              {historyCount > 0 && history.length > 0 && (
                <div className="mw-exercise-history">
                  {history.slice(0, historyCount).map((h, i) => {
                    const tagObjs = resolveHistoryTags(h).map(id => allTags.find(t => t.id === id)).filter(Boolean)
                    return (
                      <div key={`${h.date}-${h.sessionType}-${h.slotIndex}-${i}`} className="mw-history-entry">
                        <span className="mw-history-date">{h.date}</span>
                        <span className="mw-history-session">{h.sessionType}</span>
                        {tagObjs.map(tag => <TagChip key={tag.id} tag={tag} />)}
                        <span className="mw-history-sets">
                          {h.sets?.filter(s => s.weight || s.reps).map(s =>
                            `${s.weight}${h.weightUnit === 'kg' ? 'kg' : ''}×${s.reps}`
                          ).join(', ')}
                        </span>
                      </div>
                    )
                  })}
                  {history.length > historyCount && (
                    <button className="mw-history-more" onClick={() => showMoreHistory(ex.name)}>
                      Show more ({history.length - historyCount} remaining)
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!addingExercise ? (
        <button className="mw-add-exercise-btn" onClick={() => {
          setAddingExercise(true)
          setEditMode(false)
          setEditingExercise(null)
          setDeleteMode(false)
        }}>+ Add Exercise</button>
      ) : (
        <div className="mw-add-form">
          <input type="text" placeholder="Exercise name" value={newName}
            onChange={e => setNewName(e.target.value)} className="mw-input" />
          <div className="mw-muscle-groups">
            {MUSCLE_GROUPS.map(mg => (
              <button key={mg}
                className={`mw-mg-btn${newMuscleGroups.includes(mg) ? ' active' : ''}`}
                onClick={() => setNewMuscleGroups(prev =>
                  prev.includes(mg) ? prev.filter(g => g !== mg) : [...prev, mg]
                )}
              >{mg}</button>
            ))}
          </div>
          <select value={newFamily} onChange={e => setNewFamily(e.target.value)} className="mw-input">
            <option value="">Family (optional)</option>
            {EXERCISE_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <div className="mw-rep-range-row">
            <input type="number" inputMode="numeric" placeholder="Min reps"
              value={newRepRange[0]} onChange={e => setNewRepRange([e.target.value, newRepRange[1]])}
              className="mw-input-small" />
            <span>–</span>
            <input type="number" inputMode="numeric" placeholder="Max reps"
              value={newRepRange[1]} onChange={e => setNewRepRange([newRepRange[0], e.target.value])}
              className="mw-input-small" />
            <input type="number" inputMode="numeric" placeholder="Sets"
              value={newSets} onChange={e => setNewSets(e.target.value)}
              className="mw-input-small" />
          </div>
          <div className="mw-form-actions">
            <button className="mw-save-btn" onClick={handleAddExercise}
              disabled={!newName.trim() || newMuscleGroups.length === 0}>Save</button>
            <button className="mw-cancel-btn" onClick={() => setAddingExercise(false)}>Cancel</button>
          </div>
        </div>
      )}

      <button
        className="edit-mode-btn"
        onClick={() => {
          const next = !editMode
          setEditMode(next)
          setEditingExercise(null)
          if (next) { setAddingExercise(false); setDeleteMode(false) }
        }}
      >
        {editMode ? 'Done' : 'Edit Exercises'}
      </button>

      <button
        className="delete-mode-btn"
        onClick={() => {
          setDeleteMode(!deleteMode)
          setConfirmDelete(null)
          setEditMode(false)
          setEditingExercise(null)
        }}
      >
        {deleteMode ? 'Done' : 'Delete Exercises'}
      </button>
    </div>
  )
}
