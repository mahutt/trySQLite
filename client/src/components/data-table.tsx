import * as React from 'react'

import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { Table as TableType } from './table'

interface DataTableProps {
  table: TableType
}

export function DataTable({ table }: DataTableProps) {
  const columns: ColumnDef<any>[] = table.columns.map((columnName) => ({
    accessorKey: columnName,
    header: ({ column }) => {
      return (
        <div
          className="cursor-pointer"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {columnName}
        </div>
      )
    },
  }))

  const [sorting, setSorting] = React.useState<SortingState>([])
  const t = useReactTable({
    data: table.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  })

  return (
    <Table>
      <TableHeader>
        {t.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              return (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              )
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {t.getRowModel().rows?.length ? (
          t.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() && 'selected'}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="text-gray-500 text-center"
            >
              This table is empty.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
