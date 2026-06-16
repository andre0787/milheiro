import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Holder } from '@/types'

const columns: ColumnDef<Holder>[] = [
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'nickname', header: 'Apelido' },
  {
    id: 'actions',
    cell: ({ row }) => (
      <Link href={`/holders/${row.original.id}`} className="text-sm text-blue-600 hover:underline">
        Editar
      </Link>
    ),
  },
]

export default async function HoldersPage() {
  const supabase = await createClient()
  const { data: holders } = await supabase.from('holders').select('*').order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Titulares</h1>
        <Button render={<Link href="/holders/new" />}>Novo Titular</Button>
      </div>
      <DataTable columns={columns} data={holders ?? []} />
    </div>
  )
}
