'use client'

import Link from 'next/link'
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

export function CpfsTable({ data }: { data: Cpf[] }) {
  return <DataTable columns={columns} data={data} />
}
