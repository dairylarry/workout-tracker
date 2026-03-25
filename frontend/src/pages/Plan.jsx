import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Children, isValidElement } from 'react'
import content from '../static/spring-2026.md?raw'
import '../styles/Plan.css'

const components = {
  table: ({ node, ...props }) => (
    <div className="table-wrap"><table {...props} /></div>
  ),
  p: ({ children, ...props }) => {
    const arr = Children.toArray(children)
    const isNote = arr.length === 1 && isValidElement(arr[0]) && arr[0].type === 'em'
    return <p className={isNote ? 'plan-note' : undefined} {...props}>{children}</p>
  },
}

export default function Plan() {
  const navigate = useNavigate()
  return (
    <div className="plan">
      <button className="back" onClick={() => navigate('/')}>← Back</button>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{content}</ReactMarkdown>
    </div>
  )
}
