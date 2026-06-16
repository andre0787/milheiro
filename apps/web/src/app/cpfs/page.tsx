import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Cpf } from '@/types'

const columns: ColumnDef<Cpf>[] = [
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'document', header: 'Documento' },
  {
    id: 'actions',
    cell: ({ row }) => (
      <Link href={`/cpfs/${row.original.id}`} className="text-sm text-blue-600 hover:underline">
        Editar
      </Link>
    ),
  },
]

export default async function CpfsPage() {
  const supabase = await createClient()
  const { data: cpfs } = await supabase.from('cpfs').select('*').order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">CPFs</h1>
        <Button render={<Link href="/cpfs/new" />}>Novo CPF</Button>
      </div>
      <DataTable columns={columns} data={cpfs ?? []} />
    </div>
  )
}
