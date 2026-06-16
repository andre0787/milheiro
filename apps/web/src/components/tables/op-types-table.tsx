'use client'

import Link from 'next/link'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { OperationType } from '@/types'
import { DeleteButton } from '@/components/delete-button'

const columns: ColumnDef<OperationType>[] = [
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'slug', header: 'Slug' },
  {
    accessorKey: 'is_purchase',
    header: 'Tipo',
    cell: ({ row }) => (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        row.original.is_purchase ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
      }`}>
        {row.original.is_purchase ? 'Compra' : 'Bônus'}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link href={`/operation-types/${row.original.id}`} className="text-sm text-primary hover:underline">
          Editar
        </Link>
        <DeleteButton apiEndpoint={`/api/operation-types/${row.original.id}`} />
      </div>
    ),
  },
]

export function OpTypesTable({ data }: { data: OperationType[] }) {
  return <DataTable columns={columns} data={data} />
}
