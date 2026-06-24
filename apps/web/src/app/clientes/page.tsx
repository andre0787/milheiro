import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ClientesTable } from '@/components/tables/clientes-table'
import { ClearAllButton } from '@/components/clear-all-button'
import { PageHeader } from '@/components/page-header'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: cpfs } = await supabase.from('cpfs').select('*').order('name')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        actions={
          <>
            <Button render={<Link href="/clientes/new" />}>Novo Cliente</Button>
            <ClearAllButton listApi="/api/clientes" deleteApiBase="/api/clientes" />
          </>
        }
      />
      <ClientesTable data={cpfs ?? []} />
    </div>
  )
}
