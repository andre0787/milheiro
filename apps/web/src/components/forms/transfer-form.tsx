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

interface TransferFormProps {
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

export function TransferForm({ onSubmit }: TransferFormProps) {
  const [loading, setLoading] = useState(false)
  const [programs, setPrograms] = useState<Program[]>([])
  const [holders, setHolders] = useState<Holder[]>([])
  const [pointsSent, setPointsSent] = useState(0)
  const [bonusPct, setBonusPct] = useState(0)

  useEffect(() => {
    fetch('/api/programs').then(r => r.json()).then(d => setPrograms(d.data ?? []))
    fetch('/api/holders').then(r => r.json()).then(d => setHolders(d.data ?? []))
  }, [])

  const pointsReceived = Math.floor(pointsSent * (1 + bonusPct / 100))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const data = {
      from_program_id: form.get('from_program_id'),
      to_program_id: form.get('to_program_id'),
      holder_id: form.get('holder_id'),
      date: form.get('date'),
      points_sent: Number(form.get('points_sent')),
      bonus_pct: Number(form.get('bonus_pct')),
      points_received: pointsReceived,
      transfer_fee: Number(form.get('transfer_fee')),
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
            <Label htmlFor="from_program_id">Programa de Origem</Label>
            <Select name="from_program_id" required>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {programs.filter(p => p.category === 'points').map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="to_program_id">Programa de Destino</Label>
            <Select name="to_program_id" required>
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
            <Select name="holder_id" required>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {holders.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="points_sent">Pontos Enviados</Label>
              <Input id="points_sent" name="points_sent" type="number" min="1" required
                onChange={(e) => setPointsSent(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonus_pct">Bônus (%)</Label>
              <Input id="bonus_pct" name="bonus_pct" type="number" step="0.01" min="0"
                onChange={(e) => setBonusPct(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Recebidos</Label>
              <div className="h-10 px-3 py-2 rounded-md border bg-muted text-sm flex items-center">
                {pointsReceived.toLocaleString('pt-BR')}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="transfer_fee">Taxa de Transferência (R$)</Label>
            <Input id="transfer_fee" name="transfer_fee" type="number" step="0.01" min="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input id="date" name="date" type="date" required />
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
