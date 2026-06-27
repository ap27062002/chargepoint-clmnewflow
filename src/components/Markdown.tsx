// Minimal, safe markdown renderer for agent messages (bold, lists, headings, code, line breaks).
import { Fragment } from 'react'

function inline(text: string, key: number) {
  // split on **bold** and `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return (
    <Fragment key={key}>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
        if (p.startsWith('`') && p.endsWith('`')) return <code key={i}>{p.slice(1, -1)}</code>
        return <Fragment key={i}>{p}</Fragment>
      })}
    </Fragment>
  )
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: JSX.Element[] = []
  let list: string[] = []
  let k = 0
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${k++}`}>
          {list.map((li, i) => <li key={i}>{inline(li, i)}</li>)}
        </ul>,
      )
      list = []
    }
  }
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      list.push(line.replace(/^\s*(?:[-*]|\d+\.)\s+/, ''))
    } else if (line.startsWith('### ')) {
      flush(); blocks.push(<h3 key={`h-${k++}`}>{inline(line.slice(4), 0)}</h3>)
    } else if (line === '') {
      flush()
    } else {
      flush(); blocks.push(<p key={`p-${k++}`}>{inline(line, 0)}</p>)
    }
  }
  flush()
  return <div className="markdown text-[13.5px] leading-relaxed text-slate-700">{blocks}</div>
}
