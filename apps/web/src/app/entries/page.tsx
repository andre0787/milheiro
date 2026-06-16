import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Entry } from '@/types'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'

const columns: ColumnDef<Entry>[] = [
  { accessorKey: 'date', header: 'Data', cell: ({ row }) => formatDate(row.original.date) },
  { accessorKey: 'program_name', header: 'Programa' },
  { accessorKey: 'holder_name', header: 'Titular' },
  { accessorKey: 'points', header: 'Pontos', cell: ({ row }) => formatNumber(row.original.points) },
  { accessorKey: 'cost', header: 'Valor', cell: ({ row }) => formatCurrency(row.original.cost) },
]

export default async function EntriesPage() {
  const supabase = await createClient()
  const { data: entries } = await supabase
    .from('entries')
    .select('*, programs:program_id(name), holders:holder_id(name)')
    .order('date', { ascending: false })

  const mapped = (entries ?? []).map((e) => ({
    ...e,
    program_name: (e.programs as { name: string } | null)?.name ?? '-',
    holder_name: (e.holders as { name: string } | null)?.name ?? '-',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Entradas</h1>
        <Button render={<Link href="/entries/new" />}>Nova Entrada</Button>
      </div>
      <DataTable columns={columns} data={mapped} />
    </div>
  )
}
