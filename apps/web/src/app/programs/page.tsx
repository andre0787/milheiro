import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Program } from '@/types'

const columns: ColumnDef<Program>[] = [
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'slug', header: 'Slug' },
  { accessorKey: 'emission_limit', header: 'Limite Emissão' },
  { accessorKey: 'limit_window_type', header: 'Janela' },
  {
    id: 'actions',
    cell: ({ row }) => (
      <Link href={`/programs/${row.original.id}`} className="text-sm text-blue-600 hover:underline">
        Editar
      </Link>
    ),
  },
]

export default async function ProgramsPage() {
  const supabase = await createClient()
  const { data: programs } = await supabase.from('programs').select('*').order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Programas</h1>
        <Button render={<Link href="/programs/new" />}>Novo Programa</Button>
      </div>
      <DataTable columns={columns} data={programs ?? []} />
    </div>
  )
}
