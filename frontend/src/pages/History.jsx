import { useNavigate } from 'react-router-dom'

export default function History() {
  const navigate = useNavigate()
  return (
    <div style={{ padding: '1.5rem' }}>
      <button onClick={() => navigate('/')}>← Back</button>
      <h2>Session History</h2>
      <p>Coming soon.</p>
    </div>
  )
}
