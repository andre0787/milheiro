import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const programId = searchParams.get('program_id')
  const cpfId = searchParams.get('cpf_id')

  if (!programId || !cpfId) {
    return NextResponse.json({ data: null, error: 'program_id and cpf_id required' }, { status: 400 })
  }

  const { data: program } = await supabase.from('programs').select('*').eq('id', programId).single()
  if (!program) return NextResponse.json({ data: null, error: 'Program not found' }, { status: 404 })
  if (program.category !== 'miles') {
    return NextResponse.json(
      { data: null, error: 'INVALID_EMISSION_PROGRAM_CATEGORY: Program is not a miles program' },
      { status: 422 }
    )
  }

  let count = 0
  let cooldownRemaining: number | null = null

  if (program.limit_window_type !== 'none') {
    let countQuery = supabase
      .from('emissions')
      .select('*', { count: 'exact', head: true })
      .eq('program_id', programId)
      .eq('cpf_id', cpfId)

    if (program.limit_window_type === 'rolling') {
      const since = new Date()
      since.setDate(since.getDate() - program.limit_window_days)
      countQuery = countQuery.gte('issued_at', since.toISOString().split('T')[0])
    } else if (program.limit_window_type === 'fixed' && program.limit_start_date) {
      countQuery = countQuery.gte('issued_at', program.limit_start_date)
    }

    const result = await countQuery
    count = result.count ?? 0
  }

  if (program.cooldown_days > 0) {
    const { data: lastEmission } = await supabase
      .from('emissions')
      .select('issued_at')
      .eq('program_id', programId)
      .eq('cpf_id', cpfId)
      .order('issued_at', { ascending: false })
      .limit(1)
      .single()

    if (lastEmission) {
      const diffDays = Math.floor(
        (Date.now() - new Date(lastEmission.issued_at).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (diffDays < program.cooldown_days) {
        cooldownRemaining = program.cooldown_days - diffDays
      }
    }
  }

  return NextResponse.json({
    data: {
      available: count < program.emission_limit && cooldownRemaining === null,
      used: count,
      limit: program.emission_limit,
      cooldown_remaining: cooldownRemaining,
    },
    error: null,
  })
}
