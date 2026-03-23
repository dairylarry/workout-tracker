const PREFIX = 'wt:'

export function cacheSession(sessionType, date, data) {
  localStorage.setItem(`${PREFIX}session:${sessionType}:${date}`, JSON.stringify(data))
}

export function getCachedSession(sessionType, date) {
  const item = localStorage.getItem(`${PREFIX}session:${sessionType}:${date}`)
  return item ? JSON.parse(item) : null
}

export function cacheSessions(sessionType, sessions) {
  localStorage.setItem(`${PREFIX}sessions:${sessionType}`, JSON.stringify(sessions))
}

export function getCachedSessions(sessionType) {
  const item = localStorage.getItem(`${PREFIX}sessions:${sessionType}`)
  return item ? JSON.parse(item) : null
}

/**
 * Queue a write operation for when we're back online.
 * Each entry: { action, args, timestamp }
 */
export function queueWrite(action, args) {
  const queue = getWriteQueue()
  queue.push({ action, args, timestamp: Date.now() })
  localStorage.setItem(`${PREFIX}writeQueue`, JSON.stringify(queue))
}

export function getWriteQueue() {
  const item = localStorage.getItem(`${PREFIX}writeQueue`)
  return item ? JSON.parse(item) : []
}

export function clearWriteQueue() {
  localStorage.removeItem(`${PREFIX}writeQueue`)
}
