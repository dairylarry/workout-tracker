import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb'
import '../styles/Home.css'

export default function Home() {
  const navigate = useNavigate()
  const [dbStatus, setDbStatus] = useState(null)

  async function testConnection() {
    setDbStatus('testing...')
    try {
      const client = new DynamoDBClient({
        region: import.meta.env.VITE_AWS_REGION,
        credentials: {
          accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
          secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
        },
      })
      const response = await client.send(new ListTablesCommand({}))
      setDbStatus(`Connected. Tables: ${response.TableNames.join(', ')}`)
    } catch (e) {
      setDbStatus(`Error: ${e.message}`)
    }
  }

  return (
    <div className="home">
      <h1>Workout Tracker</h1>
      <nav className="home-nav">
        <button onClick={() => navigate('/session/start')}>Start Session</button>
        <button onClick={() => navigate('/session/resume')}>Resume / Edit Session</button>
        <button onClick={() => navigate('/history')}>View Sessions</button>
        <button onClick={() => navigate('/plan')}>View Plan</button>
        <button onClick={testConnection}>Test DB Connection</button>
      </nav>
      {dbStatus && <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>{dbStatus}</p>}
    </div>
  )
}
