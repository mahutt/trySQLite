import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TableView, { Table } from '@/components/table'
import useLocalStorage from 'use-local-storage'

export interface Database {
  tables: Table[]
}

export default function DatabaseView({ database }: { database: Database }) {
  const [table, setTable] = useLocalStorage<string>(
    'current-table',
    database.tables[0]?.name ?? 'none'
  )
  return (
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
  )
}
