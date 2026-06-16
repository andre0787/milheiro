'use client'

import Link from 'next/link'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Ticket } from '@/types'
import { formatDate } from '@/lib/utils'
import { DeleteButton } from '@/components/delete-button'

const columns: ColumnDef<Ticket>[] = [
  { accessorKey: 'issued_at', header: 'Data', cell: ({ row }) => formatDate(row.original.issued_at) },
  { accessorKey: 'program_name', header: 'Programa' },
  {
    id: 'cpfs',
    header: 'Viajantes',
    cell: ({ row }) => {
      const names = row.original.cpf_names
      if (!names || names.length === 0) return '-'
      return <span className="text-sm">{names.join(', ')}</span>
    },
  },
  { accessorKey: 'holder_name', header: 'Titular' },
  { accessorKey: 'ticket_info', header: 'Código' },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link href={`/tickets/${row.original.id}`} className="text-sm text-primary hover:underline">
          Editar
        </Link>
        <DeleteButton apiEndpoint={`/api/tickets/${row.original.id}`} />
      </div>
    ),
  },
]

export function TicketsTable({ data }: { data: Ticket[] }) {
  return <DataTable columns={columns} data={data} searchable />
}
