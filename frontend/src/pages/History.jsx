import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getAllSessionsForType } from '../lib/dynamodb'
import { useProgram } from '../context/ProgramContext'
import '../styles/History.css'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const RESTORE_KEY = 'history-restore-state'

function readRestoreState() {
  try {
    const raw = sessionStorage.getItem(RESTORE_KEY)
    if (!raw) return null
    sessionStorage.removeItem(RESTORE_KEY)
    return JSON.parse(raw)
  } catch { return null }
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function History() {
  const navigate = useNavigate()
  const { program } = useProgram()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  const now = new Date()

  // Restore from back-navigation if available (cleared immediately so refresh doesn't restore)
  const [restored] = useState(() => readRestoreState())

  const [year, setYear] = useState(restored?.year ?? now.getFullYear())
  const [month, setMonth] = useState(restored?.month ?? now.getMonth())
  const [selectedWeek, setSelectedWeek] = useState(restored?.selectedWeek ?? null)

  // Month picker state
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(year)

  useEffect(() => {
    if (!program) return
    async function load() {
      try {
        const results = await Promise.all(
          Object.keys(program.sessionTypes).map(type => getAllSessionsForType(type))
        )
        const all = results.flat().sort((a, b) => b.date.localeCompare(a.date))
        setSessions(all)
      } catch (e) {
        console.error('Failed to load history:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [program])

  const sessionsByDate = useMemo(() => {
    const map = {}
    for (const s of sessions) {
      if (!map[s.date]) map[s.date] = []
      map[s.date].push(s)
    }
    return map
  }, [sessions])

  const completedDates = useMemo(() => new Set(sessions.map(s => s.date)), [sessions])

  const earliest = useMemo(() => {
    if (sessions.length === 0) return null
    const sorted = sessions.map(s => s.date).sort()
    const [y, m] = sorted[0].split('-').map(Number)
    return { year: y, month: m - 1 }
  }, [sessions])

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
  const isEarliestMonth = earliest
    ? year < earliest.year || (year === earliest.year && month <= earliest.month)
    : true

  // Build week rows for the month
  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startOffset = firstDay.getDay() // 0 = Sunday

    const rows = []
    let current = []

    for (let i = 0; i < startOffset; i++) {
      current.push(null)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      current.push(dateStr)
      if (current.length === 7) {
        rows.push(current)
        current = []
      }
    }
    if (current.length > 0) {
      while (current.length < 7) current.push(null)
      rows.push(current)
    }
    return rows
  }, [year, month])

  // Auto-select current week (or previous week) after data loads — skipped if restoring from back-nav
  useEffect(() => {
    if (loading) return
    if (restored) return
    if (completedDates.size === 0) return
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const currentWeekIdx = weeks.findIndex(row => row.includes(todayStr))
    if (currentWeekIdx === -1) return
    if (weeks[currentWeekIdx].some(d => d && completedDates.has(d))) {
      setSelectedWeek(currentWeekIdx)
    } else if (currentWeekIdx > 0 && weeks[currentWeekIdx - 1].some(d => d && completedDates.has(d))) {
      setSelectedWeek(currentWeekIdx - 1)
    }
  }, [loading])

  function goBack() {
    setSelectedWeek(null)
    setPickerOpen(false)
    if (month === 0) {
      setMonth(11)
      setYear(y => y - 1)
    } else {
      setMonth(m => m - 1)
    }
  }

  function goForward() {
    if (isCurrentMonth) return
    setSelectedWeek(null)
    setPickerOpen(false)
    if (month === 11) {
      setMonth(0)
      setYear(y => y + 1)
    } else {
      setMonth(m => m + 1)
    }
  }

  function selectMonth(y, m) {
    setYear(y)
    setMonth(m)
    setSelectedWeek(null)
    setPickerOpen(false)
  }

  const selectedWeekSessions = useMemo(() => {
    if (selectedWeek == null) return []
    const row = weeks[selectedWeek]
    if (!row) return []
    const out = []
    for (const dateStr of row) {
      if (!dateStr) continue
      if (sessionsByDate[dateStr]) out.push(...sessionsByDate[dateStr])
    }
    return out.sort((a, b) => a.date.localeCompare(b.date))
  }, [selectedWeek, weeks, sessionsByDate])

  function handleCardClick(session) {
    sessionStorage.setItem(RESTORE_KEY, JSON.stringify({ year, month, selectedWeek }))
    navigate(`/history/${session.sessionType}/${session.date}`)
  }

  return (
    <div className="history">
      <button className="back" onClick={() => navigate('/')}>← Back</button>
      <h2>Session History</h2>

      {loading && <p>Loading...</p>}

      {!loading && (
        <>
          <div className="history-nav">
            {!isEarliestMonth ? (
              <button className="history-arrow" onClick={goBack}>←</button>
            ) : (
              <span className="history-arrow history-arrow-hidden">←</span>
            )}
            <button
              className="history-month-label"
              onClick={() => {
                setPickerYear(year)
                setPickerOpen(o => !o)
              }}
            >
              {MONTH_NAMES[month]} {year} ▾
            </button>
            {!isCurrentMonth ? (
              <button className="history-arrow" onClick={goForward}>→</button>
            ) : (
              <span className="history-arrow history-arrow-hidden">→</span>
            )}
          </div>

          {pickerOpen && (
            <div className="month-picker">
              <div className="month-picker-year-nav">
                <button
                  className="month-picker-year-arrow"
                  onClick={() => setPickerYear(y => y - 1)}
                  disabled={earliest && pickerYear <= earliest.year}
                >←</button>
                <span className="month-picker-year-label">{pickerYear}</span>
                <button
                  className="month-picker-year-arrow"
                  onClick={() => setPickerYear(y => y + 1)}
                  disabled={pickerYear >= now.getFullYear()}
                >→</button>
              </div>
              <div className="month-picker-grid">
                {MONTH_ABBR.map((abbr, i) => {
                  const isFuture = pickerYear > now.getFullYear() ||
                    (pickerYear === now.getFullYear() && i > now.getMonth())
                  const isTooEarly = earliest &&
                    (pickerYear < earliest.year || (pickerYear === earliest.year && i < earliest.month))
                  const isActive = pickerYear === year && i === month
                  return (
                    <button
                      key={i}
                      className={`month-picker-cell${isActive ? ' month-picker-cell-active' : ''}`}
                      disabled={isFuture || isTooEarly}
                      onClick={() => selectMonth(pickerYear, i)}
                    >
                      {abbr}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="month-grid-container">
            <div className="month-day-labels">
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="month-day-label">{label}</div>
              ))}
            </div>
            <div className="month-grid">
              {weeks.map((row, wi) => {
                const hasCompleted = row.some(d => d && completedDates.has(d))
                const isSelected = selectedWeek === wi
                return (
                  <div
                    key={wi}
                    className={`month-week${hasCompleted ? ' month-week-clickable' : ''}${isSelected ? ' month-week-selected' : ''}`}
                    onClick={() => {
                      if (!hasCompleted) return
                      setSelectedWeek(isSelected ? null : wi)
                    }}
                  >
                    {row.map((dateStr, di) => {
                      if (!dateStr) return <div key={di} className="month-cell month-cell-empty" />
                      const completed = completedDates.has(dateStr)
                      const day = Number(dateStr.slice(-2))
                      return (
                        <div
                          key={di}
                          className={`month-cell ${completed ? 'month-cell-completed' : 'month-cell-missed'}`}
                        >
                          {day}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {selectedWeekSessions.length > 0 && (
            <div className="history-list">
              {selectedWeekSessions.map(session => {
                const config = program?.sessionTypes[session.sessionType]
                const hasNotes = session.notes && session.notes.trim().length > 0
                return (
                  <div
                    key={`${session.sessionType}-${session.date}`}
                    role="button"
                    tabIndex={0}
                    className="history-card"
                    onClick={() => handleCardClick(session)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(session) }}
                  >
                    <div className="history-card-top">
                      <span className="history-date">{formatDate(session.date)}</span>
                      <span className="history-type">
                        {config?.name || session.sessionType}
                        {session.deload && <span className="deload-badge">Deload</span>}
                      </span>
                    </div>
                    {hasNotes && (
                      <>
                        <hr className="history-card-divider" />
                        <div className="history-card-note">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({ href, children }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {session.notes}
                          </ReactMarkdown>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {sessions.length === 0 && (
            <p className="empty">No sessions logged yet.</p>
          )}
        </>
      )}
    </div>
  )
}
