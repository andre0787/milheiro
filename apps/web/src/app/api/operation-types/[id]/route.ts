import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.from('operation_types').select().eq('id', id).single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 404 })
  return NextResponse.json({ data, error: null })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { data, error } = await supabase.from('operation_types').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { count, data: entries } = await supabase
    .from('entries').select('date, points', { count: 'exact' }).eq('operation_type_id', id).limit(5)

  if (count && count > 0) {
    const samples = (entries ?? []).slice(0, 3).map(e => {
      const en = e as unknown as { date: string; points: number }
      return `entrada ${en.date} (${en.points} pts)`
    })
    const extra = count > 3 ? ` +${count - 3} mais` : ''
    return NextResponse.json({
      data: null,
      error: `Não é possível excluir: ${samples.join(', ')}${extra}. Remova as entradas vinculadas primeiro.`
    }, { status: 400 })
  }

  const { error } = await supabase.from('operation_types').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data: true, error: null })
}
