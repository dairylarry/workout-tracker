import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { cacheSession, getCachedSession, cacheSessions, getCachedSessions, queueWrite } from './offlineCache'

const client = new DynamoDBClient({
  region: import.meta.env.VITE_AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
})

const docClient = DynamoDBDocumentClient.from(client)

const TABLE = 'workout-tracker-db'

export async function getSession(sessionType, date) {
  try {
    const response = await docClient.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `SESSION#${sessionType}`, SK: `DATE#${date}` },
    }))
    const item = response.Item || null
    if (item) cacheSession(sessionType, date, item)
    return item
  } catch (e) {
    console.warn('Offline — loading from cache:', e.message)
    return getCachedSession(sessionType, date)
  }
}

export async function putSession(session) {
  cacheSession(session.sessionType, session.date, session)
  try {
    await docClient.send(new PutCommand({ TableName: TABLE, Item: session }))
  } catch (e) {
    console.warn('Offline — queued putSession:', e.message)
    queueWrite('putSession', [session])
  }
}

export async function updateSessionField(sessionType, date, field, value) {
  // Update local cache
  const cached = getCachedSession(sessionType, date)
  if (cached) {
    cached[field] = value
    cacheSession(sessionType, date, cached)
  }
  try {
    await docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `SESSION#${sessionType}`, SK: `DATE#${date}` },
      UpdateExpression: `SET #field = :value`,
      ExpressionAttributeNames: { '#field': field },
      ExpressionAttributeValues: { ':value': value },
    }))
  } catch (e) {
    console.warn('Offline — queued updateSessionField:', e.message)
    queueWrite('updateSessionField', [sessionType, date, field, value])
  }
}

export async function updateSessionExercises(sessionType, date, exercises) {
  // Update local cache
  const cached = getCachedSession(sessionType, date)
  if (cached) {
    cached.exercises = exercises
    cacheSession(sessionType, date, cached)
  }
  try {
    await docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `SESSION#${sessionType}`, SK: `DATE#${date}` },
      UpdateExpression: 'SET exercises = :exercises',
      ExpressionAttributeValues: { ':exercises': exercises },
    }))
  } catch (e) {
    console.warn('Offline — queued updateSessionExercises:', e.message)
    queueWrite('updateSessionExercises', [sessionType, date, exercises])
  }
}

export async function deleteSession(sessionType, date) {
  try {
    await docClient.send(new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `SESSION#${sessionType}`, SK: `DATE#${date}` },
    }))
  } catch (e) {
    console.warn('Offline — queued deleteSession:', e.message)
    queueWrite('deleteSession', [sessionType, date])
  }
}

export async function getAllSessionsForType(sessionType) {
  try {
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `SESSION#${sessionType}` },
      ScanIndexForward: false,
    }))
    const items = response.Items || []
    cacheSessions(sessionType, items)
    return items
  } catch (e) {
    console.warn('Offline — loading sessions from cache:', e.message)
    return getCachedSessions(sessionType) || []
  }
}

export async function getRecentSessions(sessionType, limit = 3) {
  try {
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `SESSION#${sessionType}` },
      ScanIndexForward: false,
      Limit: limit,
    }))
    return response.Items || []
  } catch (e) {
    console.warn('Offline — loading recent sessions from cache:', e.message)
    const cached = getCachedSessions(sessionType)
    return cached?.slice(0, limit) || []
  }
}

export async function getLastSession(sessionType) {
  try {
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `SESSION#${sessionType}` },
      ScanIndexForward: false,
      Limit: 1,
    }))
    const item = response.Items?.[0] || null
    return item
  } catch (e) {
    console.warn('Offline — loading last session from cache:', e.message)
    const cached = getCachedSessions(sessionType)
    return cached?.[0] || null
  }
}

// --- Bodyweight ---

