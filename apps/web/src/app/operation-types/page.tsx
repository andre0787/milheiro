import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { OpTypesTable } from '@/components/tables/op-types-table'
import { ClearAllButton } from '@/components/clear-all-button'
import { PageHeader } from '@/components/page-header'

export default async function OpTypesPage() {
  const supabase = await createClient()
  const { data: opTypes } = await supabase.from('operation_types').select('*').order('name')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tipos de Operação"
        actions={
          <>
            <Button render={<Link href="/operation-types/new" />}>Novo Tipo</Button>
            <ClearAllButton listApi="/api/operation-types" deleteApiBase="/api/operation-types" />
          </>
        }
      />
      <OpTypesTable data={opTypes ?? []} />
    </div>
  )
}
