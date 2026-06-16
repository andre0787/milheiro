'use client'

import Link from 'next/link'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Program } from '@/types'
import { formatCategory } from '@/lib/utils'
import { DeleteButton } from '@/components/delete-button'

const columns: ColumnDef<Program>[] = [
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'slug', header: 'Slug' },
  {
    accessorKey: 'category',
    header: 'Tipo',
    cell: ({ row }) => {
      const cat = row.original.category
      return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          cat === 'points' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {formatCategory(cat)}
        </span>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link href={`/programs/${row.original.id}`} className="text-sm text-primary hover:underline">
          Editar
        </Link>
        <DeleteButton apiEndpoint={`/api/programs/${row.original.id}`} />
      </div>
    ),
  },
]

export function ProgramsTable({ data }: { data: Program[] }) {
  return <DataTable columns={columns} data={data} />
}
