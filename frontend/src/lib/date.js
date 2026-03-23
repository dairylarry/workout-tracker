/**
 * Returns today's date as YYYY-MM-DD, with the day rolling over at 4am
 * instead of midnight. A session at 1am counts as the previous day.
 */
export function getToday() {
  const now = new Date()
  now.setHours(now.getHours() - 4)
  return now.toISOString().split('T')[0]
}
