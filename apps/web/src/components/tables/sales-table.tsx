'use client'

import Link from 'next/link'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Sale } from '@/types'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { DeleteButton } from '@/components/delete-button'
import { ReceivedToggle } from '@/components/received-toggle'

const columns: ColumnDef<Sale>[] = [
  { accessorKey: 'date', header: 'Data', cell: ({ row }) => formatDate(row.original.date) },
  { accessorKey: 'program_name', header: 'Programa' },
  { accessorKey: 'buyer_name', header: 'Comprador' },
  { accessorKey: 'holder_name', header: 'Titular' },
  {
    id: 'viajantes',
    header: 'Viajantes',
    cell: ({ row }) => {
      const names = row.original.cpf_names
      if (!names || names.length === 0) return '-'
      return <span className="text-sm">{names.join(', ')}</span>
    },
  },
  { accessorKey: 'points_sold', header: 'Pontos', cell: ({ row }) => formatNumber(row.original.points_sold) },
  { accessorKey: 'sale_value', header: 'Valor', cell: ({ row }) => formatCurrency(row.original.sale_value) },
  {
    accessorKey: 'profit_final',
    header: 'Lucro',
    cell: ({ row }) => {
      const val = row.original.profit_final
      if (val === null) return '-'
      return <span className={val >= 0 ? 'text-profit' : 'text-loss'}>{formatCurrency(val)}</span>
    },
  },
  {
    id: 'received',
    header: 'Status',
    cell: ({ row }) => (
      <ReceivedToggle saleId={row.original.id} received={row.original.received ?? false} />
    ),
  },
  {
    id: 'ticket',
    header: 'Bilhete',
    cell: ({ row }) => {
      const id = row.original.ticket_id
      const code = row.original.ticket_code
      if (id) {
        return (
          <Link href={`/tickets/${id}`} className="text-sm text-primary hover:underline">
            {code || 'Ver bilhete'}
          </Link>
        )
      }
      return <span className="text-sm text-muted-foreground">-</span>
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link href={`/sales/${row.original.id}`} className="text-sm text-primary hover:underline">
          Editar
        </Link>
        <DeleteButton apiEndpoint={`/api/sales/${row.original.id}`} />
      </div>
    ),
  },
]

export function SalesTable({ data }: { data: Sale[] }) {
  return <DataTable columns={columns} data={data} />
}
