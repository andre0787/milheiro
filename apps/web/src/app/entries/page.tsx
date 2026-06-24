import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { EntriesTable } from '@/components/tables/entries-table'
import { ClearAllButton } from '@/components/clear-all-button'
import { PageHeader } from '@/components/page-header'
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
      <PageHeader
        title="Entradas"
        actions={
          <>
            <Button render={<Link href="/entries/new" />}>Nova Entrada</Button>
            <ClearAllButton listApi="/api/entries" deleteApiBase="/api/entries" />
          </>
        }
      />
      <EntriesTable data={mapped} />
    </div>
  )
}