export async function putBodyweight(date, weight, weightUnit, timeOfDay) {
  const item = { PK: 'BODYWEIGHT', SK: `DATE#${date}`, date, weight, weightUnit, timeOfDay }
  try {
    await docClient.send(new PutCommand({ TableName: TABLE, Item: item }))
  } catch (e) {
    console.warn('Offline — queued putBodyweight:', e.message)
    queueWrite('putBodyweight', [date, weight, weightUnit])
  }
}

export async function deleteBodyweight(date) {
  try {
    await docClient.send(new DeleteCommand({
      TableName: TABLE,
      Key: { PK: 'BODYWEIGHT', SK: `DATE#${date}` },
    }))
  } catch (e) {
    console.warn('Offline — queued deleteBodyweight:', e.message)
    queueWrite('deleteBodyweight', [date])
  }
}

export async function getAllBodyweights() {
  try {
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'BODYWEIGHT' },
      ScanIndexForward: false,
    }))
    return response.Items || []
  } catch (e) {
    console.warn('Offline — failed to load bodyweights:', e.message)
    return []
  }
}

// --- 5/3/1 Config ---

export async function get531Config(exercise) {
  try {
    const response = await docClient.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: '531_CONFIG', SK: `EXERCISE#${exercise}` },
    }))
    return response.Item || null
  } catch (e) {
    console.warn('Offline — failed to load 531 config:', e.message)
    return null
  }
}

export async function put531Config(exercise, trainingMax, history) {
  const item = {
    PK: '531_CONFIG',
    SK: `EXERCISE#${exercise}`,
    type: '531_CONFIG',
    exercise,
    trainingMax,
    history,
  }
  try {
    await docClient.send(new PutCommand({ TableName: TABLE, Item: item }))
  } catch (e) {
    console.warn('Offline — queued put531Config:', e.message)
    queueWrite('put531Config', [exercise, trainingMax, history])
  }
}

// --- Program Config ---

const PROGRAM_PK = 'PROGRAM#spring2026'

export async function getSessionType(sessionTypeId) {
  try {
    const response = await docClient.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: PROGRAM_PK, SK: `SESSION_TYPE#${sessionTypeId}` },
    }))
    return response.Item || null
  } catch (e) {
    console.warn('Failed to load session type:', e.message)
    return null
  }
}

export async function getAllSessionTypes() {
  try {
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': PROGRAM_PK, ':prefix': 'SESSION_TYPE#' },
    }))
    return response.Items || []
  } catch (e) {
    console.warn('Failed to load session types:', e.message)
    return []
  }
}

export async function putSessionType(sessionTypeId, data) {
  const item = {
    PK: PROGRAM_PK,
    SK: `SESSION_TYPE#${sessionTypeId}`,
    ...data,
  }
  try {
    await docClient.send(new PutCommand({ TableName: TABLE, Item: item }))
  } catch (e) {
    console.warn('Failed to save session type:', e.message)
  }
}

export async function updateSessionTypeSubs(sessionTypeId, exerciseName, subs) {
  // Load current session type, update the subs for one exercise, save back
  const current = await getSessionType(sessionTypeId)
  if (!current) return
  const exercises = current.exercises.map(ex => {
    if (ex.name !== exerciseName) return ex
    return { ...ex, subs }
  })
  await putSessionType(sessionTypeId, { ...current, exercises, PK: undefined, SK: undefined })
}

// --- Exercise Library ---

export async function getExerciseLibrary() {
  try {
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'EXERCISE_LIB' },
    }))
    return response.Items || []
  } catch (e) {
    console.warn('Failed to load exercise library:', e.message)
    return []
  }
}

export async function putExercise(exercise) {
  const item = {
    PK: 'EXERCISE_LIB',
    SK: `EXERCISE#${exercise.name.toLowerCase().replace(/\s+/g, '-')}`,
    ...exercise,
  }
  try {
    await docClient.send(new PutCommand({ TableName: TABLE, Item: item }))
  } catch (e) {
    console.warn('Failed to save exercise:', e.message)
  }
}

