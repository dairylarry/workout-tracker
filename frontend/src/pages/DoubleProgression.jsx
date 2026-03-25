import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import content from '../static/progression-guide.md?raw'
import '../styles/DoubleProgression.css'

const components = {
  table: ({ node, ...props }) => (
    <div className="table-wrap"><table {...props} /></div>
  ),
}

export default function DoubleProgression() {
  const navigate = useNavigate()
  return (
    <div className="dp">
      <button className="back" onClick={() => navigate('/')}>← Back</button>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>{content}</ReactMarkdown>
    </div>
  )
}
