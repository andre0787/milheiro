import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { TicketsTable } from '@/components/tables/tickets-table'
import { ClearAllButton } from '@/components/clear-all-button'
import { Ticket } from '@/types'

export default async function TicketsPage() {
  const supabase = await createClient()
  const { data: tickets } = await supabase
    .from('tickets')
    .select('*, programs:program_id(name), holders:holder_id(name), ticket_cpfs(cpfs:cpf_id(name))')
    .order('issued_at', { ascending: false })

  const mapped: Ticket[] = (tickets ?? []).map((t: Record<string, unknown>) => ({
    ...t,
    program_name: (t.programs as { name: string } | null)?.name ?? '-',
    holder_name: (t.holders as { name: string } | null)?.name ?? '-',
    cpf_names: ((t.ticket_cpfs as unknown as Array<{ cpfs: { name: string } }>) ?? [])
      .map(tc => tc.cpfs?.name).filter(Boolean),
  } as Ticket))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Bilhetes</h1>
        <div className="flex gap-2">
          <Button render={<Link href="/tickets/new" />}>Novo Bilhete</Button>
          <ClearAllButton listApi="/api/tickets" deleteApiBase="/api/tickets" />
        </div>
      </div>
      <TicketsTable data={mapped} />
    </div>
  )
}
