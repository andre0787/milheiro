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

  const { count: entries } = await supabase.from('entries').select('*', { count: 'exact', head: true }).eq('holder_id', id)
  const { count: transfers } = await supabase.from('transfers').select('*', { count: 'exact', head: true }).eq('holder_id', id)
  const { count: sales } = await supabase.from('sales').select('*', { count: 'exact', head: true }).eq('holder_id', id)
  const { count: tickets } = await supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('holder_id', id)

  const deps = [
    { count: entries ?? 0, label: 'entradas' },
    { count: transfers ?? 0, label: 'transferências' },
    { count: sales ?? 0, label: 'vendas' },
    { count: tickets ?? 0, label: 'bilhetes' },
  ].filter(d => d.count > 0)

  if (deps.length > 0) {
    return NextResponse.json({
      data: null,
      error: `Não é possível excluir: ${deps.map(d => `${d.count} ${d.label}`).join(', ')}`
    }, { status: 400 })
  }

  const { error } = await supabase.from('holders').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data: true, error: null })
}
