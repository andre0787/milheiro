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
import { Program, Holder, Cpf, Sale } from '@/types'
import { Plus, X } from 'lucide-react'

interface TicketFormProps {
  initialData?: Record<string, unknown>
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

export function TicketForm({ initialData, onSubmit }: TicketFormProps) {
  const [loading, setLoading] = useState(false)
  const [programs, setPrograms] = useState<Program[]>([])
  const [holders, setHolders] = useState<Holder[]>([])
  const [cpfs, setCpfs] = useState<Cpf[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState((initialData?.program_id as string) ?? '')
  const [selectedHolderId, setSelectedHolderId] = useState((initialData?.holder_id as string) ?? '')
  const [selectedSaleId, setSelectedSaleId] = useState((initialData?.sale_id as string) ?? '')
  const [ticketCpfIds, setTicketCpfIds] = useState<string[]>(
    (initialData?.ticket_cpfs as unknown as Array<{ cpf_id: string }>)?.map(tc => tc.cpf_id) ?? []
  )
  const [createDialog, setCreateDialog] = useState<{ open: boolean; type: CreateType }>({ open: false, type: 'program' })

  useEffect(() => {
    fetch('/api/programs').then(r => r.json()).then(d => setPrograms(d.data ?? []))
    fetch('/api/holders').then(r => r.json()).then(d => setHolders(d.data ?? []))
    fetch('/api/clientes').then(r => r.json()).then(d => setCpfs(d.data ?? []))
    fetch('/api/sales').then(r => r.json()).then(d => setSales(d.data ?? []))
  }, [])

  function addTicketCpf() { setTicketCpfIds(prev => [...prev, '']) }
  function removeTicketCpf(idx: number) { setTicketCpfIds(prev => prev.filter((_, i) => i !== idx)) }
  function updateTicketCpf(idx: number, val: string) {
    setTicketCpfIds(prev => {
      const next = [...prev]
      if (val === '__new__') { setCreateDialog({ open: true, type: 'cpf' }); return next }
      next[idx] = val
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const data = {
      program_id: form.get('program_id'),
      holder_id: form.get('holder_id'),
      sale_id: form.get('sale_id'),
      issued_at: form.get('issued_at'),
      ticket_info: form.get('ticket_info') || null,
      outbound_date: form.get('outbound_date') || null,
      return_date: form.get('return_date') || null,
      cpf_ids: ticketCpfIds.filter(id => id && id !== '__new__'),
    }
    await onSubmit(data)
    setLoading(false)
  }

  function handleCreated(item: Record<string, unknown>, type: CreateType) {
    if (type === 'program') {
      const p = item as unknown as Program
      setPrograms(prev => [...prev, p])
      if (p.category === 'miles') setSelectedProgramId(p.id)
    } else if (type === 'holder') {
      const h = item as unknown as Holder
      setHolders(prev => [...prev, h])
      setSelectedHolderId(h.id)
    } else if (type === 'cpf') {
      const c = item as unknown as Cpf
      setCpfs(prev => [...prev, c])
      const emptyIdx = ticketCpfIds.findIndex(id => id === '')
      if (emptyIdx >= 0) {
        setTicketCpfIds(prev => { const next = [...prev]; next[emptyIdx] = c.id; return next })
      }
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
                {programs.filter(p => p.category === 'miles').map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
                <SelectSeparator />
                <SelectItem value="__new__" className="text-primary font-medium">+ Novo Programa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Viajantes (CPF)</Label>
            <div className="space-y-2">
              {ticketCpfIds.map((cpfId, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select value={cpfId || undefined} onValueChange={(v) => updateTicketCpf(idx, v as string)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um CPF...">
                          {(v) => { if (!v) return null; const c = cpfs.find(c => c.id === v); return c?.name ?? v }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {cpfs.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name} - {c.document}</SelectItem>
                        ))}
                        <SelectSeparator />
                        <SelectItem value="__new__" className="text-primary font-medium">+ Novo CPF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <button type="button" onClick={() => removeTicketCpf(idx)}
                    className="p-1 text-muted-foreground hover:text-destructive rounded">
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addTicketCpf}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <Plus className="size-3" /> Adicionar viajante
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sale_id">Venda</Label>
            <Select name="sale_id" required onValueChange={(v) => setSelectedSaleId(v as string)}>
              <SelectTrigger><SelectValue placeholder="Selecione...">
                {(v) => { if (!v) return null; const s = sales.find(s => s.id === v); return s?.program_name ?? v }}
              </SelectValue></SelectTrigger>
              <SelectContent>
                {sales.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.program_name}</SelectItem>
                ))}
                {sales.length === 0 && (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">Nenhuma venda disponível</div>
                )}
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
            <Label htmlFor="issued_at">Data do Bilhete</Label>
            <Input id="issued_at" name="issued_at" type="date" required defaultValue={initialData?.issued_at as string ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket_info">Código do Bilhete</Label>
            <Input id="ticket_info" name="ticket_info" placeholder="Ex: 123-4567890123" defaultValue={initialData?.ticket_info as string ?? ''} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="outbound_date">Data de Ida</Label>
              <Input id="outbound_date" name="outbound_date" type="date" defaultValue={initialData?.outbound_date as string ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return_date">Data de Volta</Label>
              <Input id="return_date" name="return_date" type="date" defaultValue={initialData?.return_date as string ?? ''} />
            </div>
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
