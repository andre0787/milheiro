import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { SalesTable } from '@/components/tables/sales-table'
import { ClearAllButton } from '@/components/clear-all-button'
import { Sale } from '@/types'

export const dynamic = 'force-dynamic'

export default async function SalesPage() {
  const supabase = await createClient()
  const { data: sales } = await supabase
    .from('sales')
    .select('*, programs:program_id(name), holders:holder_id(name), buyers:buyer_id(name, telegram), tickets:ticket_id(id, ticket_info)')
    .order('date', { ascending: false })

  const ticketIds = (sales ?? [])
    .filter(s => (s as Record<string, unknown>).tickets)
    .map(s => ((s as Record<string, unknown>).tickets as { id: string }).id)

  const { data: tcData } = await supabase
    .from('ticket_cpfs')
    .select('ticket_id, cpfs:cpf_id(name)')
    .in('ticket_id', ticketIds)

  const cpfByTicket = new Map<string, string[]>()
  for (const tc of (tcData ?? [])) {
    const t = tc as unknown as { ticket_id: string; cpfs: { name: string } }
    if (!cpfByTicket.has(t.ticket_id)) cpfByTicket.set(t.ticket_id, [])
    cpfByTicket.get(t.ticket_id)!.push(t.cpfs.name)
  }

  const mapped: Sale[] = (sales ?? []).map((s: Record<string, unknown>) => {
    const ticket = s.tickets as unknown as { id: string; ticket_info: string | null } | null
    return {
      ...s,
      program_name: (s.programs as { name: string } | null)?.name ?? '-',
      holder_name: (s.holders as { name: string } | null)?.name ?? '-',
      buyer_name: (s.buyers as { name: string; telegram: string | null } | null)?.name ?? '-',
      ticket_id: ticket?.id ?? null,
      ticket_code: ticket?.ticket_info ?? null,
      cpf_names: ticket?.id ? (cpfByTicket.get(ticket.id) ?? []) : [],
    } as Sale
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Vendas</h1>
        <div className="flex gap-2">
          <Button render={<Link href="/sales/new" />}>Nova Venda</Button>
          <ClearAllButton listApi="/api/sales" deleteApiBase="/api/sales" />
        </div>
      </div>
      <SalesTable data={mapped} />
    </div>
  )
}
