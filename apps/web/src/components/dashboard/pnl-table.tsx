'use client'

import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { DashboardSummary } from '@/types'

const columns: ColumnDef<DashboardSummary>[] = [
  { accessorKey: 'mes', header: 'Mês' },
  { accessorKey: 'programa', header: 'Programa' },
  { accessorKey: 'titular', header: 'Titular' },
  {
    accessorKey: 'pts_entradas',
    header: 'Pontos',
    cell: ({ row }) => formatNumber(row.original.pts_entradas),
  },
  {
    accessorKey: 'receita_vendas',
    header: 'Receita',
    cell: ({ row }) => formatCurrency(row.original.receita_vendas),
  },
  {
    accessorKey: 'custo_vendas',
    header: 'Custo',
    cell: ({ row }) => formatCurrency(row.original.custo_vendas),
  },
  {
    accessorKey: 'pnl_liquido',
    header: 'PnL',
    cell: ({ row }) => {
      const val = row.original.pnl_liquido
      return <span className={val >= 0 ? 'text-profit font-medium' : 'text-loss font-medium'}>
        {formatCurrency(val)}
      </span>
    },
  },
]

export function PnLTable({ data }: { data: DashboardSummary[] }) {
  return <DataTable columns={columns} data={data} />
}
