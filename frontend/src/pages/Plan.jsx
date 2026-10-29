import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import planContent from '../data/fall-2026.md?raw'
import '../styles/Plan.css'

export default function Plan() {
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
          a({ node, href, children, ...props }) {
            if (href?.startsWith('/')) {
              return <a href={href} onClick={e => { e.preventDefault(); navigate(href) }} {...props}>{children}</a>
            }
            return <a href={href} {...props}>{children}</a>
          },
        }}
      >
        {planContent}
      </ReactMarkdown>
    </div>
  )
}
