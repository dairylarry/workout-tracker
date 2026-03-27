import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCoreRoutines, getCoreRoutineCompletions } from '../lib/dynamodb'
import { computeRoutineStats, formatDuration } from '../lib/unfurl'
import '../styles/CoreSelect.css'

const COUNTDOWN_S = 10
const LS_KEY = 'core-selected-routine-id'

const CATEGORIES = ['mat', 'handstand', 'skill', 'equipment']
const DIFFICULTIES = [1, 3, 4, 5]

// NOTE: Renamed from CoreSelect → IntervalSelect. CSS classes remain "core-*".
export default function IntervalSelect() {
  const navigate = useNavigate()
  const [routines, setRoutines] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState(null)
  const [filterDiff, setFilterDiff] = useState(null)
  const [expandedNotes, setExpandedNotes] = useState({})
  const [expandedProg, setExpandedProg] = useState({})
  const [completionCounts, setCompletionCounts] = useState({})

  useEffect(() => {
    async function load() {
      const [items, completions] = await Promise.all([
        getCoreRoutines(),
        getCoreRoutineCompletions(),
      ])
      setRoutines(items)
      // Compute per-routine completion counts
      const counts = {}
      for (const c of completions) {
        counts[c.routineId] = (counts[c.routineId] || 0) + 1
      }
      setCompletionCounts(counts)
      setLoading(false)
    }
    load()
  }, [])

  function selectRoutine(id) {
    localStorage.setItem(LS_KEY, id)
    navigate('/interval')
  }

  const filtered = routines.filter(r => {
    if (filterCat && r.category !== filterCat) return false
    if (filterDiff && r.difficulty !== filterDiff) return false
    return true
  })

  if (loading) return null

  return (
    <div className="core-select">
      <h2 className="core-select-title">Select Workout</h2>

      {/* ── Filter bar ── */}
      <div className="core-select-filters">
        <div className="filter-group">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`filter-pill${filterCat === cat ? ' active' : ''}`}
              onClick={() => setFilterCat(filterCat === cat ? null : cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="filter-group">
          {DIFFICULTIES.map(d => (
            <button
              key={d}
              className={`filter-pill diff${filterDiff === d ? ' active' : ''}`}
              onClick={() => setFilterDiff(filterDiff === d ? null : d)}
            >
              {d}/5
            </button>
          ))}
        </div>
      </div>

      {/* ── Routine cards ── */}
      <div className="core-select-list">
        {filtered.map(routine => {
          const stats = computeRoutineStats(routine.routine)
          const duration = formatDuration(stats.totalSeconds + COUNTDOWN_S)
          const notesExpanded = expandedNotes[routine.id]
          const progExpanded = expandedProg[routine.id]
          const doneCount = completionCounts[routine.id] || 0

          return (
            <div key={routine.id} className="routine-card" onClick={() => selectRoutine(routine.id)}>
              {/* Header row */}
              <div className="routine-card-header">
                <span className="routine-card-name">{routine.name}</span>
                <span className="routine-card-badges">
                  <span className="badge badge-cat">{routine.category}</span>
                  <span className="badge badge-diff">{routine.difficulty}/5</span>
                </span>
              </div>

              {/* Meta row */}
              <p className="routine-card-meta">
                {routine.equipment} · {duration} · {stats.exerciseCount} exercises
                {doneCount > 0 && <span className="routine-card-done"> · done ×{doneCount}</span>}
              </p>

              {/* Notes */}
              {routine.notes && (
                <p
                  className={`routine-card-notes${notesExpanded ? ' expanded' : ''}`}
                  onClick={e => { e.stopPropagation(); setExpandedNotes(prev => ({ ...prev, [routine.id]: !prev[routine.id] })) }}
                >
                  {routine.notes}
                </p>
              )}

              {/* Exercise list — grouped by block */}
              <div className="routine-card-exercises">
                {routine.routine.map((block, bi) => (
                  <div key={bi} className="routine-block">
                    {block.label && block.numberOfTimes > 1 ? (
                      <p className="block-label">{block.label} ×{block.numberOfTimes}</p>
                    ) : block.label ? (
                      <p className="block-label">{block.label}</p>
                    ) : block.numberOfTimes > 1 ? (
                      <p className="block-label">×{block.numberOfTimes}</p>
                    ) : null}
                    {block.exercises.map((ex, ei) => (
                      <p key={ei} className="routine-exercise-row">
                        {ex.name} · {ex.workSeconds}s
                      </p>
                    ))}
                  </div>
                ))}
              </div>

              {/* Progressions */}
              {routine.progressions && routine.progressions.length > 0 && (
                <div
                  className="routine-card-prog"
                  onClick={e => { e.stopPropagation(); setExpandedProg(prev => ({ ...prev, [routine.id]: !prev[routine.id] })) }}
                >
                  <p className="prog-toggle">{progExpanded ? '▾' : '▸'} How to progress</p>
                  {progExpanded && (
                    <ul className="prog-list">
                      {routine.progressions.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <p className="core-select-empty">No routines match filters</p>
        )}
      </div>

      <button className="core-btn core-btn-back" onClick={() => navigate('/interval')}>
        ← Back
      </button>
    </div>
  )
}
