'use client'

import Link from 'next/link'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Holder } from '@/types'
import { DeleteButton } from '@/components/delete-button'

const columns: ColumnDef<Holder>[] = [
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'nickname', header: 'Apelido' },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link href={`/holders/${row.original.id}`} className="text-sm text-primary hover:underline">
          Editar
        </Link>
        <DeleteButton apiEndpoint={`/api/holders/${row.original.id}`} />
      </div>
    ),
  },
]

export function HoldersTable({ data }: { data: Holder[] }) {
  return <DataTable columns={columns} data={data} searchable />
}
