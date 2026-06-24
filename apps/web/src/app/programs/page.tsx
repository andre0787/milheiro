import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ProgramsTable } from '@/components/tables/programs-table'
import { ClearAllButton } from '@/components/clear-all-button'
import { PageHeader } from '@/components/page-header'

export default async function ProgramsPage() {
  const supabase = await createClient()
  const { data: programs } = await supabase.from('programs').select('*').order('name')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programas"
        actions={
          <>
            <Button render={<Link href="/programs/new" />}>Novo Programa</Button>
            <ClearAllButton listApi="/api/programs" deleteApiBase="/api/programs" />
          </>
        }
      />
      <ProgramsTable data={programs ?? []} />
    </div>
  )
}