export async function updateExerciseMeta(exercise) {
  const sk = `EXERCISE#${exercise.name.toLowerCase().replace(/\s+/g, '-')}`
  try {
    await docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: 'EXERCISE_LIB', SK: sk },
      UpdateExpression: 'SET muscleGroups = :mg, family = :fam, defaultRepRange = :rr, defaultSets = :ds, createdAt = if_not_exists(createdAt, :ca)',
      ExpressionAttributeValues: {
        ':mg': exercise.muscleGroups,
        ':fam': exercise.family ?? null,
        ':rr': exercise.defaultRepRange ?? null,
        ':ds': exercise.defaultSets ?? null,
        ':ca': new Date().toISOString().split('T')[0],
      },
    }))
  } catch (e) {
    console.warn('Failed to update exercise meta:', e.message)
  }
}

export async function deleteExercise(exerciseName) {
  try {
    await docClient.send(new DeleteCommand({
      TableName: TABLE,
      Key: { PK: 'EXERCISE_LIB', SK: `EXERCISE#${exerciseName.toLowerCase().replace(/\s+/g, '-')}` },
    }))
  } catch (e) {
    console.warn('Failed to delete exercise:', e.message)
  }
}

// --- Exercise History ---

export async function updateExerciseHistory(exerciseName, historyEntry) {
  const sk = `EXERCISE#${exerciseName.toLowerCase().replace(/\s+/g, '-')}`
  try {
    const response = await docClient.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: 'EXERCISE_LIB', SK: sk },
    }))
    const exercise = response.Item
    if (!exercise) return

    // Remove existing entry for same date+sessionType+slotIndex
    let history = (exercise.history || []).filter(h =>
      !(h.date === historyEntry.date && h.sessionType === historyEntry.sessionType && h.slotIndex === historyEntry.slotIndex)
    )

    // Prepend new entry, cap at 20
    history = [historyEntry, ...history].slice(0, 20)

    await docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: 'EXERCISE_LIB', SK: sk },
      UpdateExpression: 'SET history = :history',
      ExpressionAttributeValues: { ':history': history },
    }))
  } catch (e) {
    console.warn('Failed to update exercise history:', e.message)
  }
}

/**
 * One-time backfill: reads all sessions from DynamoDB and populates exercise history.
 * Call from browser console: import('/src/lib/dynamodb.js').then(m => m.backfillExerciseHistory())
 */
export async function backfillExerciseHistory() {
  const sessionTypes = ['lower-a', 'upper-a', 'lower-b', 'upper-b']
  let totalUpdates = 0

  for (const st of sessionTypes) {
    const sessions = await getRecentSessions(st, 50)
    for (const session of sessions) {
      if (!session.exercises) continue
      for (let i = 0; i < session.exercises.length; i++) {
        const ex = session.exercises[i]
        if (!ex.sets || ex.sets.length === 0) continue
        const exerciseName = ex.swappedName || ex.name
        const historyEntry = {
          date: session.date,
          sessionType: st,
          slotIndex: i,
          sets: ex.sets,
          weightUnit: ex.weightUnit || 'lbs',
        }
        await updateExerciseHistory(exerciseName, historyEntry)
        totalUpdates++
        console.log(`Backfilled: ${exerciseName} (${st} / ${session.date})`)
      }
    }
  }
  console.log(`Backfill complete. ${totalUpdates} exercise history entries updated.`)
}

/**
 * Flush any queued writes from offline usage.
 * Call this when the app detects it's back online.
 */
export async function flushWriteQueue() {
  const { getWriteQueue, clearWriteQueue } = await import('./offlineCache')
  const queue = getWriteQueue()
  if (queue.length === 0) return

  const actions = { putSession, updateSessionField, updateSessionExercises, deleteSession, putBodyweight, deleteBodyweight, put531Config }

  for (const entry of queue) {
    try {
      await actions[entry.action](...entry.args)
    } catch (e) {
      console.error('Failed to flush queued write:', e)
      return // stop flushing on failure, try again later
    }
  }
  clearWriteQueue()
  console.log(`Flushed ${queue.length} queued writes`)
}
