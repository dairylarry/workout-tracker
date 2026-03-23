import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToday } from '../lib/date'
import { putBodyweight, deleteBodyweight, getAllBodyweights } from '../lib/dynamodb'
import '../styles/LogWeight.css'

export default function LogWeight() {
  const navigate = useNavigate()
  const [date, setDate] = useState(getToday())
  const [weight, setWeight] = useState('')
  const [unit, setUnit] = useState('lbs')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteMode, setDeleteMode] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await getAllBodyweights()
        setEntries(data)
      } catch (e) {
        console.error('Failed to load bodyweights:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleLog() {
    if (!weight || !date) return
    await putBodyweight(date, Number(weight), unit)
    setEntries(prev => {
      const filtered = prev.filter(e => e.date !== date)
      return [{ date, weight: Number(weight), weightUnit: unit }, ...filtered]
        .sort((a, b) => b.date.localeCompare(a.date))
    })
    setWeight('')
  }

  async function handleDelete(entryDate) {
    await deleteBodyweight(entryDate)
    setEntries(prev => prev.filter(e => e.date !== entryDate))
  }

  return (
    <div className="log-weight">
      <button className="back" onClick={() => navigate('/')}>← Back</button>
      <h2>Log Weight</h2>

      <div className="weight-input-area">
        <div className="weight-input-row">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="date-input"
          />
          <input
            type="number"
            inputMode="decimal"
            placeholder="Weight"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            className="weight-input"
          />
          <select value={unit} onChange={e => setUnit(e.target.value)} className="unit-select">
            <option value="lbs">lbs</option>
            <option value="kg">kg</option>
          </select>
        </div>
        <button className="log-btn" onClick={handleLog} disabled={!weight || !date}>
          Log
        </button>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && entries.length === 0 && (
        <p className="empty">No entries yet.</p>
      )}

      {!loading && entries.length > 0 && (
        <>
          <div className="weight-list">
            {entries.map(entry => (
              <div key={entry.date} className="weight-entry">
                <span>{entry.date} — {entry.weight} {entry.weightUnit}</span>
                {deleteMode && (
                  <button className="delete-x" onClick={() => handleDelete(entry.date)}>✕</button>
                )}
              </div>
            ))}
          </div>
          <button
            className="delete-mode-btn"
            onClick={() => setDeleteMode(!deleteMode)}
          >
            {deleteMode ? 'Done' : 'Delete entries'}
          </button>
        </>
      )}
    </div>
  )
}
