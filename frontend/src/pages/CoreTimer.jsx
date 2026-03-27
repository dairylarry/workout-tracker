import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCoreRoutines } from '../lib/dynamodb'
import { unfurlRoutine, computeRoutineStats, formatDuration } from '../lib/unfurl'
import '../styles/CoreTimer.css'

// ── Timer constants ──────────────────────────────────────────────────────────
const COUNTDOWN_S  = 10
const TICKS        = 3
const TRANSITION_S = 0.5
const VOLUME       = 0.72

const FREQ_TICK = 440  // A4 — countdown + warning ticks
const FREQ_WORK = 784  // G5 — work beep
const FREQ_REST = 523  // C5 — rest beep

const LS_KEY = 'core-selected-routine-id'
const DEFAULT_ROUTINE_ID = 'ground-level'

// ── Audio helpers ────────────────────────────────────────────────────────────

/** Schedule a sine-wave tone. All times are relative seconds from `origin`. */
function scheduleTone(ctx, freq, dur, vol, relT, origin) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.value = freq
  const at = origin + relT
  const v = vol * VOLUME
  gain.gain.setValueAtTime(v, at)
  gain.gain.setValueAtTime(v, at + dur - 0.005)
  gain.gain.linearRampToValueAtTime(0.0001, at + dur)
  osc.start(at)
  osc.stop(at + dur)
  return osc
}

/**
 * Pure function: compute the full tone schedule and phase list from an unfurled exercise list.
 * No AudioContext side effects — just data.
 */
function computeSchedule(unfurled) {
  const tones = []   // [{ relT, freq, dur, vol }]
  const phases = []  // [{ type, label, start, end, cue?, next?, exerciseIndex?, blockLabel? }]
  let t = COUNTDOWN_S

  // ── Countdown ──
  phases.push({
    type: 'countdown', label: 'Get Ready',
    start: 0, end: COUNTDOWN_S,
    next: unfurled[0]?.name || null,
  })
  for (let i = 0; i < TICKS; i++) {
    tones.push({ relT: COUNTDOWN_S - TICKS + i, freq: FREQ_TICK, dur: 0.1, vol: 0.3 })
  }

  // ── Work / rest cycles ──
  for (let i = 0; i < unfurled.length; i++) {
    const ex = unfurled[i]
    const isLast = i === unfurled.length - 1
    const nextName = unfurled[i + 1]?.name || null

    // Work beep — triple-tap bell for last exercise, single beep otherwise
    if (isLast) {
      tones.push({ relT: t, freq: FREQ_WORK, dur: 0.08, vol: 0.55 })
      tones.push({ relT: t + 0.14, freq: FREQ_WORK, dur: 0.08, vol: 0.50 })
      tones.push({ relT: t + 0.26, freq: FREQ_WORK, dur: 0.30, vol: 0.45 })
    } else {
      tones.push({ relT: t, freq: FREQ_WORK, dur: TRANSITION_S, vol: 0.4 })
    }

    phases.push({
      type: 'work', label: ex.name,
      start: t, end: t + ex.workSeconds,
      cue: ex.cue || null,
      next: isLast ? null : nextName,
      exerciseIndex: i + 1,
      blockLabel: ex.blockLabel,
    })

    // Warning ticks before work→rest transition
    if (ex.workSeconds - TRANSITION_S >= TICKS) {
      for (let j = 0; j < TICKS; j++) {
        tones.push({ relT: t + ex.workSeconds - TICKS + j, freq: FREQ_TICK, dur: 0.1, vol: 0.3 })
      }
    }

    t += ex.workSeconds

    // Rest phase (skip if restSeconds is 0)
    if (ex.restSeconds > 0) {
      const restBeepDur = Math.max(TRANSITION_S, 0.5)
      tones.push({ relT: t, freq: FREQ_REST, dur: restBeepDur, vol: 0.3 })

      phases.push({
        type: 'rest', label: 'Rest',
        start: t, end: t + ex.restSeconds,
        next: nextName,
      })

      if (ex.restSeconds - restBeepDur >= TICKS) {
        for (let j = 0; j < TICKS; j++) {
          tones.push({ relT: t + ex.restSeconds - TICKS + j, freq: FREQ_TICK, dur: 0.1, vol: 0.3 })
        }
      }

      t += ex.restSeconds
    }
  }

  // ── End beep ──
  tones.push({ relT: t, freq: FREQ_REST, dur: 1.0, vol: 0.4 })
  phases.push({ type: 'done', label: 'Done', start: t, end: t + 2 })

  return { tones, phases, endTime: t + 2, exerciseCount: unfurled.length }
}

