import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Emission } from '@/types'
import { formatDate } from '@/lib/utils'

const columns: ColumnDef<Emission>[] = [
  { accessorKey: 'issued_at', header: 'Data', cell: ({ row }) => formatDate(row.original.issued_at) },
  { accessorKey: 'program_name', header: 'Programa' },
  { accessorKey: 'cpf_name', header: 'Passageiro' },
  { accessorKey: 'holder_name', header: 'Titular' },
  { accessorKey: 'ticket_info', header: 'Passagem' },
]

export default async function EmissionsPage() {
  const supabase = await createClient()
  const { data: emissions } = await supabase
    .from('emissions')
    .select('*, programs:program_id(name), cpfs:cpf_id(name, document), holders:holder_id(name)')
    .order('issued_at', { ascending: false })

  const mapped = (emissions ?? []).map((e) => ({
    ...e,
    program_name: (e.programs as { name: string } | null)?.name ?? '-',
    cpf_name: (e.cpfs as { name: string; document: string } | null)?.name ?? '-',
    cpf_document: (e.cpfs as { name: string; document: string } | null)?.document ?? '-',
    holder_name: (e.holders as { name: string } | null)?.name ?? '-',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Emissões</h1>
        <Button render={<Link href="/emissions/new" />}>Nova Emissão</Button>
      </div>
      <DataTable columns={columns} data={mapped} />
    </div>
  )
}
