import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { EntriesTable } from '@/components/tables/entries-table'
import { ClearAllButton } from '@/components/clear-all-button'
import { Entry } from '@/types'

export default async function EntriesPage() {
  const supabase = await createClient()
  const { data: entries } = await supabase
    .from('entries')
    .select('*, programs:program_id(name), holders:holder_id(name)')
    .order('date', { ascending: false })

  const mapped: Entry[] = (entries ?? []).map((e: Record<string, unknown>) => ({
    ...e,
    program_name: (e.programs as { name: string } | null)?.name ?? '-',
    holder_name: (e.holders as { name: string } | null)?.name ?? '-',
  } as Entry))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Entradas</h1>
        <div className="flex gap-2">
          <Button render={<Link href="/entries/new" />}>Nova Entrada</Button>
          <ClearAllButton listApi="/api/entries" deleteApiBase="/api/entries" />
        </div>
      </div>
      <EntriesTable data={mapped} />
    </div>
  )
}
