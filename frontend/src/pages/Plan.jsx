import { useNavigate } from 'react-router-dom'

export default function Plan() {
  const navigate = useNavigate()
  return (
    <div style={{ padding: '1.5rem' }}>
      <button onClick={() => navigate('/')}>← Back</button>
      <h2>View Plan</h2>
      <p>Coming soon.</p>
    </div>
  )
}
