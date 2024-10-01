import { useState, useEffect } from 'react'
import useLocalStorage from 'use-local-storage'
import { QueryTextarea } from './components/query-textarea'
import ResultsView from '@/components/results-view'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RocketIcon } from '@radix-ui/react-icons'

import DatabaseView, { Database } from '@/components/database-view'
import Logs, { Log } from '@/components/logs'
import { Table } from '@/components/table'

function App() {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useLocalStorage<string>('current-tab', 'results')
  const [results, setResults] = useState<Table>({
    name: 'Results',
    columns: [],
    rows: [],
  })
  const [syncing, setSyncing] = useState(true)
  const [database, setDatabase] = useState<Database>({
    tables: [],
  })
  const [logs, setLogs] = useLocalStorage<Log[]>('query-logs', [])

  useEffect(() => {
    if (!syncing) return
    fetch(`${import.meta.env.VITE_API_URL}/api`)
      .then((response) => response.json())
      .then((data) => setDatabase({ tables: data.tables }))
      .catch((error) => console.error('Error fetching data:', error))
      .finally(() => setSyncing(false))
  }, [syncing])

  const runQuery = () => {
    fetch(`${import.meta.env.VITE_API_URL}/api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    })
      .then((response) => response.json())
      .then((data) => {
        const log: Log = { query, executionTime: data.executionTime }
        if (data.error) {
          log.error = data.error
          setTab('logs')
        } else {
          if (data.results.columns && data.results.rows) {
            setResults(data.results)
            setTab('results')
          } else {
            setTab('database')
          }
          setSyncing(true)
        }
        setLogs((logs) => [log, ...(logs ?? [])])
        setQuery('')
      })
      .catch((error) => console.error('Error fetching data:', error))
  }

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <main className="flex flex-col align-center gap-10 py-10">
          <QueryTextarea
            query={query}
            setQuery={setQuery}
            runQuery={runQuery}
          />
          {database.tables.length === 0 && (
            <Alert>
              <RocketIcon className="h-4 w-4" />
              <AlertTitle>No data!</AlertTitle>
              <AlertDescription>
                Start writing queries to populate your database.
              </AlertDescription>
            </Alert>
          )}
          <Tabs
            key="top"
            defaultValue="database"
            value={tab}
            onValueChange={setTab}
          >
            <TabsList>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="database">Database</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>
            <TabsContent value="results">
              <ResultsView results={results} />
            </TabsContent>
            <TabsContent value="database">
              <DatabaseView database={database} />
            </TabsContent>
            <TabsContent value="logs">
              <Logs logs={logs} setLogs={setLogs} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  )
}

export default App
