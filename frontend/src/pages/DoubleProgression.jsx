import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import progressionContent from '../data/progression-guide_2026-10-28.md?raw'
import '../styles/Plan.css'

export default function DoubleProgression() {
  const navigate = useNavigate()
  return (
    <div className="plan">
      <button className="back" onClick={() => navigate('/')}>← Back</button>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table({ node, ...props }) {
            return <div className="table-wrap"><table {...props} /></div>
          },
        }}
      >
        {progressionContent}
      </ReactMarkdown>
    </div>
  )
}
