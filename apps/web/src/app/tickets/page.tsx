import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { TicketsTable } from '@/components/tables/tickets-table'
import { ClearAllButton } from '@/components/clear-all-button'
import { PageHeader } from '@/components/page-header'
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
      <PageHeader
        title="Bilhetes"
        actions={
          <>
            <Button render={<Link href="/tickets/new" />}>Novo Bilhete</Button>
            <ClearAllButton listApi="/api/tickets" deleteApiBase="/api/tickets" />
          </>
        }
      />
      <TicketsTable data={mapped} />
    </div>
  )
}
