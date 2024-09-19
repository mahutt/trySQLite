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
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
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
    }
  }
  return (
    <Textarea
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="Enter a query"
      style={{ fontFamily: 'monospace' }}
    />
  )
}
