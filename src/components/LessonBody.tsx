import type { ReactNode } from 'react'

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(https:\/\/[^)]+\))/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>
    const link = /^\[([^\]]+)\]\((https:\/\/[^)]+)\)$/.exec(part)
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>
    return part
  })
}

export default function LessonBody({ body }: { body: string }) {
  return <div className="lesson-prose lesson-prose--formatted">{body.split(/\r?\n/).map((line, index) => {
    if (line.startsWith('## ')) return <h2 key={index}>{inline(line.slice(3))}</h2>
    if (line.startsWith('# ')) return <h2 key={index}>{inline(line.slice(2))}</h2>
    if (line.startsWith('- ')) return <p className="lesson-prose__bullet" key={index}>• {inline(line.slice(2))}</p>
    return <p key={index}>{line ? inline(line) : '\u00a0'}</p>
  })}</div>
}
