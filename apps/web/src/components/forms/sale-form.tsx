'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Program, Holder } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface SaleFormProps {
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

export function SaleForm({ onSubmit }: SaleFormProps) {
  const [loading, setLoading] = useState(false)
  const [programs, setPrograms] = useState<Program[]>([])
  const [holders, setHolders] = useState<Holder[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [selectedHolderId, setSelectedHolderId] = useState('')
  const [pointsSold, setPointsSold] = useState(0)
  const [saleValue, setSaleValue] = useState(0)
  const [currentCpm, setCurrentCpm] = useState(0)
  const [overrideProfit, setOverrideProfit] = useState('')

  const autoProfit = pointsSold > 0 && currentCpm > 0 ? saleValue - (pointsSold * currentCpm) / 1000 : null

  useEffect(() => {
    fetch('/api/programs').then(r => r.json()).then(d => setPrograms(d.data ?? []))
    fetch('/api/holders').then(r => r.json()).then(d => setHolders(d.data ?? []))
  }, [])

  useEffect(() => {
    if (selectedProgramId && selectedHolderId) {
      fetch(`/api/balances?program_id=${selectedProgramId}&holder_id=${selectedHolderId}`)
        .then(r => r.json())
        .then(d => {
          if (d.data && d.data.length > 0) {
            setCurrentCpm(d.data[0].cpm)
          }
        })
    }
  }, [selectedProgramId, selectedHolderId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const data: Record<string, unknown> = {
      program_id: form.get('program_id'),
      holder_id: form.get('holder_id'),
      date: form.get('date'),
      points_sold: Number(form.get('points_sold')),
      sale_value: Number(form.get('sale_value')),
      buyer: form.get('buyer') || null,
      expected_receipt_date: form.get('expected_receipt_date') || null,
      profit_override: overrideProfit ? Number(overrideProfit) : null,
      notes: form.get('notes') || null,
    }
    await onSubmit(data)
    setLoading(false)
  }

  return (
    <Card className="max-w-xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="program_id">Programa</Label>
            <Select name="program_id" required onValueChange={(v) => setSelectedProgramId(v as string)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {programs.filter(p => p.category === 'miles').map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="holder_id">Titular</Label>
            <Select name="holder_id" required onValueChange={(v) => setSelectedHolderId(v as string)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {holders.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Data da Venda</Label>
            <Input id="date" name="date" type="date" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="points_sold">Pontos Vendidos</Label>
              <Input id="points_sold" name="points_sold" type="number" min="1" required
                onChange={(e) => setPointsSold(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale_value">Valor da Venda (R$)</Label>
              <Input id="sale_value" name="sale_value" type="number" step="0.01" min="0" required
                onChange={(e) => setSaleValue(Number(e.target.value))} />
            </div>
          </div>
          {currentCpm > 0 && (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p>CPM atual: <strong>R$ {currentCpm.toFixed(2)}/mil</strong></p>
              {autoProfit !== null && (
                <p>Lucro automático: <strong className={autoProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(autoProfit)}
                </strong></p>
              )}
              <div className="space-y-1 pt-2">
                <Label htmlFor="profit_override">Override de Lucro (opcional)</Label>
                <Input id="profit_override" type="number" step="0.01" value={overrideProfit}
                  onChange={(e) => setOverrideProfit(e.target.value)}
                  placeholder="Deixe vazio para usar lucro automático" />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="buyer">Comprador</Label>
            <Input id="buyer" name="buyer" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expected_receipt_date">Data de Recebimento Prevista</Label>
            <Input id="expected_receipt_date" name="expected_receipt_date" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Input id="notes" name="notes" />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
