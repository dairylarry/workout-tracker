import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/AudioTest.css'

// --- Audio cue test config (easy to remove later) ---
// Change this path to swap the MP3 file:
const AUDIO_CUE_PATH = import.meta.env.BASE_URL + 'timer.mp3'
const AUDIO_CUE_VOLUME = 0.7 // 0.0–1.0, tune as needed

export default function AudioTest() {
  const navigate = useNavigate()
  const audioRef = useRef(null)
  const [status, setStatus] = useState('idle')

  // Lazily create and reuse a single Audio element
  function getAudio() {
    if (!audioRef.current) {
      const audio = new Audio(AUDIO_CUE_PATH)
      audio.volume = AUDIO_CUE_VOLUME
      audio.addEventListener('ended', () => setStatus('ended'))
      audio.addEventListener('error', (e) => {
        console.error('[AudioCue] error:', e)
        setStatus('error')
      })
      audioRef.current = audio
    }
    return audioRef.current
  }

  function handlePlay() {
    // Set ambient audio session so the cue mixes with Spotify (iOS 17.4+)
    if (navigator.audioSession) {
      try { navigator.audioSession.type = 'ambient' } catch (e) {
        console.warn('[AudioCue] audioSession not settable:', e)
      }
    }

    const audio = getAudio()
    audio.currentTime = 0
    setStatus('loading')

    audio.play()
      .then(() => {
        console.log('[AudioCue] playing')
        setStatus('playing')
      })
      .catch((err) => {
        console.error('[AudioCue] play() rejected:', err)
        setStatus('error')
      })
  }

  function handleStop() {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      setStatus('idle')
      console.log('[AudioCue] stopped')
    }
  }

  return (
    <div className="audio-test-page">
      <h1>Test Audio Cue</h1>
      <p className="audio-test-desc">
        Tap play while Spotify is running to test if the cue mixes without pausing music.
      </p>

      <div className="audio-test-buttons">
        <button className="audio-test-play" onClick={handlePlay}>Test Audio Cue</button>
        <button className="audio-test-stop" onClick={handleStop}>Stop Audio</button>
      </div>
      <p className="audio-test-status">Audio: {status}</p>

      <button className="audio-test-back" onClick={() => navigate('/')}>Back</button>
    </div>
  )
}
