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

async function checkDependencies(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { count: ticketCount } = await supabase.from('ticket_cpfs').select('*', { count: 'exact', head: true }).eq('cpf_id', id)
  const { count: buyerCount } = await supabase.from('sales').select('*', { count: 'exact', head: true }).eq('buyer_id', id)
  return [
    { count: ticketCount ?? 0, label: 'bilhetes (viajante)' },
    { count: buyerCount ?? 0, label: 'vendas (comprador)' },
  ].filter(d => d.count > 0)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const deps = await checkDependencies(supabase, id)
  if (deps.length > 0) {
    const msg = 'Não é possível excluir: ' + deps.map(d => `${d.count} ${d.label}`).join(', ')
    return NextResponse.json({ data: null, error: msg }, { status: 400 })
  }

  const { error } = await supabase.from('cpfs').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data: true, error: null })
}
