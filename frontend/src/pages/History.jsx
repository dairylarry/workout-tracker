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
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

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
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedWeek, setSelectedWeek] = useState(null)

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

  // Auto-select current week (or previous week) after data loads
  useEffect(() => {
    if (loading) return
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const currentWeekIdx = weeks.findIndex(row => row.includes(todayStr))
    if (currentWeekIdx === -1) return
    if (weeks[currentWeekIdx].some(d => d && completedDates.has(d))) {
      setSelectedWeek(currentWeekIdx)
    } else if (currentWeekIdx > 0 && weeks[currentWeekIdx - 1].some(d => d && completedDates.has(d))) {
      setSelectedWeek(currentWeekIdx - 1)
    }
  }, [loading])

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

  function goBack() {
    setSelectedWeek(null)
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
    if (month === 11) {
      setMonth(0)
      setYear(y => y + 1)
    } else {
      setMonth(m => m + 1)
    }
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
            <span className="history-month-label">{MONTH_NAMES[month]} {year}</span>
            {!isCurrentMonth ? (
              <button className="history-arrow" onClick={goForward}>→</button>
            ) : (
              <span className="history-arrow history-arrow-hidden">→</span>
            )}
          </div>

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
                    onClick={() => navigate(`/history/${session.sessionType}/${session.date}`)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/history/${session.sessionType}/${session.date}`) }}
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

          {!loading && sessions.length === 0 && (
            <p className="empty">No sessions logged yet.</p>
          )}
        </>
      )}
    </div>
  )
}
