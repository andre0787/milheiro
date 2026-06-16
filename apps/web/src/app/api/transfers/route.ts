import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transfers')
    .select('*, from_programs:from_program_id(name), to_programs:to_program_id(name), holders:holder_id(name)')
    .order('date', { ascending: false })
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data: fromProgram } = await supabase
    .from('programs').select('category').eq('id', body.from_program_id).single()
  if (!fromProgram || fromProgram.category !== 'points') {
    return NextResponse.json(
      { data: null, error: 'INVALID_TRANSFER_PROGRAM_CATEGORY: Origem deve ser um programa de pontos' },
      { status: 422 }
    )
  }
  const { data: toProgram } = await supabase
    .from('programs').select('category').eq('id', body.to_program_id).single()
  if (!toProgram || toProgram.category !== 'miles') {
    return NextResponse.json(
      { data: null, error: 'INVALID_TRANSFER_PROGRAM_CATEGORY: Destino deve ser um programa de milhas' },
      { status: 422 }
    )
  }

  const { data, error } = await supabase.from('transfers').insert(body).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}
