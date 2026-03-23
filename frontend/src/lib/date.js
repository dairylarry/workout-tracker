/**
 * Returns today's date as YYYY-MM-DD, with the day rolling over at 4am
 * instead of midnight. A session at 1am counts as the previous day.
 */
export function getToday() {
  const now = new Date()
  now.setHours(now.getHours() - 4)
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
