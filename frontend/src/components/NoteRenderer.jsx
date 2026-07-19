import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const linkComponents = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
      {children}
    </a>
  ),
}

export default function NoteRenderer({ children, className }) {
  if (!children) return null
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={linkComponents}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
