import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Transfer } from '@/types'
import { formatCurrency, formatNumber } from '@/lib/utils'

const columns: ColumnDef<Transfer>[] = [
  { accessorKey: 'date', header: 'Data' },
  { accessorKey: 'from_program_name', header: 'Origem' },
  { accessorKey: 'to_program_name', header: 'Destino' },
  { accessorKey: 'points_sent', header: 'Enviados', cell: ({ row }) => formatNumber(row.original.points_sent) },
  { accessorKey: 'points_received', header: 'Recebidos', cell: ({ row }) => formatNumber(row.original.points_received) },
  { accessorKey: 'transfer_fee', header: 'Taxa', cell: ({ row }) => formatCurrency(row.original.transfer_fee) },
]

export default async function TransfersPage() {
  const supabase = await createClient()
  const { data: transfers } = await supabase
    .from('transfers')
    .select('*, from_programs:from_program_id(name), to_programs:to_program_id(name), holders:holder_id(name)')
    .order('date', { ascending: false })

  const mapped = (transfers ?? []).map((t) => ({
    ...t,
    from_program_name: (t.from_programs as { name: string } | null)?.name ?? '-',
    to_program_name: (t.to_programs as { name: string } | null)?.name ?? '-',
    holder_name: (t.holders as { name: string } | null)?.name ?? '-',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Transferências</h1>
        <Button render={<Link href="/transfers/new" />}>Nova Transferência</Button>
      </div>
      <DataTable columns={columns} data={mapped} />
    </div>
  )
}
