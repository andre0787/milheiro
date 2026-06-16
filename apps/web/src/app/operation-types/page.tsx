import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { OpTypesTable } from '@/components/tables/op-types-table'
import { ClearAllButton } from '@/components/clear-all-button'

export default async function OpTypesPage() {
  const supabase = await createClient()
  const { data: opTypes } = await supabase.from('operation_types').select('*').order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tipos de Operação</h1>
        <div className="flex gap-2">
          <Button render={<Link href="/operation-types/new" />}>Novo Tipo</Button>
          <ClearAllButton listApi="/api/operation-types" deleteApiBase="/api/operation-types" />
        </div>
      </div>
      <OpTypesTable data={opTypes ?? []} />
    </div>
  )
}
