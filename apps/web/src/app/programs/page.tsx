import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ProgramsTable } from '@/components/tables/programs-table'

export default async function ProgramsPage() {
  const supabase = await createClient()
  const { data: programs } = await supabase.from('programs').select('*').order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Programas</h1>
        <Button render={<Link href="/programs/new" />}>Novo Programa</Button>
      </div>
      <ProgramsTable data={programs ?? []} />
    </div>
  )
}
