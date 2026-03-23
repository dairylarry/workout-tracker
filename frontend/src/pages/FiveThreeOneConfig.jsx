import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { get531Config, put531Config } from '../lib/dynamodb'
import { getFullWaveTable } from '../lib/fiveThreeOne'
import { getToday } from '../lib/date'
import '../styles/FiveThreeOneConfig.css'

const EXERCISES = [
  { key: 'squat', label: 'Barbell Back Squat' },
  { key: 'bench', label: 'Flat Barbell Bench Press' },
]

export default function FiveThreeOneConfig() {
  const navigate = useNavigate()
  const [configs, setConfigs] = useState({})
  const [inputs, setInputs] = useState({})
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState({})
  const [deleteMode, setDeleteMode] = useState(false)

  useEffect(() => {
    async function load() {
      const results = {}
      for (const ex of EXERCISES) {
        const config = await get531Config(ex.key)
        if (config) results[ex.key] = config
      }
      setConfigs(results)
      const initInputs = {}
      for (const ex of EXERCISES) {
        initInputs[ex.key] = results[ex.key]?.trainingMax?.toString() || ''
      }
      setInputs(initInputs)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(exerciseKey) {
    const tm = Number(inputs[exerciseKey])
    if (!tm || tm <= 0) return

    const existing = configs[exerciseKey]
    const history = existing?.history || []
    const oldTm = existing?.trainingMax

    if (oldTm !== tm) {
      history.push({ date: getToday(), tm })
    }

    setSaveStatus(prev => ({ ...prev, [exerciseKey]: 'saving' }))
    try {
      await put531Config(exerciseKey, tm, history)
      setConfigs(prev => ({
        ...prev,
        [exerciseKey]: { ...prev[exerciseKey], trainingMax: tm, history },
      }))
      setSaveStatus(prev => ({ ...prev, [exerciseKey]: 'saved' }))
      setTimeout(() => setSaveStatus(prev => ({ ...prev, [exerciseKey]: null })), 2000)
    } catch (e) {
      console.error('Failed to save 531 config:', e)
      setSaveStatus(prev => ({ ...prev, [exerciseKey]: 'error' }))
      setTimeout(() => setSaveStatus(prev => ({ ...prev, [exerciseKey]: null })), 3000)
    }
  }

  async function handleDeleteHistory(exerciseKey, historyIndex) {
    const existing = configs[exerciseKey]
    if (!existing?.history) return
    const reversed = [...existing.history].reverse()
    const actualIndex = existing.history.length - 1 - historyIndex
    const newHistory = existing.history.filter((_, i) => i !== actualIndex)
    const newTm = newHistory.length > 0 ? newHistory[newHistory.length - 1].tm : null

    try {
      await put531Config(exerciseKey, newTm, newHistory)
      setConfigs(prev => ({
        ...prev,
        [exerciseKey]: { ...prev[exerciseKey], trainingMax: newTm, history: newHistory },
      }))
      setInputs(prev => ({ ...prev, [exerciseKey]: newTm?.toString() || '' }))
    } catch (e) {
      console.error('Failed to delete history entry:', e)
    }
  }

  if (loading) return <div className="fto-config"><p>Loading...</p></div>

  return (
    <div className="fto-config">
      <button className="back" onClick={() => navigate('/')}>← Back</button>
      <h2>5/3/1 Config</h2>

      {EXERCISES.map(ex => {
        const config = configs[ex.key]
        const tm = config?.trainingMax
        const wave = tm ? getFullWaveTable(tm) : null
        const status = saveStatus[ex.key]

        return (
          <div key={ex.key} className="fto-exercise">
            <h3>{ex.label}</h3>

            <div className="tm-input-row">
              <label>Training Max (lbs)</label>
              <input
                type="number"
                inputMode="numeric"
                value={inputs[ex.key]}
                onChange={e => setInputs(prev => ({ ...prev, [ex.key]: e.target.value }))}
                placeholder="e.g. 225"
              />
              <button onClick={() => handleSave(ex.key)} disabled={status === 'saving'}>
                {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved' : status === 'error' ? 'Error' : 'Save'}
              </button>
            </div>

            {wave && (
              <div className="wave-table-wrap">
                <table className="wave-table">
                  <thead>
                    <tr>
                      <th>{ex.label.split(' ').pop()}</th>
                      <th>5</th>
                      <th>3</th>
                      <th>1</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wave.warmup.map((s, i) => (
                      <tr key={`warmup-${i}`} className="warmup-row">
                        <td>{s.label}</td>
                        <td>{s.target}</td>
                        <td>{s.target}</td>
                        <td>{s.target}</td>
                      </tr>
                    ))}
                    {[0, 1, 2].map(i => (
                      <tr key={`work-${i}`} className={wave.weeks[1][i].isAmrap ? 'amrap-row' : ''}>
                        <td>{wave.weeks[1][i].label}</td>
                        <td>{wave.weeks[1][i].target}</td>
                        <td>{wave.weeks[2][i].target}</td>
                        <td>{wave.weeks[3][i].target}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {config?.history && config.history.length > 0 && (
              <div className="tm-history">
                <h4>TM History</h4>
                {[...config.history].reverse().map((entry, i) => (
                  <div key={i} className="tm-history-entry">
                    <span>{entry.date} — {entry.tm} lbs</span>
                    {deleteMode && (
                      <button className="tm-delete-x" onClick={() => handleDeleteHistory(ex.key, i)}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
      <button className="delete-mode-btn" onClick={() => setDeleteMode(prev => !prev)}>
        {deleteMode ? 'Done' : 'Delete History Entries'}
      </button>
    </div>
  )
}
