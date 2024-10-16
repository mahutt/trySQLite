import { useState, useEffect } from 'react'
import useLocalStorage from 'use-local-storage'
import { QueryTextarea } from './components/query-textarea'
import ResultsView from '@/components/results-view'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowTopRightIcon, RocketIcon } from '@radix-ui/react-icons'

import DatabaseView, { Database } from '@/components/database-view'
import Logs, { Log } from '@/components/logs'
import { Table } from '@/components/table'

function App() {
  const [databaseId, setDatabaseId] = useLocalStorage<string>('database-id', '')
  const [query, setQuery] = useState('')
  const [tab, setTab] = useLocalStorage<string>('current-tab', 'results')
  const [results, setResults] = useState<Table>({
    name: 'Results',
    columns: [],
    rows: [],
  })
  const [syncing, setSyncing] = useState(false)
  const [database, setDatabase] = useState<Database>({
    tables: [],
  })
  const [logs, setLogs] = useLocalStorage<Log[]>('query-logs', [])

  const runQuery = () => {
    fetch(`${import.meta.env.VITE_API_URL}/api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ databaseId, query }),
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

  useEffect(() => {
    const url = new URL(window.location.href)
    const path = url.pathname
    const sharedDatabaseId = path.startsWith('/') ? path.slice(1) : path
    if (sharedDatabaseId && sharedDatabaseId !== databaseId) {
      setDatabaseId(sharedDatabaseId)
    } else if (databaseId === '') {
      fetch(`${import.meta.env.VITE_API_URL}/api/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then((response) => {
        if (response.ok) {
          response.json().then((data) => {
            setDatabaseId(data.databaseId)
          })
        }
      })
    } else {
      setSyncing(true)
    }
  }, [databaseId])

  useEffect(() => {
    if (!syncing) return
    fetch(`${import.meta.env.VITE_API_URL}/api?databaseId=${databaseId}`)
      .then((response) => {
        if (response.status === 404) {
          setDatabaseId('')
          throw new Error('Previous database has gone stale')
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then((data) => setDatabase({ tables: data.tables }))
      .catch((error) => console.error('Error fetching data:', error))
      .finally(() => setSyncing(false))
  }, [syncing])

  return (
    <>
      <div className="h-screen max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-between">
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
              <DatabaseView
                database={database}
                databaseId={databaseId}
                setSyncing={setSyncing}
              />
            </TabsContent>
            <TabsContent value="logs">
              <Logs logs={logs} setLogs={setLogs} />
            </TabsContent>
          </Tabs>
        </main>
        <div className="flex justify-center items-center text-gray-400 py-2">
          <a
            href="https://github.com/mahutt/trySQLite"
            target="_blank"
            className="group underline hover:text-blue-500 cursor-pointer flex items-center"
          >
            Source Code
            <ArrowTopRightIcon className="h-4 w-4 ml-1 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </>
  )
}

export default App
