import TableView, { Table } from '@/components/table'

export default function ResultsView({ results }: { results: Table }) {
  return <TableView table={results} />
}
