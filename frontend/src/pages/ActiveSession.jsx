import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useProgram } from '../context/ProgramContext'
import NoteRenderer from '../components/NoteRenderer'
import { getSession, putSession, updateSessionExercises, updateSessionField, getRecentSessions, get531Config, updateExerciseHistory, removeExerciseHistoryEntry, getTags, putTags } from '../lib/dynamodb'
import { getSetsForWeek, getDeloadSets, WEEK_LABELS } from '../lib/fiveThreeOne'
import { EXERCISE_FAMILIES } from '../constants/exerciseEnums'
import { DEFAULT_TAGS, resolveSessionTags, resolveHistoryTags } from '../constants/tags'
import TagChip from '../components/TagChip'
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
          slotId: ex.slotId,
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
        slotId: ex.slotId,
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

// Derive { slotId: [sessionTypeId, ...] } from the full program.
// Used to find all session types that share a slot (e.g. 'ua-bench' → ['upper-a', 'upper-a-5']).
function buildSlotIdIndex(program) {
  const index = {}
  if (!program?.sessionTypes) return index
  for (const [stId, st] of Object.entries(program.sessionTypes)) {
    for (const ex of st.exercises || []) {
      if (!ex.slotId) continue
      if (!index[ex.slotId]) index[ex.slotId] = []
      if (!index[ex.slotId].includes(stId)) index[ex.slotId].push(stId)
    }
  }
  return index
}

// Progression criteria (for bump tag):
// (1) all sets reach top of rep range
// (2) all sets have RIR >= target (you have more in the tank than required)
// (3) all sets use the same weight
// Skips 5/3/1 exercises (handled separately by 5/3/1 waves).
function checkProgression(sets, repRange, targetRir) {
  if (!sets || sets.length === 0) return false
  if (!repRange || targetRir == null || targetRir === undefined) return false
  const topReps = repRange[1]
  const firstWeight = sets[0].weight
  if (firstWeight === '' || firstWeight == null) return false
  return sets.every(
    s => s.reps !== '' && s.reps != null && Number(s.reps) >= topReps &&
         s.rir !== '' && s.rir != null && Number(s.rir) >= targetRir &&
         String(s.weight) === String(firstWeight)
  )
}

// Look up {repRange, rir} for an exercise name within a program slot context.
// Priority:
//   1. Base exercise matches program slot → program config
//   2. Object sub with embedded range → sub's own range/rir
//   3. Plain string sub → library defaultRepRange, rir inherited from parent slot
//   4. Fallback → null (skip bump tag)
function getRangeRir(name, exConfig, library) {
  if (!name) return { repRange: null, rir: null }
  if (exConfig && name === exConfig.name) {
    return { repRange: exConfig.repRange, rir: exConfig.rir }
  }
  const objSub = exConfig?.subs?.find(s => typeof s === 'object' && s.name === name)
  if (objSub) {
    return { repRange: objSub.repRange, rir: objSub.rir }
  }
  const libEntry = library?.find(e => e.name === name)
  if (libEntry?.defaultRepRange) {
    return { repRange: libEntry.defaultRepRange, rir: exConfig?.rir ?? null }
  }
  return { repRange: null, rir: null }
}

