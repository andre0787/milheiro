import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { HoldersTable } from '@/components/tables/holders-table'
import { ClearAllButton } from '@/components/clear-all-button'
import { PageHeader } from '@/components/page-header'

export default async function HoldersPage() {
  const supabase = await createClient()
  const { data: holders } = await supabase.from('holders').select('*').order('name')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Titulares"
        actions={
          <>
            <Button render={<Link href="/holders/new" />}>Novo Titular</Button>
            <ClearAllButton listApi="/api/holders" deleteApiBase="/api/holders" />
          </>
        }
      />
      <HoldersTable data={holders ?? []} />
    </div>
  )
}
