import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tickets')
    .select('*, programs:program_id(name), holders:holder_id(name), ticket_cpfs(cpfs:cpf_id(name))')
    .order('issued_at', { ascending: false })
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { cpf_ids, ...ticketData } = body

  const { data: program } = await supabase
    .from('programs')
    .select('*')
    .eq('id', ticketData.program_id)
    .single()

  if (!program) return NextResponse.json({ data: null, error: 'Program not found' }, { status: 404 })
  if (program.category !== 'miles') {
    return NextResponse.json(
      { data: null, error: 'INVALID_TICKET_PROGRAM_CATEGORY: Bilhetes só podem ser registrados em programas de milhas' },
      { status: 422 }
    )
  }

  if (program.limit_window_type !== 'none' && cpf_ids?.length) {
    const { count } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('program_id', ticketData.program_id)

    if (count !== null && count >= program.emission_limit) {
      return NextResponse.json(
        { data: null, error: `LIMIT_EXCEEDED: Limite de ${program.emission_limit} bilhetes excedido no programa ${program.name}` },
        { status: 422 }
      )
    }
  }

  const { data: ticket, error } = await supabase.from('tickets').insert(ticketData).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })

  if (cpf_ids?.length) {
    const rows = cpf_ids.map((cpfId: string) => ({ ticket_id: ticket.id, cpf_id: cpfId }))
    await supabase.from('ticket_cpfs').insert(rows)
  }

  return NextResponse.json({ data: ticket, error: null })
}
