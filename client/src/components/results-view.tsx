import { Table } from '@/components/table'
import { DataTable } from './data-table'

export default function ResultsView({ results }: { results: Table }) {
  if (results.columns.length === 0) {
    return (
      <div className="flex justify-center py-6">
        <p className="text-slate-500">Write a query to populate this space.</p>
      </div>
    )
  }
  return <DataTable table={results} />
}
