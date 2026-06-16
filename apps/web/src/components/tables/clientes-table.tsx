'use client'

import Link from 'next/link'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Cpf } from '@/types'
import { DeleteButton } from '@/components/delete-button'

const columns: ColumnDef<Cpf>[] = [
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'document', header: 'Documento' },
  { accessorKey: 'telegram', header: 'Telegram' },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link href={`/clientes/${row.original.id}`} className="text-sm text-primary hover:underline">
          Editar
        </Link>
        <DeleteButton apiEndpoint={`/api/clientes/${row.original.id}`} />
      </div>
    ),
  },
]

export function ClientesTable({ data }: { data: Cpf[] }) {
  return <DataTable columns={columns} data={data} searchable />
}
