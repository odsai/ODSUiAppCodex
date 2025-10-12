import React, { useMemo } from 'react'
import type { AssetVersion } from '../../store/filesStore'

type DiffLine = {
  type: 'added' | 'removed' | 'context'
  value: string
}

const computeDiff = (previous = '', next = ''): DiffLine[] => {
  const prevLines = previous.split(/\r?\n/)
  const nextLines = next.split(/\r?\n/)
  const diff: DiffLine[] = []
  const max = Math.max(prevLines.length, nextLines.length)
  for (let i = 0; i < max; i += 1) {
    const prevLine = prevLines[i]
    const nextLine = nextLines[i]
    if (prevLine === nextLine) {
      if (typeof nextLine === 'string') diff.push({ type: 'context', value: nextLine })
    } else {
      if (typeof prevLine === 'string') diff.push({ type: 'removed', value: prevLine })
      if (typeof nextLine === 'string') diff.push({ type: 'added', value: nextLine })
    }
  }
  return diff
}

export default function TextDiffViewer({ previousVersion, currentSnippet }: { previousVersion: AssetVersion; currentSnippet: string }) {
  const diff = useMemo(() => computeDiff(previousVersion.textSnippet || '', currentSnippet), [previousVersion.textSnippet, currentSnippet])

  if (!diff.length) {
    return <p className="text-xs text-slate-500">No textual differences detected.</p>
  }

  return (
    <pre className="max-h-48 overflow-auto text-xs leading-5 text-slate-700 dark:text-slate-200">
      {diff.map((line, idx) => (
        <div
          key={`${line.type}-${idx}`}
          className={
            line.type === 'added'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : line.type === 'removed'
              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
              : ''
          }
        >
          {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}
          {line.value}
        </div>
      ))}
    </pre>
  )
}

