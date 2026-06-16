import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const entrySchema = z.object({
  program_id: z.string().uuid(),
  holder_id: z.string().uuid(),
  operation_type_id: z.string().uuid().nullable().optional(),
  date: z.string(),
  points: z.number().int().positive(),
  cost: z.number().min(0),
  notes: z.string().nullable().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('entries')
    .select('*, programs:program_id(name), holders:holder_id(name), operation_types:operation_type_id(name)')
    .order('date', { ascending: false })
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const parsed = entrySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.message }, { status: 400 })
  const { data, error } = await supabase.from('entries').insert(parsed.data).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}