export default function ActiveSession() {
  const { sessionType, date } = useParams()
  const navigate = useNavigate()
  const { program, exerciseLibrary } = useProgram()
  const config = program?.sessionTypes[sessionType]
  // Exercises reduced on 5-day weeks (Upper A and Upper B only).
  // Keyed by session type; values are { exerciseName: setsToRemove }.
  const FIVE_DAY_REDUCTIONS = {
    'upper-a': { 'Tricep Bar Pushdown': 1, 'EZ Bar Curl': 1 },
    'upper-b': { 'Cable Lateral Raise': 1, 'Hammer Curl': 1 },
  }
  const fiveDayReductions = FIVE_DAY_REDUCTIONS[sessionType] || null

  const [exercises, setExercises] = useState(null)
  const [startedAt, setStartedAt] = useState(null)
  const [sessionTags, setSessionTags] = useState([])
  const [allTags, setAllTags] = useState([])
  const [fiveDay, setFiveDay] = useState(false)
  const [recentSessions, setRecentSessions] = useState([])
  const [historyLevel, setHistoryLevel] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [swapOpen, setSwapOpen] = useState(null) // exIndex with swap picker open
  const [kebabOpen, setKebabOpen] = useState(null) // exIndex with kebab panel open
  const [noteOpen, setNoteOpen] = useState(new Set()) // set of exIndices with note UI visible
  const [notes, setNotes] = useState('')
  const [addonFilter, setAddonFilter] = useState('')
  const [addonFamilyFilter, setAddonFamilyFilter] = useState('')
  const [confirmRemoveAddon, setConfirmRemoveAddon] = useState(null) // exIndex pending confirm

  const [ftoConfigs, setFtoConfigs] = useState({})
  const saveTimeout = useRef(null)
  const notesTimeout = useRef(null)
  const exercisesRef = useRef(exercises)
  // Tracks the exercise name last written to history per slot, to detect swaps/resets
  const lastHistoryNameRef = useRef({})
  exercisesRef.current = exercises
  const notesRef = useRef(notes)
  notesRef.current = notes

  // Shared function to write exercise history to DynamoDB
  function writeExerciseHistory(currentExercises) {
    if (!currentExercises) return Promise.resolve()
    const promises = currentExercises.flatMap((ex, slotIndex) => {
      const currentName = ex.swappedName || ex.name
      const originalName = ex.name
      const isSupplemental = !!ex.supplemental
      const hasSets = ex.sets?.some(s => s.weight || s.reps)
      if (!hasSets) return []

      const ops = []
      const dedupeKey = isSupplemental ? { supplemental: true } : { slotIndex }

      if (!isSupplemental) {
        // If swapped: always clean up the original exercise's entry for this slot/date
        if (currentName !== originalName) {
          ops.push(removeExerciseHistoryEntry(originalName, { date, sessionType, slotIndex }))
        }
        // If reset (or re-swapped): clean up whatever was last written if it differs
        const prevName = lastHistoryNameRef.current[slotIndex]
        if (prevName && prevName !== currentName && prevName !== originalName) {
          ops.push(removeExerciseHistoryEntry(prevName, { date, sessionType, slotIndex }))
        }
      } else {
        // Supplemental: clean up original name if swapped
        if (currentName !== originalName) {
          ops.push(removeExerciseHistoryEntry(originalName, { date, sessionType, supplemental: true }))
        }
        const prevName = lastHistoryNameRef.current[slotIndex]
        if (prevName && prevName !== currentName && prevName !== originalName) {
          ops.push(removeExerciseHistoryEntry(prevName, { date, sessionType, supplemental: true }))
        }
      }

      // Update ref to track what we're about to write
      lastHistoryNameRef.current[slotIndex] = currentName

      ops.push(updateExerciseHistory(currentName, {
        date,
        sessionType,
        ...dedupeKey,
        sets: ex.sets.filter(s => s.weight || s.reps).map(s => ({ weight: s.weight, reps: s.reps, rir: s.rir })),
        weightUnit: ex.weightUnit || 'lbs',
        // Legacy: keep writing deload field so pre-tag clients can still read history
        ...(sessionTags.includes('deload') && { deload: true }),
        ...(sessionTags.length && { tags: sessionTags }),
        ...(ex.note && { note: ex.note }),
      }))

      return ops
    })
    return Promise.all(promises)
  }

  function saveNotes(currentNotes) {
    return updateSessionField(sessionType, date, 'notes', currentNotes)
  }

  // Write exercise history + notes on unmount, visibilitychange, and beforeunload
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        writeExerciseHistory(exercisesRef.current).catch(e =>
          console.error('Failed to save exercise history on visibility change:', e)
        )
        saveNotes(notesRef.current).catch(e =>
          console.error('Failed to save notes on visibility change:', e)
        )
      }
    }

    function handleBeforeUnload() {
      writeExerciseHistory(exercisesRef.current).catch(e =>
        console.error('Failed to save exercise history on unload:', e)
      )
      saveNotes(notesRef.current).catch(e =>
        console.error('Failed to save notes on unload:', e)
      )
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Write history + notes on unmount (navigating away within the app)
      writeExerciseHistory(exercisesRef.current).catch(e =>
        console.error('Failed to save exercise history on unmount:', e)
      )
      saveNotes(notesRef.current).catch(e =>
        console.error('Failed to save notes on unmount:', e)
      )
    }
  }, [sessionType, date])

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

        // Collect all session types that share any slotId with the current session.
        // E.g. for 'upper-a', union includes 'upper-a' + 'upper-a-5' (they share ua-* slotIds).
        const slotIdIndex = buildSlotIdIndex(program)
        const analogousTypes = new Set([sessionType])
        for (const ex of config.exercises) {
          if (!ex.slotId) continue
          for (const stId of slotIdIndex[ex.slotId] || []) analogousTypes.add(stId)
        }

        const [existing, tagsResult, ...recentArrays] = await Promise.all([
          getSession(sessionType, date),
          getTags(),
          ...Array.from(analogousTypes).map(st => getRecentSessions(st, 6)),
        ])

        let loadedTags = tagsResult
        if (loadedTags === null) {
          loadedTags = DEFAULT_TAGS
          putTags(loadedTags)
        }
        setAllTags(loadedTags)
        const recent = recentArrays.flat()

        // Sort by date desc, exclude the current session, cap at 5
        const pastSessions = recent
          .filter(s => !(s.sessionType === sessionType && s.SK === `DATE#${date}`))
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        setRecentSessions(pastSessions.slice(0, 5))

        if (existing) {
          // Backfill slotId onto loaded exercises if missing (older sessions predate slotIds).
          // Match by array index against the program config — the historical invariant.
          const backfilled = existing.exercises.map((ex, i) => {
            if (ex.slotId || ex.supplemental) return ex
            const cfg = config.exercises[i]
            return cfg?.slotId ? { ...ex, slotId: cfg.slotId } : ex
          })
          setExercises(backfilled)
          setSessionTags(resolveSessionTags(existing))
          setFiveDay(existing.fiveDay || false)
          setStartedAt(existing.startedAt || null)
          setNotes(existing.notes || '')
          // Auto-show note UI for any exercise that already has a note
          const withNotes = new Set(backfilled.map((ex, i) => ex.note ? i : -1).filter(i => i >= 0))
          if (withNotes.size > 0) setNoteOpen(withNotes)
          // Initialize ref from loaded exercises so cross-session stale entries are detected
          backfilled.forEach((ex, i) => {
            lastHistoryNameRef.current[i] = ex.swappedName || ex.name
          })
        } else {
          // Infer week from last session's 5/3/1 exercises
          let inferredWeek = 1
          if (pastSessions.length > 0) {
            const last531 = pastSessions[0].exercises?.find(e => e.is531)
            if (last531?.week && last531.week !== 'deload') {
              const next = (last531.week % 3) + 1
              if (next >= 1 && next <= 3) inferredWeek = next
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

          const now = new Date().toISOString()
          setStartedAt(now)
          setExercises(initial)
          await putSession({
            PK: `SESSION#${sessionType}`,
            SK: `DATE#${date}`,
            type: 'SESSION',
            sessionType,
            date,
            startedAt: now,
            tags: [],
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
  }, [sessionType, date, config, program])

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

  function handleNoteChange(exIndex, value) {
    setExercises(prev => {
      const updated = prev.map((ex, ei) => {
        if (ei !== exIndex) return ex
        return { ...ex, note: value }
      })
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
      saveTimeout.current = setTimeout(() => {
        updateSessionExercises(sessionType, date, updated).catch(e =>
          console.error('Failed to save note:', e)
        )
      }, 500)
      return updated
    })
  }

  function toggleNote(exIndex) {
    setNoteOpen(prev => {
      const next = new Set(prev)
      if (next.has(exIndex)) next.delete(exIndex)
      else next.add(exIndex)
      return next
    })
  }

  function handle531WeekChange(exIndex, newWeek) {
    setExercises(prev => {
      const updated = prev.map((ex, ei) => {
        if (ei !== exIndex || !ex.is531 || !ex.trainingMax) return ex
        const rawSets = newWeek === 'deload'
          ? getDeloadSets(ex.trainingMax)
          : getSetsForWeek(newWeek, ex.trainingMax)
        const newSets = rawSets.map((s, i) => ({
          setNumber: i + 1,
          target: s.target,
          label: s.label,
          isWarmup: s.isWarmup,
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

  function handleAddSet(exIndex) {
    setExercises(prev => {
      const updated = prev.map((ex, ei) => {
        if (ei !== exIndex) return ex
        const newSet = { setNumber: ex.sets.length + 1, weight: '', reps: '', rir: '' }
        return { ...ex, sets: [...ex.sets, newSet] }
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

  function handleRemoveSet(exIndex) {
    setExercises(prev => {
      const updated = prev.map((ex, ei) => {
        if (ei !== exIndex || ex.sets.length <= 1) return ex
        return { ...ex, sets: ex.sets.slice(0, -1) }
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
    setKebabOpen(null)
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
    setKebabOpen(null)
  }


  function handleAddOnExercise(libExercise) {
    setExercises(prev => {
      const sets = Array.from({ length: libExercise.defaultSets || 3 }, (_, i) => ({
        setNumber: i + 1,
        weight: '',
        reps: '',
        rir: '',
      }))
      const newEx = {
        name: libExercise.name,
        weightUnit: 'lbs',
        supplemental: true,
        sets,
      }
      const updated = [...prev, newEx]
      updateSessionExercises(sessionType, date, updated).catch(e =>
        console.error('Failed to save supplemental add:', e)
      )
      return updated
    })
    setAddonFilter('')
    setAddonFamilyFilter('')
  }

  function handleRemoveSupplemental(exIndex) {
    setExercises(prev => {
      const ex = prev[exIndex]
      if (!ex?.supplemental) return prev
      const updated = prev.filter((_, i) => i !== exIndex)
      updateSessionExercises(sessionType, date, updated).catch(e =>
        console.error('Failed to save supplemental remove:', e)
      )
      return updated
    })
    setConfirmRemoveAddon(null)
    setSwapOpen(null)
    setKebabOpen(null)
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
            const rawSets = week === 'deload' ? getDeloadSets(newTm) : getSetsForWeek(week, newTm)
            return {
              ...ex,
              trainingMax: newTm,
              sets: rawSets.map((s, i) => ({
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
      await writeExerciseHistory(updated)
      await saveNotes(notes)

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 2000)
    } catch (e) {
      console.error('Manual save failed:', e)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  function get531LastWeek(exerciseName) {
    const past = recentSessions.find(s =>
      s.date !== date &&
      s.exercises?.some(ex => (ex.name === exerciseName || ex.swappedName === exerciseName) && ex.week)
    )
    if (!past) return null
    const ex = past.exercises.find(ex => (ex.name === exerciseName || ex.swappedName === exerciseName) && ex.week)
    return { week: ex.week, date: past.date }
  }

  // Build slot history by matching slotId across all sessions (including analogous session types).
  // Falls back to array-index match for legacy sessions that predate slotIds.
  function getExerciseHistory(slotId, slotIndex) {
    return recentSessions
      .map(s => {
        if (!s.exercises) return null
        let ex = slotId ? s.exercises.find(e => e.slotId === slotId) : null
        if (!ex && s.sessionType === sessionType) {
          // Legacy fallback: within the same session type, array index was the contract.
          ex = s.exercises[slotIndex]
        }
        if (!ex) return null
        return {
          date: s.date,
          sets: ex.sets,
          weightUnit: ex.weightUnit || 'lbs',
          displayName: ex.swappedName || ex.name,
          tags: resolveSessionTags(s),
          sessionType: s.sessionType,
          crossSession: s.sessionType !== sessionType,
        }
      })
      .filter(h => h && h.sets?.some(s => s.weight || s.reps))
  }

  function cycleHistory(exName) {
    setHistoryLevel(prev => {
      const current = prev[exName] || 1
      if (current === 1) return { ...prev, [exName]: 3 }
      if (current === 3) return { ...prev, [exName]: 5 }
      return { ...prev, [exName]: 1 }
    })
  }

  if (!config) return <div className="active-session"><p>Unknown session type.</p></div>
  if (loading) return <div className="active-session"><p>Loading...</p></div>
  if (error) return <div className="active-session"><p>Error: {error}</p></div>

  return (
    <div className="active-session">
      <button className="back" onClick={() => navigate('/')}>← Back</button>
      <h2>{config.name}</h2>
      <p className="session-date">
        {date}
        {startedAt && ` · started ${new Date(startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`}
      </p>

      {allTags.filter(t => !t.deleted).length > 0 && (
        <div className="session-tags-row">
          {allTags.filter(t => !t.deleted).map(tag => (
            <TagChip
              key={tag.id}
              tag={tag}
              active={sessionTags.includes(tag.id)}
              onToggle={id => {
                setSessionTags(prev => {
                  const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                  updateSessionField(sessionType, date, 'tags', next).catch(e =>
                    console.error('Failed to save tags:', e)
                  )
                  return next
                })
              }}
            />
          ))}
        </div>
      )}
      {fiveDayReductions && (
        <div className="session-system-row">
          <button
            className={`tag-chip tag-chip--system${fiveDay ? ' tag-chip--system-active' : ''}`}
            onClick={() => {
              const isFiveDay = !fiveDay
              setFiveDay(isFiveDay)
              updateSessionField(sessionType, date, 'fiveDay', isFiveDay)
              setExercises(prev => {
                const updated = prev.map(ex => {
                  const reduction = fiveDayReductions[ex.name]
                  if (!reduction) return ex
                  if (isFiveDay) {
                    return { ...ex, sets: ex.sets.slice(0, -reduction) }
                  } else {
                    const lastNum = ex.sets.length
                    const restored = Array.from({ length: reduction }, (_, i) => ({
                      setNumber: lastNum + i + 1,
                      weight: '',
                      reps: '',
                      rir: '',
                    }))
                    return { ...ex, sets: [...ex.sets, ...restored] }
                  }
                })
                updateSessionExercises(sessionType, date, updated).catch(e =>
                  console.error('Failed to save 5-day change:', e)
                )
                return updated
              })
            }}
          >
            5-day week
          </button>
        </div>
      )}

      {config.exercises.map((exConfig) => {
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
                    onChange={e => {
                      const val = e.target.value
                      handle531WeekChange(exIndex, val === 'deload' ? 'deload' : Number(val))
                    }}
                    className="week-select"
                  >
                    <option value={1}>{WEEK_LABELS[1]}</option>
                    <option value={2}>{WEEK_LABELS[2]}</option>
                    <option value={3}>{WEEK_LABELS[3]}</option>
                    <option value="deload">Deload</option>
                  </select>
                  <span className="exercise-target">TM: {exercise.trainingMax} lbs · Rest {exConfig.rest}</span>
                </div>
                {(() => {
                  const last = get531LastWeek(exConfig.name)
                  return last ? (
                    <div className="history-section">
                      <div className="last-session">
                        <strong>Last:</strong> {last.week === 'deload' ? 'Deload' : `Week ${last.week}`} — {last.date}
                      </div>
                    </div>
                  ) : null
                })()}
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
        const slotHistory = getExerciseHistory(exConfig.slotId, exIndex)
        const expandLevel = historyLevel[exercise.name] || 1
        const displayName = exercise.swappedName || exercise.name
        const isSwapped = !!exercise.swappedName
        const isSwapOpen = swapOpen === exIndex

        // Find sub config if swapped to a sub with custom ranges
        const activeSub = isSwapped && exConfig.subs?.find(
          s => typeof s === 'object' && s.name === exercise.swappedName
        )
        const displaySets = activeSub?.sets || exConfig.sets
        // Use getRangeRir so plain string subs resolve via exercise library
        const { repRange: displayRange, rir: displayRir } = getRangeRir(displayName, exConfig, exerciseLibrary)
        const progReady = !exConfig.is531 && checkProgression(exercise.sets, displayRange, displayRir)

        // Build union of slot-based history + library history for this exercise
        // This surfaces appearances across other session types (e.g. Incline Cable Fly in both Upper A and Upper B)
        const libEntry = exerciseLibrary.find(e => e.name === displayName)
        const libHistory = (libEntry?.history || [])
          .filter(h => h.date && h.date !== date && h.sets?.some(s => s.weight || s.reps))
          .map(h => ({
            date: h.date,
            sets: h.sets,
            weightUnit: h.weightUnit || 'lbs',
            displayName,
            tags: resolveHistoryTags(h),
            sessionType: h.sessionType,
            crossSession: h.sessionType !== sessionType,
          }))
        // Slot-based takes precedence for same date+sessionType (has accurate displayName/tags)
        const historySeen = new Map()
        for (const h of slotHistory) {
          historySeen.set(`${h.date}#${h.sessionType}`, h)
        }
        for (const h of libHistory) {
          const key = `${h.date}#${h.sessionType}`
          if (!historySeen.has(key)) historySeen.set(key, h)
        }
        const history = Array.from(historySeen.values())
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''))

        return (
          <div key={exercise.name} className="exercise-block">
            <div className="exercise-header">
              <div className="exercise-top-row">
                <h3 className="exercise-name">{displayName}</h3>
                <div className="exercise-controls">
                  <button
                    className="unit-toggle"
                    onClick={() => handleUnitChange(exIndex, (exercise.weightUnit || 'lbs') === 'lbs' ? 'kg' : 'lbs')}
                  >
                    {exercise.weightUnit || 'lbs'}
                  </button>
                  <button
                    className={`kebab-btn${kebabOpen === exIndex ? ' kebab-btn--active' : ''}`}
                    onClick={() => {
                      if (kebabOpen === exIndex) { setKebabOpen(null); setSwapOpen(null) }
                      else { setKebabOpen(exIndex); setSwapOpen(null) }
                    }}
                  >···</button>
                </div>
              </div>
              {isSwapped && (
                <span className="swapped-from">Originally: {exercise.name}</span>
              )}
              <span className="exercise-target">
                {displaySets} × {displayRange[0] === displayRange[1] ? displayRange[0] : `${displayRange[0]}–${displayRange[1]}`}
                {exConfig.perSide ? '/side' : ''} · RIR {displayRir} · {exConfig.rest}
              </span>
              {exConfig.superset && (
                <span className={`superset-badge superset-${exConfig.superset.toLowerCase()}`}>Superset {exConfig.superset}</span>
              )}
              {exConfig.optional && (
                <span className="optional-badge">Optional</span>
              )}
              {progReady && (
                <span className="progression-badge">↑ Add weight next session</span>
              )}
            </div>

            {kebabOpen === exIndex && (
              <div className="kebab-panel">
                <div className="kebab-top-row">
                  <button
                    className={`kebab-swap-btn${isSwapOpen ? ' kebab-swap-btn--active' : ''}`}
                    onClick={() => setSwapOpen(isSwapOpen ? null : exIndex)}
                  >
                    ⇄ Swap Exercise
                  </button>
                  <div className="kebab-counter">
                    <button
                      className="kebab-counter-btn"
                      onClick={() => handleRemoveSet(exIndex)}
                      disabled={exercise.sets.length <= 1}
                    >−</button>
                    <span className="kebab-counter-label">{exercise.sets.length} sets</span>
                    <button className="kebab-counter-btn" onClick={() => handleAddSet(exIndex)}>+</button>
                  </div>
                </div>
                <button
                  className={`kebab-note-btn${noteOpen.has(exIndex) ? ' kebab-swap-btn--active' : ''}`}
                  onClick={() => toggleNote(exIndex)}
                >
                  ✎ Note
                </button>
              </div>
            )}

            {isSwapOpen && (
              <div className="swap-panel">
                {exConfig.subs?.map(sub => {
                  const subName = typeof sub === 'object' ? sub.name : sub
                  const subLabel = typeof sub === 'object'
                    ? `${sub.name} (${sub.sets}×${sub.repRange[0] === sub.repRange[1] ? sub.repRange[0] : `${sub.repRange[0]}–${sub.repRange[1]}`}, RIR ${sub.rir})`
                    : sub
                  return (
                    <button key={subName} className="swap-option" onClick={() => handleSwap(exIndex, subName)}>
                      {subLabel}
                    </button>
                  )
                })}
                {isSwapped && (
                  <button className="swap-reset" onClick={() => handleResetSwap(exIndex)}>
                    Reset to {exercise.name}
                  </button>
                )}
              </div>
            )}

            {history.length > 0 && (
              <div className="history-section">
                {history.slice(0, expandLevel).map(h => {
                  const nameMatches = h.displayName === displayName
                  const showBump = nameMatches && !exConfig.is531 && checkProgression(h.sets, displayRange, displayRir)
                  return (
                  <div key={`${h.date}#${h.sessionType}`} className="last-session">
                    <span className="history-date">{h.date}:</span>{' '}
                    {h.crossSession && program?.sessionTypes[h.sessionType] && (
                      <span className="history-session-tag">[{program.sessionTypes[h.sessionType].name}]</span>
                    )}{' '}
                    <span className="history-variant">{h.displayName}</span>{' '}
                    {h.tags?.map(id => {
                      const tag = allTags.find(t => t.id === id)
                      return tag ? <TagChip key={id} tag={tag} /> : null
                    })}
                    {' '}
                    {h.sets.length === 0
                      ? <span className="history-none">None</span>
                      : h.sets.filter(s => s.weight || s.reps).map(s => {
                          const base = `${s.weight}${h.weightUnit === 'kg' ? 'kg' : ''}×${s.reps}`
                          return s.rir !== '' && s.rir !== undefined ? `${base}(${s.rir})` : base
                        }).join(', ')
                    }
                    {showBump && <span className="bump-tag"> ↑ bump</span>}
                    {h.note && <NoteRenderer className="history-exercise-note">{h.note}</NoteRenderer>}
                  </div>
                )})}
                {history.length > expandLevel && (
                  <button className="show-more" onClick={() => cycleHistory(exercise.name)}>+</button>
                )}
                {expandLevel > 1 && expandLevel >= history.length && (
                  <button className="show-more" onClick={() => cycleHistory(exercise.name)}>−</button>
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
            {noteOpen.has(exIndex) && (
              <>
                <hr className="exercise-note-divider" />
                <textarea
                  className="exercise-note-input"
                  placeholder="Exercise note..."
                  value={exercise.note || ''}
                  onChange={e => handleNoteChange(exIndex, e.target.value)}
                  rows={2}
                />
              </>
            )}
          </div>
        )
      })}

      {/* Supplemental exercises */}
      {exercises.filter(ex => ex.supplemental).map(exercise => {
        const exIndex = exercises.indexOf(exercise)
        const displayName = exercise.swappedName || exercise.name
        const isSwapped = !!exercise.swappedName
        const isSwapOpen = swapOpen === exIndex

        return (
          <div key={`addon-${exIndex}`} className="exercise-block exercise-addon">
            <div className="exercise-header">
              <div className="exercise-top-row">
                <h3 className="exercise-name">{displayName}</h3>
                <div className="exercise-controls">
                  <button
                    className="unit-toggle"
                    onClick={() => handleUnitChange(exIndex, (exercise.weightUnit || 'lbs') === 'lbs' ? 'kg' : 'lbs')}
                  >
                    {exercise.weightUnit || 'lbs'}
                  </button>
                  <button
                    className={`kebab-btn${kebabOpen === exIndex ? ' kebab-btn--active' : ''}`}
                    onClick={() => {
                      if (kebabOpen === exIndex) { setKebabOpen(null); setSwapOpen(null); setAddonFilter(''); setAddonFamilyFilter('') }
                      else { setKebabOpen(exIndex); setSwapOpen(null) }
                    }}
                  >···</button>
                </div>
              </div>
              {isSwapped && (
                <span className="swapped-from">Originally: {exercise.name}</span>
              )}
              <span className="addon-badge">Add-on</span>
            </div>

            {kebabOpen === exIndex && (
              <div className="kebab-panel">
                <div className="kebab-top-row">
                  <button
                    className={`kebab-swap-btn${isSwapOpen ? ' kebab-swap-btn--active' : ''}`}
                    onClick={() => { setSwapOpen(isSwapOpen ? null : exIndex); if (!isSwapOpen) { setAddonFilter(''); setAddonFamilyFilter('') } }}
                  >
                    ⇄ Swap Exercise
                  </button>
                  <div className="kebab-counter">
                    <button
                      className="kebab-counter-btn"
                      onClick={() => handleRemoveSet(exIndex)}
                      disabled={exercise.sets.length <= 1}
                    >−</button>
                    <span className="kebab-counter-label">{exercise.sets.length} sets</span>
                    <button className="kebab-counter-btn" onClick={() => handleAddSet(exIndex)}>+</button>
                  </div>
                </div>
                <button
                  className={`kebab-note-btn${noteOpen.has(exIndex) ? ' kebab-swap-btn--active' : ''}`}
                  onClick={() => toggleNote(exIndex)}
                >
                  ✎ Note
                </button>
              </div>
            )}

            {isSwapOpen && (() => {
              const filtered = exerciseLibrary
                .filter(ex => {
                  if (addonFamilyFilter && ex.family !== addonFamilyFilter) return false
                  const q = addonFilter.toLowerCase()
                  return !q || ex.name.toLowerCase().includes(q)
                })
                .sort((a, b) => a.name.localeCompare(b.name))
              const limit = addonFilter ? 20 : 3
              const shown = filtered.slice(0, limit)
              const remaining = filtered.length - limit
              return (
                <div className="swap-panel">
                  <select
                    className="addon-search"
                    value={addonFamilyFilter}
                    onChange={e => setAddonFamilyFilter(e.target.value)}
                  >
                    <option value="">All families</option>
                    {EXERCISE_FAMILIES.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="addon-search"
                    placeholder="Search exercises..."
                    value={addonFilter}
                    onChange={e => setAddonFilter(e.target.value)}
                    autoFocus
                  />
                  {shown.map(ex => (
                    <button key={ex.name} className="swap-option" onClick={() => handleSwap(exIndex, ex.name)}>
                      {ex.name}
                    </button>
                  ))}
                  {remaining > 0 && !addonFilter && (
                    <span className="addon-no-results">{remaining} more — type to search</span>
                  )}
                  {filtered.length === 0 && <span className="addon-no-results">No matches</span>}
                  {isSwapped && (
                    <button className="swap-reset" onClick={() => handleResetSwap(exIndex)}>
                      Reset to {exercise.name}
                    </button>
                  )}
                </div>
              )
            })()}

            {(() => {
              const libEntry = exerciseLibrary.find(ex => ex.name === displayName)
              const addonHistory = (libEntry?.history || []).filter(h => h.date !== date && h.sets?.some(s => s.weight || s.reps))
              const expandLevel = historyLevel[displayName] || 1
              if (addonHistory.length === 0) return null
              return (
                <div className="history-section">
                  {addonHistory.slice(0, expandLevel).map(h => (
                    <div key={`${h.date}-${h.sessionType}`} className="last-session">
                      <span className="history-date">{h.date}:</span>{' '}
                      {resolveHistoryTags(h).map(id => {
                        const tag = allTags.find(t => t.id === id)
                        return tag ? <TagChip key={id} tag={tag} /> : null
                      })}
                      {' '}
                      {h.sets.filter(s => s.weight || s.reps).map(s => {
                        const base = `${s.weight}${h.weightUnit === 'kg' ? 'kg' : ''}×${s.reps}`
                        return s.rir !== '' && s.rir !== undefined ? `${base}(${s.rir})` : base
                      }).join(', ')}
                    </div>
                  ))}
                  {addonHistory.length > expandLevel && (
                    <button className="show-more" onClick={() => cycleHistory(displayName)}>+</button>
                  )}
                  {expandLevel > 1 && expandLevel >= addonHistory.length && (
                    <button className="show-more" onClick={() => cycleHistory(displayName)}>−</button>
                  )}
                </div>
              )
            })()}

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
            {noteOpen.has(exIndex) && (
              <>
                <hr className="exercise-note-divider" />
                <textarea
                  className="exercise-note-input"
                  placeholder="Exercise note..."
                  value={exercise.note || ''}
                  onChange={e => handleNoteChange(exIndex, e.target.value)}
                  rows={2}
                />
              </>
            )}
            {confirmRemoveAddon === exIndex ? (
              <div className="addon-remove-confirm">
                <span>Remove?</span>
                <button className="addon-remove-yes" onClick={() => handleRemoveSupplemental(exIndex)}>Yes</button>
                <button className="addon-remove-no" onClick={() => setConfirmRemoveAddon(null)}>Cancel</button>
              </div>
            ) : (
              <button className="addon-remove-btn" onClick={() => setConfirmRemoveAddon(exIndex)}>Remove</button>
            )}
          </div>
        )
      })}

      {/* Add-on button */}
      <button
        className="addon-add-btn"
        onClick={() => {
          const cableCrunch = exerciseLibrary.find(ex => ex.name === 'Cable Crunch') || { name: 'Cable Crunch', defaultSets: 4 }
          handleAddOnExercise(cableCrunch)
        }}
      >+ Add-on Exercise</button>

      <div className="session-notes">
        <label className="session-notes-label" htmlFor="session-notes">Notes</label>
        <textarea
          id="session-notes"
          className="session-notes-input"
          value={notes}
          placeholder="Session notes..."
          onChange={e => {
            const val = e.target.value
            setNotes(val)
            if (notesTimeout.current) clearTimeout(notesTimeout.current)
            notesTimeout.current = setTimeout(() => {
              updateSessionField(sessionType, date, 'notes', val).catch(err =>
                console.error('Failed to save notes:', err)
              )
            }, 500)
          }}
          rows={3}
        />
      </div>

      <button className="save-btn" onClick={handleManualSave} disabled={saveStatus === 'saving'}>
        {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Save failed — retry' : 'Save'}
      </button>
    </div>
  )
}
