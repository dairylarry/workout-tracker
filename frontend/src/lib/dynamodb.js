import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'

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
  const response = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `SESSION#${sessionType}`, SK: `DATE#${date}` },
  }))
  return response.Item || null
}

export async function putSession(session) {
  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: session,
  }))
}

export async function updateSessionField(sessionType, date, field, value) {
  await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `SESSION#${sessionType}`, SK: `DATE#${date}` },
    UpdateExpression: `SET #field = :value`,
    ExpressionAttributeNames: { '#field': field },
    ExpressionAttributeValues: { ':value': value },
  }))
}

export async function updateSessionExercises(sessionType, date, exercises) {
  await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `SESSION#${sessionType}`, SK: `DATE#${date}` },
    UpdateExpression: 'SET exercises = :exercises',
    ExpressionAttributeValues: { ':exercises': exercises },
  }))
}

export async function deleteSession(sessionType, date) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { PK: `SESSION#${sessionType}`, SK: `DATE#${date}` },
  }))
}

export async function getAllSessionsForType(sessionType) {
  const response = await docClient.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': `SESSION#${sessionType}` },
    ScanIndexForward: false,
  }))
  return response.Items || []
}

export async function getLastSession(sessionType) {
  const response = await docClient.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': `SESSION#${sessionType}` },
    ScanIndexForward: false,
    Limit: 1,
  }))
  return response.Items?.[0] || null
}
