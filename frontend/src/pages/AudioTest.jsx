import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/AudioTest.css'

// ── Timer config — mirrors scripts/timer/timer.py defaults ───────────────────
// Edit these values to change the timer behavior:
const WORK_S       = 40      // work interval (seconds)
const REST_S       = 20      // rest interval (seconds)
const TOTAL_MIN    = 10      // total timer duration (minutes)
const COUNTDOWN_S  = 10      // lead-in countdown before first work interval
const TICKS        = 3       // warning ticks before each phase transition
const TRANSITION_S = 0.5     // duration of transition beeps (seconds)
const VOLUME       = 0.65    // master volume scalar 0.0–1.0

// Frequencies from scripts/timer/timer.py
const FREQ_TICK = 440  // A4 — countdown + warning ticks
const FREQ_WORK = 784  // G5 — work beep
const FREQ_REST = 523  // C5 — rest beep
// ─────────────────────────────────────────────────────────────────────────────

/** Schedule a sine-wave tone. All times are relative seconds from `origin`. */
function scheduleTone(ctx, dest, freq, dur, vol, relT, origin, masterVol) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(dest)
  osc.frequency.value = freq
  const at = origin + relT
  const v = vol * masterVol
  gain.gain.setValueAtTime(v, at)
  // Short linear fade-out to avoid clicks
  gain.gain.setValueAtTime(v, at + dur - 0.005)
  gain.gain.linearRampToValueAtTime(0.0001, at + dur)
  osc.start(at)
  osc.stop(at + dur)
  return osc
}

/**
 * Build the complete timer schedule and pre-schedule all audio nodes.
 *
 * All tones are scheduled on the audio thread via ctx.currentTime offsets,
 * so they survive JavaScript execution being throttled/frozen by iOS.
 *
 * Returns { origin, phases, nodes, endTime } where:
 *   - phases: [{ label, start, end }] in seconds relative to origin
 *   - nodes: all OscillatorNodes (for bulk cancellation on Stop)
 *   - endTime: relative time when the timer fully finishes
 */
