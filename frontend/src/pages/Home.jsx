import { useNavigate } from 'react-router-dom'
import '../styles/Home.css'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="home">
      <h1>Workout Tracker</h1>
      <nav className="home-nav">
        <button onClick={() => navigate('/session/start')}>Start / Resume Session</button>
        <button onClick={() => navigate('/history')}>View Sessions</button>
        <button onClick={() => navigate('/plan')}>View Plan</button>
      </nav>
    </div>
  )
}
