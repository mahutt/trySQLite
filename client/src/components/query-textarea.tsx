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
    if (e.key === 'Enter') {
      runQuery()
    } else if (e.key === ' ') {
      if (query.trim() === '') return
      const words = query.split(' ')
      const lastWord = words[words.length - 1]
      if (keywords.has(lastWord.toUpperCase())) {
        words[words.length - 1] = lastWord.toUpperCase()
        setQuery(words.join(' '))
      }
    }
  }
  return (
    <Textarea
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="Enter a query"
    />
  )
}
