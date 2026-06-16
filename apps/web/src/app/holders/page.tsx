import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { HoldersTable } from '@/components/tables/holders-table'

export default async function HoldersPage() {
  const supabase = await createClient()
  const { data: holders } = await supabase.from('holders').select('*').order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Titulares</h1>
        <Button render={<Link href="/holders/new" />}>Novo Titular</Button>
      </div>
      <HoldersTable data={holders ?? []} />
    </div>
  )
}
