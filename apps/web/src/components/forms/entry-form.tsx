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
import { Program, Holder, OperationType } from '@/types'

interface EntryFormProps {
  initialData?: Record<string, unknown>
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

export function EntryForm({ initialData, onSubmit }: EntryFormProps) {
  const [loading, setLoading] = useState(false)
  const [programs, setPrograms] = useState<Program[]>([])
  const [holders, setHolders] = useState<Holder[]>([])
  const [opTypes, setOpTypes] = useState<OperationType[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState((initialData?.program_id as string) ?? '')
  const [selectedHolderId, setSelectedHolderId] = useState((initialData?.holder_id as string) ?? '')
  const [selectedOpTypeId, setSelectedOpTypeId] = useState((initialData?.operation_type_id as string) ?? '')
  const [createDialog, setCreateDialog] = useState<{ open: boolean; type: CreateType }>({ open: false, type: 'program' })

  useEffect(() => {
    fetch('/api/programs').then(r => r.json()).then(d => setPrograms(d.data ?? []))
    fetch('/api/holders').then(r => r.json()).then(d => setHolders(d.data ?? []))
    fetch('/api/operation-types').then(r => r.json()).then(d => setOpTypes(d.data ?? []))
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const data = {
      program_id: form.get('program_id'),
      holder_id: form.get('holder_id'),
      operation_type_id: form.get('operation_type_id') || null,
      date: form.get('date'),
      points: Number(form.get('points')),
      cost: Number(form.get('cost')),
      notes: form.get('notes') || null,
    }
    await onSubmit(data)
    setLoading(false)
  }

  function handleCreated(item: Record<string, unknown>, type: CreateType) {
    if (type === 'program') {
      const p = item as unknown as Program
      setPrograms(prev => [...prev, p])
      setSelectedProgramId(p.id)
    } else if (type === 'holder') {
      const h = item as unknown as Holder
      setHolders(prev => [...prev, h])
      setSelectedHolderId(h.id)
    } else if (type === 'optype') {
      const t = item as unknown as OperationType
      setOpTypes(prev => [...prev, t])
      setSelectedOpTypeId(t.id)
    }
  }

  return (
    <>
    <Card className="max-w-xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="program_id">Programa</Label>
            <Select name="program_id" required onValueChange={(v) => {
              if (v === '__new__') { setCreateDialog({ open: true, type: 'program' }); return }
              setSelectedProgramId(v as string)
            }}>
              <SelectTrigger><SelectValue placeholder="Selecione...">
                {(v) => { if (!v) return null; const p = programs.find(p => p.id === v); return p?.name ?? v }}
              </SelectValue></SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
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
          <div className="space-y-2">
            <Label htmlFor="operation_type_id">Tipo de Operação</Label>
            <Select name="operation_type_id" onValueChange={(v) => {
              if (v === '__new__') { setCreateDialog({ open: true, type: 'optype' }); return }
              setSelectedOpTypeId(v as string)
            }}>
              <SelectTrigger><SelectValue placeholder="Selecione...">
                {(v) => { if (!v) return null; const t = opTypes.find(t => t.id === v); return t?.name ?? v }}
              </SelectValue></SelectTrigger>
              <SelectContent>
                {opTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
                <SelectSeparator />
                <SelectItem value="__new__" className="text-primary font-medium">+ Novo Tipo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input id="date" name="date" type="date" required defaultValue={initialData?.date as string ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="points">Quantidade de Pontos</Label>
            <Input id="points" name="points" type="number" min="1" required defaultValue={initialData?.points as string ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost">Valor Pago (R$)</Label>
            <Input id="cost" name="cost" type="number" step="0.01" min="0" required defaultValue={initialData?.cost as string ?? ''} />
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
