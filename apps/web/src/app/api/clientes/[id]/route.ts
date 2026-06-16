import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.from('cpfs').select().eq('id', id).single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 404 })
  return NextResponse.json({ data, error: null })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { data, error } = await supabase.from('cpfs').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Check tickets (via ticket_cpfs)
  const { data: ticketLinks } = await supabase
    .from('ticket_cpfs')
    .select('ticket_id, tickets:ticket_id(ticket_info)')
    .eq('cpf_id', id)
    .limit(5)

  // Check sales (buyer)
  const { data: buyerSales } = await supabase
    .from('sales')
    .select('id, programs:program_id(name)')
    .eq('buyer_id', id)
    .limit(5)

  const names: string[] = []
  for (const t of (ticketLinks ?? [])) {
    const tk = t as unknown as { tickets: { ticket_info: string | null } }
    names.push(`bilhete "${tk.tickets?.ticket_info || '(sem código)'}"`)
  }
  for (const s of (buyerSales ?? [])) {
    const sl = s as unknown as { programs: { name: string } }
    names.push(`comprador na venda "${sl.programs?.name}"`)
  }

  if (names.length > 0) {
    return NextResponse.json({
      data: null,
      error: `Não é possível excluir: ${names.join(', ')}`
    }, { status: 400 })
  }

  const { error } = await supabase.from('cpfs').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data: true, error: null })
}
