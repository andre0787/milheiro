'use client'

import Link from 'next/link'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Entry } from '@/types'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { DeleteButton } from '@/components/delete-button'

const columns: ColumnDef<Entry>[] = [
  { accessorKey: 'date', header: 'Data', cell: ({ row }) => formatDate(row.original.date) },
  { accessorKey: 'program_name', header: 'Programa' },
  { accessorKey: 'holder_name', header: 'Titular' },
  { accessorKey: 'points', header: 'Pontos', cell: ({ row }) => formatNumber(row.original.points) },
  { accessorKey: 'cost', header: 'Valor', cell: ({ row }) => formatCurrency(row.original.cost) },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link href={`/entries/${row.original.id}`} className="text-sm text-primary hover:underline">
          Editar
        </Link>
        <DeleteButton apiEndpoint={`/api/entries/${row.original.id}`} />
      </div>
    ),
  },
]

export function EntriesTable({ data }: { data: Entry[] }) {
  return <DataTable columns={columns} data={data} />
}
