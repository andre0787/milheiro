import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ProgramsTable } from '@/components/tables/programs-table'
import { ClearAllButton } from '@/components/clear-all-button'

export default async function ProgramsPage() {
  const supabase = await createClient()
  const { data: programs } = await supabase.from('programs').select('*').order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Programas</h1>
        <div className="flex gap-2">
          <Button render={<Link href="/programs/new" />}>Novo Programa</Button>
          <ClearAllButton listApi="/api/programs" deleteApiBase="/api/programs" />
        </div>
      </div>
      <ProgramsTable data={programs ?? []} />
    </div>
  )
}