function buildTimer(ctx) {
  const TOTAL_S = TOTAL_MIN * 60
  const origin = ctx.currentTime + 0.1  // small buffer before first event
  const phases = []
  const nodes = []

  function tone(freq, dur, vol, relT) {
    nodes.push(scheduleTone(ctx, ctx.destination, freq, dur, vol, relT, origin, VOLUME))
  }

  // Three warning ticks, one per second (matching generate_transition_ticks)
  function warningTicks(relT) {
    for (let i = 0; i < TICKS; i++) {
      tone(FREQ_TICK, 0.1, 0.3, relT + i)
    }
  }

  // ── Countdown phase ───────────────────────────────────────────────────────
  phases.push({ label: 'Countdown', start: 0, end: COUNTDOWN_S })
  warningTicks(COUNTDOWN_S - TICKS)  // ticks at 7s, 8s, 9s

  // ── Work / rest cycles ───────────────────────────────────────────────────
  let elapsed = 0
  let round = 0

  while (elapsed < TOTAL_S) {
    const remaining = TOTAL_S - elapsed
    const isLast = remaining <= WORK_S + REST_S
    const workDur = isLast ? remaining : WORK_S
    const workT = COUNTDOWN_S + elapsed

    if (isLast) {
      // Triple-tap bell: tap-tap-ring with tightening gaps and decreasing volume
      tone(FREQ_WORK, 0.08, 0.55, workT)           // strong initial hit
      tone(FREQ_WORK, 0.08, 0.50, workT + 0.14)    // quick follow (0.06s gap)
      tone(FREQ_WORK, 0.30, 0.45, workT + 0.26)    // longer ring-out (0.04s gap)
    } else {
      tone(FREQ_WORK, TRANSITION_S, 0.4, workT)
    }

    phases.push({ label: `Work ${round + 1}`, start: workT, end: workT + workDur })

    // Warning ticks 3s before work ends (if there's room after the transition beep)
    if (workDur - TRANSITION_S >= TICKS) {
      warningTicks(workT + workDur - TICKS)
    }

    elapsed += workDur
    round++

    if (elapsed >= TOTAL_S) break

    // Rest phase
    const restT = COUNTDOWN_S + elapsed
    const restBeepDur = Math.max(TRANSITION_S, 0.5)  // rest beep is at least 0.5s
    tone(FREQ_REST, restBeepDur, 0.3, restT)

    phases.push({ label: 'Rest', start: restT, end: restT + REST_S })

    if (REST_S - restBeepDur >= TICKS) {
      warningTicks(restT + REST_S - TICKS)
    }

    elapsed += REST_S
  }

  // ── End beep ─────────────────────────────────────────────────────────────
  const endT = COUNTDOWN_S + TOTAL_S
  tone(FREQ_REST, 1.0, 0.4, endT)
  phases.push({ label: 'Done', start: endT, end: endT + 2 })

  console.log(`[Timer] scheduled ${nodes.length} audio nodes over ${endT.toFixed(0)}s`)
  return { origin, phases, nodes, endTime: endT + 2 }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AudioTest() {
  const navigate = useNavigate()
  const ctxRef        = useRef(null)
  const silentOscRef  = useRef(null)
  const scheduleRef   = useRef(null)
  const intervalRef   = useRef(null)
  const wakeLockRef   = useRef(null)

  const [timerState, setTimerState] = useState('idle')  // idle | running | done
  const [display, setDisplay] = useState({ phase: '', remaining: null })

  // Cleanup on unmount (e.g. navigating away mid-timer)
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current)
      if (scheduleRef.current) {
        for (const node of scheduleRef.current.nodes) {
          try { node.stop() } catch (_) {}
        }
      }
      if (silentOscRef.current) {
        try { silentOscRef.current.stop() } catch (_) {}
      }
      if (ctxRef.current) {
        ctxRef.current.close()
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release()
      }
    }
  }, [])

  // Resume AudioContext and re-acquire wake lock if iOS drops them after backgrounding.
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      if (ctxRef.current?.state === 'suspended') {
        ctxRef.current.resume().then(() => console.log('[Timer] AudioContext resumed'))
      }
      // Wake lock is released when page becomes hidden; re-acquire when visible again
      if (wakeLockRef.current !== null && timerState === 'running') {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) {
      console.warn('[Timer] Wake Lock API not supported')
      return
    }
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
      console.log('[Timer] wake lock acquired — screen will stay on')
      wakeLockRef.current.addEventListener('release', () => {
        console.log('[Timer] wake lock released')
      })
    } catch (e) {
      console.warn('[Timer] wake lock request failed:', e)
    }
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

  function handleStart() {
    // Must be called from a direct user gesture for iOS to allow audio playback.

    // Request ambient audio session so beeps mix with Spotify instead of pausing it (iOS 17.4+).
    if (navigator.audioSession) {
      try { navigator.audioSession.type = 'ambient' } catch (e) {
        console.warn('[Timer] audioSession not settable:', e)
      }
    }

    const ctx = getContext()

    // ── Keepalive oscillator ─────────────────────────────────────────────
    // Playing a continuous near-silent tone holds the iOS audio session open.
    // Without this, iOS suspends the AudioContext when the screen locks,
    // which would silence all pre-scheduled beeps.
    if (!silentOscRef.current) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.value = 0.001  // inaudible but enough to keep the session alive
      osc.start()
      silentOscRef.current = osc
    }

    // Keep the screen awake so iOS doesn't lock and suspend audio
    requestWakeLock()

    // Pre-schedule all beeps on the audio thread
    scheduleRef.current = buildTimer(ctx)
    setTimerState('running')

    // UI display tick — cosmetic only.
    // May freeze when screen is locked; audio playback is unaffected.
    intervalRef.current = setInterval(() => {
      const { origin, phases, endTime } = scheduleRef.current
      const elapsed = ctx.currentTime - origin

      if (elapsed >= endTime) {
        clearInterval(intervalRef.current)
        stopKeepalive()
        releaseWakeLock()
        setTimerState('done')
        setDisplay({ phase: 'Done', remaining: null })
        return
      }

      // Find current phase by scanning backwards from the end
      let currentPhase = phases[0]
      for (const p of phases) {
        if (elapsed >= p.start) currentPhase = p
        else break
      }

      setDisplay({
        phase: currentPhase.label,
        remaining: Math.max(0, Math.ceil(currentPhase.end - elapsed)),
      })
    }, 250)
  }

  function stopKeepalive() {
    if (silentOscRef.current) {
      try { silentOscRef.current.stop() } catch (_) {}
      silentOscRef.current = null
    }
  }

  function handleStop() {
    clearInterval(intervalRef.current)

    // Cancel all pre-scheduled audio nodes
    if (scheduleRef.current) {
      for (const node of scheduleRef.current.nodes) {
        try { node.stop() } catch (_) {}
      }
      scheduleRef.current = null
    }

    stopKeepalive()
    releaseWakeLock()

    if (ctxRef.current) {
      ctxRef.current.close()
      ctxRef.current = null
    }

    setTimerState('idle')
    setDisplay({ phase: '', remaining: null })
    console.log('[Timer] stopped')
  }

  const isRunning = timerState === 'running'

  const statusText =
    timerState === 'idle' ? 'idle' :
    timerState === 'done' ? 'done' :
    display.phase
      ? `${display.phase}${display.remaining != null ? ` — ${display.remaining}s` : ''}`
      : 'starting…'

  return (
    <div className="audio-test-page">
      <p className="audio-test-status">{statusText}</p>

      <div className="audio-test-buttons">
        <button className="audio-test-play" onClick={handleStart} disabled={isRunning}>
          Start
        </button>
        <button className="audio-test-stop" onClick={handleStop} disabled={timerState === 'idle'}>
          Stop
        </button>
      </div>

      <button className="audio-test-back" onClick={() => { handleStop(); navigate('/') }}>
        Back
      </button>
    </div>
  )
}
