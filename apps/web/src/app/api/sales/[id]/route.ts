import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.from('sales').select('*, buyers:buyer_id(name, telegram)').eq('id', id).single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 404 })

  // Fetch linked ticket
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, ticket_info, outbound_date, return_date')
    .eq('sale_id', id)
    .limit(1)
    .single()

  // Fetch ticket CPFs
  const { data: tcData } = await supabase
    .from('ticket_cpfs')
    .select('cpf_id')
    .eq('ticket_id', (ticket as { id: string } | null)?.id ?? '')

  return NextResponse.json({
    data: {
      ...(data ?? {}),
      ticket_code: ticket ? (ticket as { ticket_info: string }).ticket_info : null,
      ticket_outbound_date: ticket ? (ticket as { outbound_date: string }).outbound_date : null,
      ticket_return_date: ticket ? (ticket as { return_date: string }).return_date : null,
      ticket_cpf_ids: (tcData ?? []).map(tc => (tc as { cpf_id: string }).cpf_id),
      buyer_telegram: (data as unknown as { buyers: { telegram: string | null } | null })?.buyers?.telegram ?? null,
    },
    error: null,
  })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { data, error } = await supabase.from('sales').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tickets } = await supabase
    .from('tickets').select('id, ticket_info').eq('sale_id', id).limit(5)
  const names = (tickets ?? []).map(t => {
    const tk = t as unknown as { ticket_info: string | null }
    return `bilhete "${tk.ticket_info || '(sem código)'}"`
  })

  if (names.length > 0) {
    return NextResponse.json({
      data: null,
      error: `Não é possível excluir: ${names.join(', ')}. Exclua os bilhetes primeiro.`
    }, { status: 400 })
  }

  const { error } = await supabase.from('sales').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data: true, error: null })
}
