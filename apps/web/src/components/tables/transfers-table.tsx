'use client'

import Link from 'next/link'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Transfer } from '@/types'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { DeleteButton } from '@/components/delete-button'

const columns: ColumnDef<Transfer>[] = [
  { accessorKey: 'date', header: 'Data', cell: ({ row }) => formatDate(row.original.date) },
  { accessorKey: 'from_program_name', header: 'Origem' },
  { accessorKey: 'to_program_name', header: 'Destino' },
  { accessorKey: 'holder_name', header: 'Titular' },
  { accessorKey: 'points_sent', header: 'Enviados', cell: ({ row }) => formatNumber(row.original.points_sent) },
  { accessorKey: 'points_received', header: 'Recebidos', cell: ({ row }) => formatNumber(row.original.points_received) },
  { accessorKey: 'transfer_fee', header: 'Taxa', cell: ({ row }) => formatCurrency(row.original.transfer_fee) },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link href={`/transfers/${row.original.id}`} className="text-sm text-primary hover:underline">
          Editar
        </Link>
        <DeleteButton apiEndpoint={`/api/transfers/${row.original.id}`} />
      </div>
    ),
  },
]

export function TransfersTable({ data }: { data: Transfer[] }) {
  return <DataTable columns={columns} data={data} />
}
