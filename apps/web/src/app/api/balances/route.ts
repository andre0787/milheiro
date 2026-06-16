import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const programId = searchParams.get('program_id')
  const holderId = searchParams.get('holder_id')

  let query = supabase
    .from('balances')
    .select('*, programs:program_id(name), holders:holder_id(name)')

  if (programId) query = query.eq('program_id', programId)
  if (holderId) query = query.eq('holder_id', holderId)

  const { data, error } = await query.order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}
