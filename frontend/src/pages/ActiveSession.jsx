import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { PROGRAM } from '../lib/programConfig'
import { getSession, putSession, updateSessionExercises, updateSessionField, getRecentSessions, get531Config } from '../lib/dynamodb'
import { getSetsForWeek, WEEK_LABELS } from '../lib/fiveThreeOne'
import '../styles/ActiveSession.css'

const EXERCISE_TO_531_KEY = {
  'Barbell Back Squat': 'squat',
  'Flat Barbell Bench Press': 'bench',
}

function emptyExerciseData(config, ftoConfigs) {
  return config.exercises
    .filter(ex => ex.sets > 0 || ex.is531)
    .map(ex => {
      if (ex.is531) {
        const key = EXERCISE_TO_531_KEY[ex.name]
        const tm = ftoConfigs[key]?.trainingMax
        return {
          name: ex.name,
          is531: true,
          week: 1,
          trainingMax: tm || null,
          weightUnit: 'lbs',
          sets: tm ? getSetsForWeek(1, tm).map((s, i) => ({
            setNumber: i + 1,
            target: s.target,
            label: s.label,
            isWarmup: s.isWarmup,

            weight: '',
            reps: '',
            rir: '',
          })) : [],
        }
      }
      return {
        name: ex.name,
        weightUnit: 'lbs',
        sets: Array.from({ length: ex.sets }, (_, i) => ({
          setNumber: i + 1,
          weight: '',
          reps: '',
          rir: '',
        })),
      }
    })
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
  const [recentSessions, setRecentSessions] = useState([])
  const [expandedHistory, setExpandedHistory] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [swapOpen, setSwapOpen] = useState(null) // index of exercise with swap open
  const [customSwap, setCustomSwap] = useState('')
  const [ftoConfigs, setFtoConfigs] = useState({})
  const saveTimeout = useRef(null)

  useEffect(() => {
    async function load() {
      try {
        // Load 5/3/1 configs if this session has 5/3/1 exercises
        const ftoResults = {}
        for (const ex of config.exercises) {
          if (ex.is531) {
            const key = EXERCISE_TO_531_KEY[ex.name]
            if (key) {
              const cfg = await get531Config(key)
              if (cfg) ftoResults[key] = cfg
            }
          }
        }
        setFtoConfigs(ftoResults)

        const [existing, recent] = await Promise.all([
          getSession(sessionType, date),
          getRecentSessions(sessionType, 4),
        ])

        const pastSessions = recent.filter(s => s.SK !== `DATE#${date}`)
        setRecentSessions(pastSessions.slice(0, 3))

        if (existing) {
          setExercises(existing.exercises)
          setDeload(existing.deload || false)
        } else {
          // Infer week from last session's 5/3/1 exercises
          let inferredWeek = 1
          if (pastSessions.length > 0) {
            const last531 = pastSessions[0].exercises?.find(e => e.is531)
            if (last531?.week) {
              inferredWeek = (last531.week % 3) + 1
            }
          }

          const initial = emptyExerciseData(config, ftoResults)
          // Apply inferred week to 5/3/1 exercises
          initial.forEach(ex => {
            if (ex.is531 && ex.trainingMax) {
              ex.week = inferredWeek
              ex.sets = getSetsForWeek(inferredWeek, ex.trainingMax).map((s, i) => ({
                setNumber: i + 1,
                target: s.target,
                label: s.label,
                isWarmup: s.isWarmup,
    
                weight: '',
                reps: '',
                rir: '',
              }))
            }
          })

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

  function handleUnitChange(exIndex, unit) {
    setExercises(prev => {
      const updated = prev.map((ex, ei) => {
        if (ei !== exIndex) return ex
        return { ...ex, weightUnit: unit }
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

  function handle531WeekChange(exIndex, newWeek) {
    setExercises(prev => {
      const updated = prev.map((ex, ei) => {
        if (ei !== exIndex || !ex.is531 || !ex.trainingMax) return ex
        const newSets = getSetsForWeek(newWeek, ex.trainingMax).map((s, i) => ({
          setNumber: i + 1,
          target: s.target,
          label: s.label,
          isWarmup: s.isWarmup,
          isAmrap: s.isAmrap || false,
          weight: '',
          reps: '',
          rir: '',
        }))
        return { ...ex, week: newWeek, sets: newSets }
      })
      updateSessionExercises(sessionType, date, updated).catch(e =>
        console.error('Failed to save week change:', e)
      )
      return updated
    })
  }

  function handleSwap(exIndex, newName) {
    setExercises(prev => {
      const updated = prev.map((ex, ei) => {
        if (ei !== exIndex) return ex
        return {
          ...ex,
          swappedName: newName,
        }
      })
      updateSessionExercises(sessionType, date, updated).catch(e =>
        console.error('Failed to save swap:', e)
      )
      return updated
    })
    setSwapOpen(null)
    setCustomSwap('')
  }

  function handleResetSwap(exIndex) {
    setExercises(prev => {
      const updated = prev.map((ex, ei) => {
        if (ei !== exIndex) return ex
        const { swappedName, ...rest } = ex
        return rest
      })
      updateSessionExercises(sessionType, date, updated).catch(e =>
        console.error('Failed to save swap reset:', e)
      )
      return updated
    })
    setSwapOpen(null)
  }

  const [saveStatus, setSaveStatus] = useState(null)

  async function handleManualSave() {
    setSaveStatus('saving')
    try {
      // Re-fetch 5/3/1 TMs and update exercises if changed
      let updated = exercises
      const has531 = config.exercises.some(e => e.is531)
      if (has531) {
        const newFtoConfigs = {}
        for (const ex of config.exercises) {
          if (ex.is531) {
            const key = EXERCISE_TO_531_KEY[ex.name]
            if (key) {
              const cfg = await get531Config(key)
              if (cfg) newFtoConfigs[key] = cfg
            }
          }
        }
        setFtoConfigs(newFtoConfigs)
        updated = exercises.map(ex => {
          if (!ex.is531) return ex
          const key = EXERCISE_TO_531_KEY[ex.name]
          const newTm = newFtoConfigs[key]?.trainingMax
          if (newTm && newTm !== ex.trainingMax) {
            const week = ex.week || 1
            return {
              ...ex,
              trainingMax: newTm,
              sets: getSetsForWeek(week, newTm).map((s, i) => ({
                setNumber: i + 1,
                target: s.target,
                label: s.label,
                isWarmup: s.isWarmup,
                weight: ex.sets[i]?.weight || '',
                reps: ex.sets[i]?.reps || '',
                rir: ex.sets[i]?.rir || '',
              })),
            }
          }
          return ex
        })
        setExercises(updated)
      }

      await updateSessionExercises(sessionType, date, updated)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 2000)
    } catch (e) {
      console.error('Manual save failed:', e)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  function getExerciseHistory(name, swappedName) {
    return recentSessions
      .map(s => {
        const ex = s.exercises?.find(e => {
          const pastDisplay = e.swappedName || e.name
          const currentDisplay = swappedName || name
          return e.name === name || pastDisplay === currentDisplay
        })
        if (!ex) return null
        return {
          date: s.date,
          sets: ex.sets,
          weightUnit: ex.weightUnit || 'lbs',
          displayName: ex.swappedName || ex.name,
        }
      })
      .filter(Boolean)
  }

  function toggleHistory(exName) {
    setExpandedHistory(prev => ({ ...prev, [exName]: !prev[exName] }))
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
          const exercise = exercises.find(e => e.name === exConfig.name)
          if (!exercise) {
            return (
              <div key={exConfig.name} className="exercise-block exercise-531">
                <div className="exercise-header">
                  <h3>{exConfig.name}</h3>
                  <span className="exercise-target">Set up Training Max in 5/3/1 Config first</span>
                  <span className="badge-531">5/3/1</span>
                </div>
              </div>
            )
          }
          const exIndex = exercises.indexOf(exercise)
          return (
            <div key={exConfig.name} className="exercise-block exercise-531">
              <div className="exercise-header">
                <div className="exercise-top-row">
                  <h3>{exConfig.name}</h3>
                  <span className="badge-531">5/3/1</span>
                </div>
                <div className="fto-week-row">
                  <select
                    value={exercise.week || 1}
                    onChange={e => handle531WeekChange(exIndex, Number(e.target.value))}
                    className="week-select"
                  >
                    <option value={1}>{WEEK_LABELS[1]}</option>
                    <option value={2}>{WEEK_LABELS[2]}</option>
                    <option value={3}>{WEEK_LABELS[3]}</option>
                  </select>
                  <span className="exercise-target">TM: {exercise.trainingMax} lbs · Rest {exConfig.rest}</span>
                </div>
              </div>

              <div className="sets-grid">
                <div className="set-row set-header">
                  <span>Set</span>
                  <span>Target</span>
                  <span>Weight</span>
                  <span>Reps</span>
                  <span>RIR</span>
                </div>
                {exercise.sets.map((set, setIndex) => (
                  <div key={set.setNumber} className={`set-row ${set.isWarmup ? 'warmup-set' : ''}`}>
                    <span className="set-number">{set.label}</span>
                    <span className="set-target">{set.target}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={set.weight}
                      placeholder="—"
                      onChange={e => handleSetChange(exIndex, setIndex, 'weight', e.target.value)}
                    />
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
        }

        const exercise = exercises.find(e => e.name === exConfig.name)
        if (!exercise) return null
        const exIndex = exercises.indexOf(exercise)
        const history = getExerciseHistory(exercise.name, exercise.swappedName)
        const isExpanded = expandedHistory[exercise.name]
        const progReady = checkProgression(exercise, config)
        const displayName = exercise.swappedName || exercise.name
        const isSwapped = !!exercise.swappedName
        const isSwapOpen = swapOpen === exIndex

        return (
          <div key={exercise.name} className="exercise-block">
            <div className="exercise-header">
              <div className="exercise-top-row">
                <div className="exercise-name-row">
                  <h3>{displayName}</h3>
                  <button
                    className="swap-btn"
                    onClick={() => setSwapOpen(isSwapOpen ? null : exIndex)}
                  >
                    Swap
                  </button>
                </div>
                <select
                  className="unit-toggle"
                  value={exercise.weightUnit || 'lbs'}
                  onChange={e => handleUnitChange(exIndex, e.target.value)}
                >
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                </select>
              </div>
              {isSwapped && (
                <span className="swapped-from">Originally: {exercise.name}</span>
              )}
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

            {isSwapOpen && (
              <div className="swap-panel">
                {exConfig.subs?.map(sub => (
                  <button key={sub} className="swap-option" onClick={() => handleSwap(exIndex, sub)}>
                    {sub}
                  </button>
                ))}
                <div className="swap-custom">
                  <input
                    type="text"
                    placeholder="Custom exercise..."
                    value={customSwap}
                    onChange={e => setCustomSwap(e.target.value)}
                  />
                  <button
                    disabled={!customSwap.trim()}
                    onClick={() => handleSwap(exIndex, customSwap.trim())}
                  >
                    Use
                  </button>
                </div>
                {isSwapped && (
                  <button className="swap-reset" onClick={() => handleResetSwap(exIndex)}>
                    Reset to {exercise.name}
                  </button>
                )}
              </div>
            )}

            {history.length > 0 && (
              <div className="history-section">
                <div className="last-session">
                  <span className="history-date">{history[0].date}:</span>{' '}
                  <span className="history-variant">{history[0].displayName}</span>{' '}
                  {history[0].sets.map(s => `${s.weight}${history[0].weightUnit === 'kg' ? 'kg' : ''}×${s.reps}`).join(', ')}
                </div>
                {history.length > 1 && (
                  <>
                    <button className="show-more" onClick={() => toggleHistory(exercise.name)}>
                      {isExpanded ? 'Hide' : `Show ${history.length - 1} more`}
                    </button>
                    {isExpanded && history.slice(1).map(h => (
                      <div key={h.date} className="last-session">
                        <span className="history-date">{h.date}:</span>{' '}
                        <span className="history-variant">{h.displayName}</span>{' '}
                        {h.sets.map(s => `${s.weight}${h.weightUnit === 'kg' ? 'kg' : ''}×${s.reps}`).join(', ')}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            <div className="sets-grid">
              <div className="set-row set-header">
                <span>Set</span>
                <span>Weight</span>
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

      <button className="save-btn" onClick={handleManualSave} disabled={saveStatus === 'saving'}>
        {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Save failed — retry' : 'Save'}
      </button>
    </div>
  )
}
