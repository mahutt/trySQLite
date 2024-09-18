import { useState, useEffect } from 'react'
import TableView, { Table } from './components/table'
import { QueryTextarea } from './components/query-textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RocketIcon } from '@radix-ui/react-icons'

interface Database {
  tables: Table[]
}

function App() {
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [database, setDatabase] = useState<Database>({
    tables: [],
  })

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api`)
      .then((response) => response.json())
      .then((data) => setDatabase({ tables: data.tables }))
      .catch((error) => console.error('Error fetching data:', error))
  }, [])

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
        if (data.error) {
          setError(data.error)
        } else {
          setError('')
          setDatabase({ tables: data.tables })
        }
        setQuery('')
      })
      .catch((error) => console.error('Error fetching data:', error))
  }

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <main className="flex flex-col align-center gap-10 py-10">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
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
            key={database.tables[0]?.name ?? 'none'}
            defaultValue={database.tables[0]?.name ?? 'none'}
            className="w-full"
          >
            <TabsList>
              {database.tables.map((table) => (
                <TabsTrigger key={table.name} value={table.name}>
                  {table.name}
                </TabsTrigger>
              ))}
              {database.tables.length === 0 && (
                <TabsTrigger value="none" disabled>
                  No tables
                </TabsTrigger>
              )}
            </TabsList>
            {database.tables.map((table) => (
              <TabsContent key={table.name} value={table.name}>
                <TableView table={table} />
              </TabsContent>
            ))}
          </Tabs>
        </main>
      </div>
    </>
  )
}

export default App
