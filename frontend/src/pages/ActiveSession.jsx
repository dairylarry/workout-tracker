import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { PROGRAM } from '../lib/programConfig'
import { getSession, putSession, updateSessionExercises, updateSessionField, getLastSession } from '../lib/dynamodb'
import '../styles/ActiveSession.css'

function emptyExerciseData(config) {
  return config.exercises
    .filter(ex => ex.sets > 0)
    .map(ex => ({
      name: ex.name,
      sets: Array.from({ length: ex.sets }, (_, i) => ({
        setNumber: i + 1,
        weight: '',
        weightUnit: 'lbs',
        reps: '',
        rir: '',
      })),
    }))
}

function checkProgression(exercise, config) {
  const exConfig = config.exercises.find(e => e.name === exercise.name)
  if (!exConfig || !exConfig.repRange) return false
  const topReps = exConfig.repRange[1]
  const targetRir = exConfig.rir
  return exercise.sets.every(
    s => s.reps !== '' && Number(s.reps) >= topReps && s.rir !== '' && Number(s.rir) <= targetRir
  )
}

export default function ActiveSession() {
  const { sessionType, date } = useParams()
  const navigate = useNavigate()
  const config = PROGRAM.sessionTypes[sessionType]
  const [exercises, setExercises] = useState(null)
  const [deload, setDeload] = useState(false)
  const [lastSession, setLastSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const saveTimeout = useRef(null)

  useEffect(() => {
    async function load() {
      try {
        const [existing, last] = await Promise.all([
          getSession(sessionType, date),
          getLastSession(sessionType),
        ])
        if (existing) {
          setExercises(existing.exercises)
          setDeload(existing.deload || false)
        } else {
          const initial = emptyExerciseData(config)
          setExercises(initial)
          await putSession({
            PK: `SESSION#${sessionType}`,
            SK: `DATE#${date}`,
            type: 'SESSION',
            sessionType,
            date,
            startedAt: new Date().toISOString(),
            deload: false,
            exercises: initial,
          })
        }
        if (last && last.SK !== `DATE#${date}`) {
          setLastSession(last)
        }
      } catch (e) {
        console.error('Failed to load session:', e)
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionType, date, config])

  function handleSetChange(exIndex, setIndex, field, value) {
    setExercises(prev => {
      const updated = prev.map((ex, ei) => {
        if (ei !== exIndex) return ex
        return {
          ...ex,
          sets: ex.sets.map((s, si) => {
            if (si !== setIndex) return s
            return { ...s, [field]: value }
          }),
        }
      })

      if (saveTimeout.current) clearTimeout(saveTimeout.current)
      saveTimeout.current = setTimeout(() => {
        updateSessionExercises(sessionType, date, updated).catch(e =>
          console.error('Failed to save:', e)
        )
      }, 500)

      return updated
    })
  }

  function getLastExercise(name) {
    if (!lastSession) return null
    return lastSession.exercises?.find(e => e.name === name)
  }

  if (!config) return <div className="active-session"><p>Unknown session type.</p></div>
  if (loading) return <div className="active-session"><p>Loading...</p></div>
  if (error) return <div className="active-session"><p>Error: {error}</p></div>

  return (
    <div className="active-session">
      <button className="back" onClick={() => navigate('/')}>← Back</button>
      <h2>{config.name}</h2>
      <p className="session-date">{date}</p>

      <label className="deload-toggle">
        <input
          type="checkbox"
          checked={deload}
          onChange={e => {
            setDeload(e.target.checked)
            updateSessionField(sessionType, date, 'deload', e.target.checked)
          }}
        />
        Deload week
      </label>

      {config.exercises.map((exConfig, idx) => {
        if (exConfig.is531) {
          return (
            <div key={exConfig.name} className="exercise-block exercise-531">
              <div className="exercise-header">
                <h3>{exConfig.name}</h3>
                <span className="exercise-target">{exConfig.note} · Rest {exConfig.rest}</span>
                <span className="badge-531">5/3/1</span>
              </div>
            </div>
          )
        }

        const exercise = exercises.find(e => e.name === exConfig.name)
        if (!exercise) return null
        const exIndex = exercises.indexOf(exercise)
        const lastEx = getLastExercise(exercise.name)
        const progReady = checkProgression(exercise, config)

        return (
          <div key={exercise.name} className="exercise-block">
            <div className="exercise-header">
              <h3>{exercise.name}</h3>
              <span className="exercise-target">
                {exConfig.sets} × {exConfig.repRange[0]}–{exConfig.repRange[1]}
                {exConfig.perSide ? '/side' : ''} · RIR {exConfig.rir} · {exConfig.rest}
              </span>
              {exConfig.superset && (
                <span className="superset-badge">Superset {exConfig.superset}</span>
              )}
              {exConfig.optional && (
                <span className="optional-badge">Optional</span>
              )}
              {progReady && (
                <span className="progression-badge">↑ Add weight next session</span>
              )}
            </div>

            {lastEx && (
              <div className="last-session">
                Last: {lastEx.sets.map(s => `${s.weight}${s.weightUnit === 'kg' ? 'kg' : ''}×${s.reps}`).join(', ')}
              </div>
            )}

            <div className="sets-grid">
              <div className="set-row set-header">
                <span>Set</span>
                <span>Weight</span>
                <span>Unit</span>
                <span>Reps</span>
                <span>RIR</span>
              </div>
              {exercise.sets.map((set, setIndex) => (
                <div key={set.setNumber} className="set-row">
                  <span className="set-number">{set.setNumber}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={set.weight}
                    placeholder="—"
                    onChange={e => handleSetChange(exIndex, setIndex, 'weight', e.target.value)}
                  />
                  <select
                    value={set.weightUnit}
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
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
