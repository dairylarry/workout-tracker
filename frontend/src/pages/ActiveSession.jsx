import { useParams, useNavigate } from 'react-router-dom'

export default function ActiveSession() {
  const { sessionType, date } = useParams()
  const navigate = useNavigate()
  return (
    <div style={{ padding: '1.5rem' }}>
      <button onClick={() => navigate('/')}>← Back</button>
      <h2>{sessionType} — {date}</h2>
      <p>Coming soon.</p>
    </div>
  )
}
