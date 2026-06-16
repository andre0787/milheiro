import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.from('tickets').select('*, ticket_cpfs(cpf_id)').eq('id', id).single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 404 })
  return NextResponse.json({ data, error: null })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { cpf_ids, ...ticketData } = body
  const { data, error } = await supabase.from('tickets').update(ticketData).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })

  if (cpf_ids) {
    await supabase.from('ticket_cpfs').delete().eq('ticket_id', id)
    if (cpf_ids.length) {
      const rows = cpf_ids.map((cpfId: string) => ({ ticket_id: id, cpf_id: cpfId }))
      await supabase.from('ticket_cpfs').insert(rows)
    }
  }

  return NextResponse.json({ data, error: null })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from('tickets').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data: true, error: null })
}
