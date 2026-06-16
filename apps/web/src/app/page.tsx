import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { DashboardSummary } from '@/types'
import { PnLTable } from '@/components/dashboard/pnl-table'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: balances } = await supabase
    .from('balances')
    .select('*, programs:program_id(name, category), holders:holder_id(name)')

  const totalPoints = balances?.reduce((sum, b) => sum + b.total_points, 0) ?? 0
  const totalCost = balances?.reduce((sum, b) => sum + Number(b.total_cost), 0) ?? 0
  const avgCpm = totalPoints > 0 ? (totalCost / totalPoints) * 1000 : 0

  // CPM por programa e titular (estoque atual)
  interface HolderCpm {
    key: string
    name: string
    program: string
    ptsTotal: number; ptsCost: number; ptsCpm: number
    milhasTotal: number; milhasCost: number; milhasCpm: number
    cpfsUsed: number
  }
  const holderCpmMap = new Map<string, HolderCpm>()
  for (const b of (balances ?? [])) {
    const holderName = (b.holders as { name: string } | null)?.name ?? '-'
    const progName = (b.programs as { name: string } | null)?.name ?? '-'
    const cat = (b.programs as { category: string } | null)?.category ?? 'points'
    const key = `${b.holder_id}::${b.program_id}`
    if (!holderCpmMap.has(key)) {
      holderCpmMap.set(key, {
        key,
        name: holderName, program: progName,
        ptsTotal: 0, ptsCost: 0, ptsCpm: 0,
        milhasTotal: 0, milhasCost: 0, milhasCpm: 0,
        cpfsUsed: 0,
      })
    }
    const h = holderCpmMap.get(key)!
    if (cat === 'points') {
      h.ptsTotal += b.total_points
      h.ptsCost += Number(b.total_cost)
    } else {
      h.milhasTotal += b.total_points
      h.milhasCost += Number(b.total_cost)
    }
  }
  for (const h of holderCpmMap.values()) {
    h.ptsCpm = h.ptsTotal > 0 ? (h.ptsCost / h.ptsTotal) * 1000 : 0
    h.milhasCpm = h.milhasTotal > 0 ? (h.milhasCost / h.milhasTotal) * 1000 : 0
  }

  // Count CPFs consumed per program+holder (tickets)
  const { data: ticketCpfsData } = await supabase
    .from('ticket_cpfs')
    .select('cpf_id, ticket_id')
  const ticketIds = [...new Set((ticketCpfsData ?? []).map(tc => (tc as { ticket_id: string }).ticket_id))]
  const { data: ticketsForCpf } = ticketIds.length > 0
    ? await supabase.from('tickets').select('id, program_id, holder_id').in('id', ticketIds)
    : { data: [] }
  const ticketMap = new Map((ticketsForCpf ?? []).map(t => [t.id, { program_id: t.program_id, holder_id: t.holder_id }]))
  const cpfCountMap = new Map<string, Set<string>>()
  for (const tc of (ticketCpfsData ?? [])) {
    const tcpf = tc as { ticket_id: string; cpf_id: string }
    const tkt = ticketMap.get(tcpf.ticket_id)
    if (!tkt) continue
    const key = `${tkt.holder_id}::${tkt.program_id}`
    if (!cpfCountMap.has(key)) cpfCountMap.set(key, new Set())
    cpfCountMap.get(key)!.add(tcpf.cpf_id)
  }

  for (const [key, set] of cpfCountMap.entries()) {
    const h = holderCpmMap.get(key)
    if (h) h.cpfsUsed = set.size
  }

  const holdersCpm = Array.from(holderCpmMap.values())

  // Build monthly sales summary (PnL table)
  const { data: allSales } = await supabase.from('sales').select('date, program_id, holder_id, sale_value, points_sold, cpm_at_sale').eq('received', true)
  const { data: allPrograms } = await supabase.from('programs').select('id, name')
  const { data: allHolders } = await supabase.from('holders').select('id, name')

  const progMap = new Map(allPrograms?.map(p => [p.id, p.name]) ?? [])
  const holdMap = new Map(allHolders?.map(h => [h.id, h.name]) ?? [])

  const monthlyMap = new Map<string, DashboardSummary>()

  function getKey(mes: string, progId: string, holderId: string) {
    return `${mes}_${progId}_${holderId}`
  }
  function ensureRow(mes: string, progId: string, holderId: string) {
    const key = getKey(mes, progId, holderId)
    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, {
        mes, programa: progMap.get(progId) ?? '-', titular: holdMap.get(holderId) ?? '-',
        custo_entradas: 0, pts_entradas: 0, receita_vendas: 0, custo_vendas: 0, taxas_transf: 0, pnl_liquido: 0,
      })
    }
    return monthlyMap.get(key)!
  }

  for (const s of allSales ?? []) {
    const r = ensureRow(s.date.substring(0, 7), s.program_id, s.holder_id)
    r.pts_entradas += s.points_sold
    r.receita_vendas += Number(s.sale_value)
    if (s.cpm_at_sale) r.custo_vendas += (s.points_sold * Number(s.cpm_at_sale)) / 1000
  }

  const summaryData = Array.from(monthlyMap.values())
    .map(r => ({ ...r, pnl_liquido: r.receita_vendas - r.custo_vendas }))
    .sort((a, b) => b.mes.localeCompare(a.mes))

  const totalProfit = summaryData.reduce((sum, r) => sum + r.pnl_liquido, 0)

  // Sum unreceived sales
  const { data: unreceived } = await supabase
    .from('sales').select('sale_value').or('received.eq.false,received.is.null')
  const pendingTotal = unreceived?.reduce((sum, s) => sum + Number(s.sale_value), 0) ?? 0

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
            <p className="text-xs text-muted-foreground">investido em estoque</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
              {formatCurrency(totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">lucro realizado (vendas recebidas)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando Recebimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(pendingTotal)}</div>
            <p className="text-xs text-muted-foreground">vendas não recebidas</p>
          </CardContent>
        </Card>
      </div>

      {holdersCpm.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">CPM por Titular e Programa (Estoque Atual)</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {holdersCpm.map((h) => (
              <Card key={h.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{h.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{h.program}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {h.ptsTotal > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">Pontos ({formatNumber(h.ptsTotal)} pts)</p>
                      <p className="text-xl font-bold">R$ {h.ptsCpm.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">CPM aquisição</p>
                    </div>
                  )}
                  {h.milhasTotal > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">Milhas ({formatNumber(h.milhasTotal)} pts)</p>
                      <p className="text-xl font-bold">R$ {h.milhasCpm.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        CPM aquisição{h.cpfsUsed > 0 ? ` · ${h.cpfsUsed} CPF(s) consumido(s)` : ''}
                      </p>
                    </div>
                  )}
                  {h.ptsTotal === 0 && h.milhasTotal === 0 && (
                    <p className="text-sm text-muted-foreground">Sem estoque</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>PnL Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <PnLTable data={summaryData} />
        </CardContent>
      </Card>
    </div>
  )
}
