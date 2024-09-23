import { useState, useRef } from 'react'
import { Textarea } from '@/components/ui/textarea'
import keywords from '@/lib/keywords'

interface QueryTextareaProps {
  query: string
  setQuery: (query: string) => void
  runQuery: () => void
}

export function QueryTextarea({
  query,
  setQuery,
  runQuery,
}: QueryTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cursorAtStart = (): boolean => {
    const textarea = textareaRef.current
    if (!textarea) return false
    const cursorPosition = textarea.selectionStart
    return cursorPosition === 0
  }
  const cursorAtEnd = (): boolean => {
    const textarea = textareaRef.current
    if (!textarea) return false
    const cursorPosition = textarea.selectionStart
    const textLength = textarea.value.length
    return cursorPosition === textLength
  }

  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      setHistory((history) => [query, ...history])
      setHistoryIndex(-1)
      runQuery()
    } else if (e.key === ' ' || e.key === 'Enter') {
      if (query.trim() === '') return
      const parts = query.split(/(\s+)/)
      for (let i = 0; i < parts.length; i += 2) {
        const word = parts[i]
        if (keywords.has(word.toUpperCase())) {
          parts[i] = word.toUpperCase()
        }
      }
      setQuery(parts.join(''))
    } else if (e.key === 'Tab') {
      e.preventDefault()
      setQuery(query + '\t')
    } else if (e.key === 'ArrowUp' && cursorAtStart()) {
      if (historyIndex !== history.length - 1) {
        const index = historyIndex + 1
        setQuery(history[index])
        setHistoryIndex(index)
      }
    } else if (e.key === 'ArrowDown' && cursorAtEnd()) {
      if (historyIndex === 0) {
        setQuery('')
        setHistoryIndex(-1)
      } else if (historyIndex > 0) {
        const index = historyIndex - 1
        setQuery(history[index])
        setHistoryIndex(index)
      }
    }
  }

  return (
    <Textarea
      ref={textareaRef}
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="Enter a query"
      style={{ fontFamily: 'monospace' }}
    />
  )
}
