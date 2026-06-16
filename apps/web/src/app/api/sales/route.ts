import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sales')
    .select('*, programs:program_id(name), holders:holder_id(name), buyers:buyer_id(name, telegram), tickets:ticket_id(id, ticket_info)')
    .order('date', { ascending: false })
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })

  // Fetch ticket CPFs separately and merge
  if (data) {
    const ticketIds = data.filter(s => s.tickets).map(s => (s.tickets as unknown as { id: string }).id)
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

    data.forEach((s: Record<string, unknown>) => {
      if (s.tickets) {
        (s.tickets as Record<string, unknown>).ticket_cpfs = cpfByTicket.get((s.tickets as { id: string }).id) ?? []
      }
    })
  }

  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data: program } = await supabase
    .from('programs').select('category').eq('id', body.program_id).single()
  if (!program || program.category !== 'miles') {
    return NextResponse.json(
      { data: null, error: 'INVALID_SALE_PROGRAM_CATEGORY: Vendas só podem ser registradas em programas de milhas' },
      { status: 422 }
    )
  }

  const { data: sale, error } = await supabase.from('sales').insert(body).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })

  if (body.ticket_id) {
    await supabase.from('tickets').update({ sale_id: sale.id }).eq('id', body.ticket_id)
  }

  return NextResponse.json({ data: sale, error: null })
}
