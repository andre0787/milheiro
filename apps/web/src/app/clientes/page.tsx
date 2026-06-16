import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ClientesTable } from '@/components/tables/clientes-table'
import { ClearAllButton } from '@/components/clear-all-button'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: cpfs } = await supabase.from('cpfs').select('*').order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Clientes</h1>
        <div className="flex gap-2">
          <Button render={<Link href="/clientes/new" />}>Novo Cliente</Button>
          <ClearAllButton listApi="/api/clientes" deleteApiBase="/api/clientes" />
        </div>
      </div>
      <ClientesTable data={cpfs ?? []} />
    </div>
  )
}
