import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: balances } = await supabase
    .from('balances')
    .select('*, programs:program_id(name), holders:holder_id(name)')

  const totalPoints = balances?.reduce((sum, b) => sum + b.total_points, 0) ?? 0
  const totalCost = balances?.reduce((sum, b) => sum + Number(b.total_cost), 0) ?? 0
  const avgCpm = totalPoints > 0 ? (totalCost / totalPoints) * 1000 : 0

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPoints.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground">pontos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
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
            <CardTitle className="text-sm font-medium">Programas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balances?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">com saldo</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
