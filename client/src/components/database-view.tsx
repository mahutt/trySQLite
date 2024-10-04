import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import TableView, { Table } from '@/components/table'
import useLocalStorage from 'use-local-storage'
import { Share1Icon, SymbolIcon } from '@radix-ui/react-icons'
import { useState } from 'react'

export interface Database {
  tables: Table[]
}

export default function DatabaseView({
  database,
  databaseId,
  setSyncing,
}: {
  database: Database
  databaseId: string
  setSyncing: (arg0: boolean) => void
}) {
  const [table, setTable] = useLocalStorage<string>(
    'current-table',
    database.tables[0]?.name ?? 'none'
  )
  const [shareText, setShareText] = useState<string>('Share')
  const handleShare = () => {
    const url = new URL(window.location.href)
    const port = url.port ? `:${url.port}` : ''
    const urlToShare = `${url.protocol}//${url.hostname}${port}/${databaseId}`
    navigator.clipboard.writeText(urlToShare)
    setShareText('Copied')
  }

  const handleReset = () => {
    fetch(`${import.meta.env.VITE_API_URL}/api/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ databaseId }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error()
        } else {
          setSyncing(true)
        }
      })
      .catch((error) => console.error('Error resetting database:', error))
  }

  return (
    <>
      <div className="flex flex-row gap-2 my-4">
        <Button
          variant="ghost"
          className="text-gray-500"
          onClick={handleShare}
          onMouseEnter={() => setShareText('Share')}
        >
          <Share1Icon className="w-4 h-4 mr-2" />
          {shareText}
        </Button>
        <Button variant="ghost" className="text-gray-500" onClick={handleReset}>
          <SymbolIcon className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>
      <Tabs
        defaultValue={database.tables[0]?.name ?? 'none'}
        value={table}
        onValueChange={setTable}
        className="w-full shadow-sm border border-gray-200 rounded-xl p-4"
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
    </>
  )
}
