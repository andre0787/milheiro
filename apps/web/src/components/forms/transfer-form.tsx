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
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InlineCreateDialog, type CreateType } from '@/components/forms/inline-create-dialog'
import { Program, Holder } from '@/types'

interface TransferFormProps {
  initialData?: Record<string, unknown>
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

export function TransferForm({ initialData, onSubmit }: TransferFormProps) {
  const [loading, setLoading] = useState(false)
  const [programs, setPrograms] = useState<Program[]>([])
  const [holders, setHolders] = useState<Holder[]>([])
  const [pointsSent, setPointsSent] = useState(0)
  const [bonusPct, setBonusPct] = useState(0)
  const [selectedFromId, setSelectedFromId] = useState((initialData?.from_program_id as string) ?? '')
  const [selectedToId, setSelectedToId] = useState((initialData?.to_program_id as string) ?? '')
  const [selectedHolderId, setSelectedHolderId] = useState((initialData?.holder_id as string) ?? '')
  const [createDialog, setCreateDialog] = useState<{ open: boolean; type: CreateType }>({ open: false, type: 'program' })

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

  function handleCreated(item: Record<string, unknown>, type: CreateType) {
    if (type === 'program') {
      const p = item as unknown as Program
      setPrograms(prev => [...prev, p])
      if (p.category === 'points') setSelectedFromId(p.id)
      else setSelectedToId(p.id)
    } else if (type === 'holder') {
      const h = item as unknown as Holder
      setHolders(prev => [...prev, h])
      setSelectedHolderId(h.id)
    }
  }

  return (
    <>
    <Card className="max-w-xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="from_program_id">Programa de Origem</Label>
            <Select name="from_program_id" required onValueChange={(v) => {
              if (v === '__new__') { setCreateDialog({ open: true, type: 'program' }); return }
              setSelectedFromId(v as string)
            }}>
              <SelectTrigger><SelectValue placeholder="Selecione...">
                {(v) => { if (!v) return null; const p = programs.find(p => p.id === v); return p?.name ?? v }}
              </SelectValue></SelectTrigger>
              <SelectContent>
                {programs.filter(p => p.category === 'points').map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
                <SelectSeparator />
                <SelectItem value="__new__" className="text-primary font-medium">+ Novo Programa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="to_program_id">Programa de Destino</Label>
            <Select name="to_program_id" required onValueChange={(v) => {
              if (v === '__new__') { setCreateDialog({ open: true, type: 'program' }); return }
              setSelectedToId(v as string)
            }}>
              <SelectTrigger><SelectValue placeholder="Selecione...">
                {(v) => { if (!v) return null; const p = programs.find(p => p.id === v); return p?.name ?? v }}
              </SelectValue></SelectTrigger>
              <SelectContent>
                {programs.filter(p => p.category === 'miles').map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
                <SelectSeparator />
                <SelectItem value="__new__" className="text-primary font-medium">+ Novo Programa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="holder_id">Titular</Label>
            <Select name="holder_id" required onValueChange={(v) => {
              if (v === '__new__') { setCreateDialog({ open: true, type: 'holder' }); return }
              setSelectedHolderId(v as string)
            }}>
              <SelectTrigger><SelectValue placeholder="Selecione...">
                {(v) => { if (!v) return null; const h = holders.find(h => h.id === v); return h?.name ?? v }}
              </SelectValue></SelectTrigger>
              <SelectContent>
                {holders.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
                <SelectSeparator />
                <SelectItem value="__new__" className="text-primary font-medium">+ Novo Titular</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="points_sent">Pontos Enviados</Label>
              <Input id="points_sent" name="points_sent" type="number" min="1" required
                onChange={(e) => setPointsSent(Number(e.target.value))} defaultValue={initialData?.points_sent as string ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonus_pct">Bônus (%)</Label>
              <Input id="bonus_pct" name="bonus_pct" type="number" step="0.01" min="0"
                onChange={(e) => setBonusPct(Number(e.target.value))} defaultValue={initialData?.bonus_pct as string ?? ''} />
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
            <Input id="transfer_fee" name="transfer_fee" type="number" step="0.01" min="0" defaultValue={initialData?.transfer_fee as string ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input id="date" name="date" type="date" required defaultValue={initialData?.date as string ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Input id="notes" name="notes" defaultValue={initialData?.notes as string ?? ''} />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : (initialData ? 'Atualizar' : 'Salvar')}
          </Button>
        </form>
      </CardContent>
    </Card>
      <InlineCreateDialog
        type={createDialog.type}
        open={createDialog.open}
        onOpenChange={(open) => setCreateDialog(prev => ({ ...prev, open }))}
        onCreated={(item) => handleCreated(item, createDialog.type)}
      />
    </>
  )
}
