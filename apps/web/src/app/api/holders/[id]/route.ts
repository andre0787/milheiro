import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.from('holders').select().eq('id', id).single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 404 })
  return NextResponse.json({ data, error: null })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { data, error } = await supabase.from('holders').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const names: string[] = []

  const { count: entries } = await supabase.from('entries').select('*', { count: 'exact', head: true }).eq('holder_id', id)
  if (entries) names.push(`${entries} entrada(s)`)

  const { count: transfers } = await supabase.from('transfers').select('*', { count: 'exact', head: true }).eq('holder_id', id)
  if (transfers) names.push(`${transfers} transferência(s)`)

  const { data: sales } = await supabase
    .from('sales').select('id, programs:program_id(name)').eq('holder_id', id).limit(3)
  for (const s of (sales ?? [])) {
    const sl = s as unknown as { programs: { name: string } }
    names.push(`venda "${sl.programs?.name}"`)
  }

  const { data: tickets } = await supabase
    .from('tickets').select('id, ticket_info').eq('holder_id', id).limit(3)
  for (const t of (tickets ?? [])) {
    const tk = t as unknown as { ticket_info: string | null }
    names.push(`bilhete "${tk.ticket_info || '(sem código)'}"`)
  }

  if (names.length > 0) {
    return NextResponse.json({
      data: null,
      error: `Não é possível excluir: ${names.join(', ')}`
    }, { status: 400 })
  }

  const { error } = await supabase.from('holders').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data: true, error: null })
}