/**
 * Schedule OscillatorNodes on the AudioContext from the precomputed tone list.
 * Only schedules tones where relT >= offsetSeconds (for pause/resume).
 */
function scheduleNodes(ctx, tones, origin, offsetSeconds = 0) {
  const nodes = []
  for (const s of tones) {
    if (s.relT >= offsetSeconds) {
      nodes.push(scheduleTone(ctx, s.freq, s.dur, s.vol, s.relT - offsetSeconds, origin))
    }
  }
  return nodes
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CoreTimer() {
  const navigate = useNavigate()

  // Audio + timer refs (not in state — these survive re-renders without triggering them)
  const ctxRef       = useRef(null)
  const silentOscRef = useRef(null)
  const nodesRef     = useRef([])
  const tonesRef     = useRef(null)   // stored tone list for pause/resume
  const phasesRef    = useRef(null)
  const originRef    = useRef(null)
  const intervalRef  = useRef(null)
  const wakeLockRef  = useRef(null)
  const endTimeRef   = useRef(null)
  const exCountRef   = useRef(0)

  // UI state
  const [routines, setRoutines] = useState([])
  const [selectedRoutine, setSelectedRoutine] = useState(null)
  const [timerState, setTimerState] = useState('idle')  // idle | running | paused | done
  const [display, setDisplay] = useState({})
  const [pausedAt, setPausedAt] = useState(0)
  const [loading, setLoading] = useState(true)

  // ── Load routines from DynamoDB ──
  useEffect(() => {
    async function load() {
      const items = await getCoreRoutines()
      setRoutines(items)
      const savedId = localStorage.getItem(LS_KEY) || DEFAULT_ROUTINE_ID
      const found = items.find(r => r.id === savedId) || items[0] || null
      setSelectedRoutine(found)
      setLoading(false)
    }
    load()
  }, [])

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current)
      cancelAllNodes()
      stopKeepalive()
      closeContext()
      releaseWakeLock()
    }
  }, [])

  // ── Resume AudioContext + wake lock after iOS backgrounding ──
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      if (ctxRef.current?.state === 'suspended') {
        ctxRef.current.resume().then(() => console.log('[CoreTimer] AudioContext resumed'))
      }
      if (wakeLockRef.current !== null && timerState === 'running') {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  // ── Audio lifecycle helpers ──

  function cancelAllNodes() {
    for (const node of nodesRef.current) {
      try { node.stop() } catch (_) {}
    }
    nodesRef.current = []
  }

  function stopKeepalive() {
    if (silentOscRef.current) {
      try { silentOscRef.current.stop() } catch (_) {}
      silentOscRef.current = null
    }
  }

  function closeContext() {
    if (ctxRef.current) {
      ctxRef.current.close()
      ctxRef.current = null
    }
  }

  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
    } catch (_) {}
  }

  function releaseWakeLock() {
    if (wakeLockRef.current) {
      wakeLockRef.current.release()
      wakeLockRef.current = null
    }
  }

  function getContext() {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext()
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume()
    }
    return ctxRef.current
  }

  function startKeepalive(ctx) {
    if (silentOscRef.current) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.value = 0.001
    osc.start()
    silentOscRef.current = osc
  }

  // ── Display tick ──

  function startDisplayInterval(offset = 0) {
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      const ctx = ctxRef.current
      if (!ctx || originRef.current == null) return
      const elapsed = (ctx.currentTime - originRef.current) + offset

      if (elapsed >= endTimeRef.current) {
        clearInterval(intervalRef.current)
        stopKeepalive()
        releaseWakeLock()
        setTimerState('done')
        setDisplay({ type: 'done', label: 'Done' })
        return
      }

      const phases = phasesRef.current
      let current = phases[0]
      for (const p of phases) {
        if (elapsed >= p.start) current = p
        else break
      }

      setDisplay({
        ...current,
        remaining: Math.max(0, Math.ceil(current.end - elapsed)),
      })
    }, 250)
  }

  // ── Timer controls ──

  function handleStart(offset = 0) {
    if (!selectedRoutine) return

    // Ambient audio session — mix with Spotify (iOS 17.4+)
    if (navigator.audioSession) {
      try { navigator.audioSession.type = 'ambient' } catch (_) {}
    }

    const ctx = getContext()
    startKeepalive(ctx)
    requestWakeLock()

    // Compute schedule on fresh start (not on resume)
    if (offset === 0) {
      const unfurled = unfurlRoutine(selectedRoutine.routine)
      const { tones, phases, endTime, exerciseCount } = computeSchedule(unfurled)
      tonesRef.current = tones
      phasesRef.current = phases
      endTimeRef.current = endTime
      exCountRef.current = exerciseCount
    }

    const origin = ctx.currentTime + 0.1
    originRef.current = origin
    nodesRef.current = scheduleNodes(ctx, tonesRef.current, origin, offset)

    console.log(`[CoreTimer] scheduled ${nodesRef.current.length} nodes, offset=${offset.toFixed(1)}s`)
    setTimerState('running')
    startDisplayInterval(offset)
  }

  function handlePause() {
    if (timerState !== 'running') return
    const ctx = ctxRef.current
    if (!ctx) return

    const elapsed = ctx.currentTime - originRef.current
    setPausedAt(elapsed)

    clearInterval(intervalRef.current)
    cancelAllNodes()
    stopKeepalive()
    closeContext()

    setTimerState('paused')
  }

  function handleResume() {
    handleStart(pausedAt)
  }

  function handleStop() {
    clearInterval(intervalRef.current)
    cancelAllNodes()
    stopKeepalive()
    closeContext()
    releaseWakeLock()

    tonesRef.current = null
    phasesRef.current = null
    originRef.current = null
    endTimeRef.current = null
    exCountRef.current = 0

    setTimerState('idle')
    setDisplay({})
    setPausedAt(0)
  }

  // ── Render ──

  if (loading) return null

  const stats = selectedRoutine ? computeRoutineStats(selectedRoutine.routine) : null

  // ── Idle ──
  if (timerState === 'idle') {
    return (
      <div className="core-timer idle">
        <div className="core-timer-idle-info">
          <h2 className="core-timer-name">{selectedRoutine?.name || 'No routine selected'}</h2>
          {stats && (
            <p className="core-timer-duration">{formatDuration(stats.totalSeconds + COUNTDOWN_S)}</p>
          )}
        </div>
        <div className="core-timer-actions">
          <button className="core-btn core-btn-start" onClick={() => handleStart()} disabled={!selectedRoutine}>
            Start
          </button>
        </div>
        <button className="core-btn core-btn-select" onClick={() => navigate('/core/select')}>
          Select Workout
        </button>
        <button className="core-btn core-btn-back" onClick={() => navigate('/')}>
          ← Back
        </button>
      </div>
    )
  }

  // ── Done ──
  if (timerState === 'done') {
    return (
      <div className="core-timer done">
        <p className="core-timer-time">Done</p>
        <p className="core-timer-exercise">{selectedRoutine?.name}</p>
        <div className="core-timer-actions">
          <button className="core-btn core-btn-start" onClick={() => handleStart()}>
            Restart
          </button>
        </div>
        <button className="core-btn core-btn-select" onClick={() => navigate('/core/select')}>
          Select Workout
        </button>
        <button className="core-btn core-btn-back" onClick={() => navigate('/')}>
          ← Back
        </button>
      </div>
    )
  }

  // ── Running / Paused ──
  const isRunning = timerState === 'running'

  return (
    <div className="core-timer running">
      {/* Exercise counter — only during work phases */}
      {display.type === 'work' && (
        <p className="core-timer-counter">
          {display.exerciseIndex} / {exCountRef.current}
        </p>
      )}

      {/* Time remaining — the hero element */}
      <p className="core-timer-time">
        {display.remaining != null ? `${display.remaining}s` : ''}
      </p>

      {/* Block label — small muted text above exercise name */}
      {display.type === 'work' && display.blockLabel && (
        <p className="core-timer-block">{display.blockLabel}</p>
      )}

      {/* Exercise name or "Rest" or "Get Ready" */}
      <p className="core-timer-exercise">{display.label || ''}</p>

      {/* Cue — only during work phases */}
      {display.type === 'work' && display.cue && (
        <p className="core-timer-cue">{display.cue}</p>
      )}

      {/* Paused indicator */}
      {timerState === 'paused' && (
        <p className="core-timer-paused">Paused</p>
      )}

      {/* Next exercise preview */}
      {(display.type === 'work' || display.type === 'rest' || display.type === 'countdown') && (
        <p className="core-timer-next">
          {display.next === null ? 'Last exercise' : `Next: ${display.next}`}
        </p>
      )}

      {/* Action buttons */}
      <div className="core-timer-actions">
        {isRunning ? (
          <button className="core-btn core-btn-pause" onClick={handlePause}>Pause</button>
        ) : (
          <button className="core-btn core-btn-start" onClick={handleResume}>Resume</button>
        )}
        <button className="core-btn core-btn-stop" onClick={handleStop}>Stop</button>
      </div>

      <button className="core-btn core-btn-back" onClick={() => { handleStop(); navigate('/') }}>
        ← Back
      </button>
    </div>
  )
}
