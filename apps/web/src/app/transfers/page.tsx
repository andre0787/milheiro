import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { TransfersTable } from '@/components/tables/transfers-table'
import { ClearAllButton } from '@/components/clear-all-button'
import { Transfer } from '@/types'

export default async function TransfersPage() {
  const supabase = await createClient()
  const { data: transfers } = await supabase
    .from('transfers')
    .select('*, from_programs:from_program_id(name), to_programs:to_program_id(name), holders:holder_id(name)')
    .order('date', { ascending: false })

  const mapped: Transfer[] = (transfers ?? []).map((t: Record<string, unknown>) => ({
    ...t,
    from_program_name: (t.from_programs as { name: string } | null)?.name ?? '-',
    to_program_name: (t.to_programs as { name: string } | null)?.name ?? '-',
    holder_name: (t.holders as { name: string } | null)?.name ?? '-',
  } as Transfer))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Transferências</h1>
        <div className="flex gap-2">
          <Button render={<Link href="/transfers/new" />}>Nova Transferência</Button>
          <ClearAllButton listApi="/api/transfers" deleteApiBase="/api/transfers" />
        </div>
      </div>
      <TransfersTable data={mapped} />
    </div>
  )
}
