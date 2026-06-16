import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('emissions')
    .select('*, programs:program_id(name), cpfs:cpf_id(name, document), holders:holder_id(name)')
    .order('issued_at', { ascending: false })
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data: program } = await supabase
    .from('programs')
    .select('*')
    .eq('id', body.program_id)
    .single()

  if (!program) return NextResponse.json({ data: null, error: 'Program not found' }, { status: 404 })
  if (program.category !== 'miles') {
    return NextResponse.json(
      { data: null, error: 'INVALID_EMISSION_PROGRAM_CATEGORY: Emissões só podem ser registradas em programas de milhas' },
      { status: 422 }
    )
  }

  if (program.limit_window_type !== 'none') {
    let countQuery = supabase
      .from('emissions')
      .select('*', { count: 'exact', head: true })
      .eq('program_id', body.program_id)
      .eq('cpf_id', body.cpf_id)

    if (program.limit_window_type === 'rolling') {
      const since = new Date()
      since.setDate(since.getDate() - program.limit_window_days)
      countQuery = countQuery.gte('issued_at', since.toISOString().split('T')[0])
    } else if (program.limit_window_type === 'fixed' && program.limit_start_date) {
      countQuery = countQuery.gte('issued_at', program.limit_start_date)
    }

    const { count } = await countQuery

    if (count !== null && count >= program.emission_limit) {
      return NextResponse.json(
        { data: null, error: `LIMIT_EXCEEDED: Limite de ${program.emission_limit} emissões excedido para este CPF no programa ${program.name}` },
        { status: 422 }
      )
    }
  }

  const { data, error } = await supabase.from('emissions').insert(body).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}
