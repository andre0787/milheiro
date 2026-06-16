'use client'

import Link from 'next/link'
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

export function HoldersTable({ data }: { data: Holder[] }) {
  return <DataTable columns={columns} data={data} />
}
