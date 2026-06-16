import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: entries, error: entriesError } = await supabase
    .from('entries')
    .select('date, program_id, holder_id, cost, points')
  if (entriesError) return NextResponse.json({ data: null, error: entriesError.message }, { status: 400 })

  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('date, program_id, holder_id, sale_value, points_sold, cpm_at_sale')
  if (salesError) return NextResponse.json({ data: null, error: salesError.message }, { status: 400 })

  const { data: transfers, error: transfersError } = await supabase
    .from('transfers')
    .select('date, from_program_id, holder_id, transfer_fee')
  if (transfersError) return NextResponse.json({ data: null, error: transfersError.message }, { status: 400 })

  const { data: programs } = await supabase.from('programs').select('id, name')
  const { data: holders } = await supabase.from('holders').select('id, name')

  const programMap = new Map(programs?.map(p => [p.id, p.name]) ?? [])
  const holderMap = new Map(holders?.map(h => [h.id, h.name]) ?? [])

  // Build monthly aggregates
  const monthlyMap = new Map<string, {
    mes: string; programa: string; titular: string;
    custo_entradas: number; pts_entradas: number;
    receita_vendas: number; custo_vendas: number;
    taxas_transf: number; pnl_liquido: number;
  }>()

  function getKey(mes: string, progId: string, holderId: string) {
    return `${mes}_${progId}_${holderId}`
  }

  function ensureRow(mes: string, progId: string, holderId: string) {
    const key = getKey(mes, progId, holderId)
    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, {
        mes,
        programa: programMap.get(progId) ?? '-',
        titular: holderMap.get(holderId) ?? '-',
        custo_entradas: 0, pts_entradas: 0,
        receita_vendas: 0, custo_vendas: 0,
        taxas_transf: 0, pnl_liquido: 0,
      })
    }
    return monthlyMap.get(key)!
  }

  for (const e of entries ?? []) {
    const mes = e.date.substring(0, 7)
    const row = ensureRow(mes, e.program_id, e.holder_id)
    row.custo_entradas += Number(e.cost)
    row.pts_entradas += e.points
  }

  for (const s of sales ?? []) {
    const mes = s.date.substring(0, 7)
    const row = ensureRow(mes, s.program_id, s.holder_id)
    row.receita_vendas += Number(s.sale_value)
    if (s.cpm_at_sale) {
      row.custo_vendas += (s.points_sold * Number(s.cpm_at_sale)) / 1000
    }
  }

  for (const t of transfers ?? []) {
    const mes = t.date.substring(0, 7)
    const row = ensureRow(mes, t.from_program_id, t.holder_id)
    row.taxas_transf += Number(t.transfer_fee)
  }

  for (const row of monthlyMap.values()) {
    row.pnl_liquido = row.receita_vendas - row.custo_vendas - row.custo_entradas - row.taxas_transf
  }

  return NextResponse.json({
    data: Array.from(monthlyMap.values()).sort((a, b) => b.mes.localeCompare(a.mes)),
    error: null,
  })
}
