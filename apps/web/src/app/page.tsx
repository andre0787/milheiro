import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { DashboardSummary } from '@/types'

const columns: ColumnDef<DashboardSummary>[] = [
  { accessorKey: 'mes', header: 'Mês' },
  { accessorKey: 'programa', header: 'Programa' },
  { accessorKey: 'titular', header: 'Titular' },
  {
    accessorKey: 'custo_entradas',
    header: 'Custo Entradas',
    cell: ({ row }) => formatCurrency(row.original.custo_entradas),
  },
  {
    accessorKey: 'pts_entradas',
    header: 'Pontos',
    cell: ({ row }) => formatNumber(row.original.pts_entradas),
  },
  {
    accessorKey: 'receita_vendas',
    header: 'Receita',
    cell: ({ row }) => formatCurrency(row.original.receita_vendas),
  },
  {
    accessorKey: 'pnl_liquido',
    header: 'PnL',
    cell: ({ row }) => {
      const val = row.original.pnl_liquido
      return <span className={val >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
        {formatCurrency(val)}
      </span>
    },
  },
]

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: balances } = await supabase
    .from('balances')
    .select('*, programs:program_id(name), holders:holder_id(name)')

  const totalPoints = balances?.reduce((sum, b) => sum + b.total_points, 0) ?? 0
  const totalCost = balances?.reduce((sum, b) => sum + Number(b.total_cost), 0) ?? 0
  const avgCpm = totalPoints > 0 ? (totalCost / totalPoints) * 1000 : 0

  // Build monthly summary from raw data (server-side)
  const { data: allEntries } = await supabase.from('entries').select('date, program_id, holder_id, cost, points')
  const { data: allSales } = await supabase.from('sales').select('date, program_id, holder_id, sale_value, points_sold, cpm_at_sale')
  const { data: allTransfers } = await supabase.from('transfers').select('date, from_program_id, holder_id, transfer_fee')
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

  for (const e of allEntries ?? []) {
    const r = ensureRow(e.date.substring(0, 7), e.program_id, e.holder_id)
    r.custo_entradas += Number(e.cost); r.pts_entradas += e.points
  }
  for (const s of allSales ?? []) {
    const r = ensureRow(s.date.substring(0, 7), s.program_id, s.holder_id)
    r.receita_vendas += Number(s.sale_value)
    if (s.cpm_at_sale) r.custo_vendas += (s.points_sold * Number(s.cpm_at_sale)) / 1000
  }
  for (const t of allTransfers ?? []) {
    const r = ensureRow(t.date.substring(0, 7), t.from_program_id, t.holder_id)
    r.taxas_transf += Number(t.transfer_fee)
  }

  const summaryData = Array.from(monthlyMap.values())
    .map(r => ({ ...r, pnl_liquido: r.receita_vendas - r.custo_vendas - r.custo_entradas - r.taxas_transf }))
    .sort((a, b) => b.mes.localeCompare(a.mes))

  const totalProfit = summaryData.reduce((sum, r) => sum + r.pnl_liquido, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalPoints)}</div>
            <p className="text-xs text-muted-foreground">pontos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
            <p className="text-xs text-muted-foreground">investido</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPM Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {avgCpm.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">por milheiro</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">todas as vendas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PnL Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={summaryData} />
        </CardContent>
      </Card>
    </div>
  )
}
