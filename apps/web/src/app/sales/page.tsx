import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Sale } from '@/types'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'

const columns: ColumnDef<Sale>[] = [
  { accessorKey: 'date', header: 'Data', cell: ({ row }) => formatDate(row.original.date) },
  { accessorKey: 'program_name', header: 'Programa' },
  { accessorKey: 'points_sold', header: 'Pontos', cell: ({ row }) => formatNumber(row.original.points_sold) },
  { accessorKey: 'sale_value', header: 'Valor', cell: ({ row }) => formatCurrency(row.original.sale_value) },
  {
    accessorKey: 'profit_final',
    header: 'Lucro',
    cell: ({ row }) => {
      const val = row.original.profit_final
      if (val === null) return '-'
      return <span className={val >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(val)}</span>
    },
  },
]

export default async function SalesPage() {
  const supabase = await createClient()
  const { data: sales } = await supabase
    .from('sales')
    .select('*, programs:program_id(name), holders:holder_id(name)')
    .order('date', { ascending: false })

  const mapped = (sales ?? []).map((s) => ({
    ...s,
    program_name: (s.programs as { name: string } | null)?.name ?? '-',
    holder_name: (s.holders as { name: string } | null)?.name ?? '-',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Vendas</h1>
        <Button render={<Link href="/sales/new" />}>Nova Venda</Button>
      </div>
      <DataTable columns={columns} data={mapped} />
    </div>
  )
}
