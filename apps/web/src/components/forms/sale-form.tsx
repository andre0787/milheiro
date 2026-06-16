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
import { Program, Holder, Cpf } from '@/types'
import { formatNumber, formatCurrency } from '@/lib/utils'
import { Plus, X } from 'lucide-react'

interface SaleFormProps {
  initialData?: Record<string, unknown>
  onSubmit: (sale: Record<string, unknown>, ticket: Record<string, unknown>, ticketCpfs: string[]) => Promise<void>
}

export function SaleForm({ initialData, onSubmit }: SaleFormProps) {
  const [loading, setLoading] = useState(false)
  const [programs, setPrograms] = useState<Program[]>([])
  const [holders, setHolders] = useState<Holder[]>([])
  const [cpfs, setCpfs] = useState<Cpf[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState((initialData?.program_id as string) ?? '')
  const [selectedHolderId, setSelectedHolderId] = useState((initialData?.holder_id as string) ?? '')
  const [selectedBuyerId, setSelectedBuyerId] = useState((initialData?.buyer_id as string) ?? '')
  const [pointsSold, setPointsSold] = useState(initialData?.points_sold ? Number(initialData.points_sold) : 0)
  const [saleValue, setSaleValue] = useState(initialData?.sale_value ? Number(initialData.sale_value) : 0)
  const [isReceived, setIsReceived] = useState((initialData?.received as boolean) ?? false)
  const [balance, setBalance] = useState<{ total_points: number; cpm: number } | null>(null)
  const [createDialog, setCreateDialog] = useState<{ open: boolean; type: CreateType }>({ open: false, type: 'program' })

  // Multi-CPF for ticket
  const [ticketCpfIds, setTicketCpfIds] = useState<string[]>(
    (initialData?.ticket_cpf_ids as string[]) ?? (initialData ? [''] : [])
  )

  useEffect(() => {
    fetch('/api/programs').then(r => r.json()).then(d => setPrograms(d.data ?? []))
    fetch('/api/holders').then(r => r.json()).then(d => setHolders(d.data ?? []))
    fetch('/api/clientes').then(r => r.json()).then(d => setCpfs(d.data ?? []))
  }, [])

  useEffect(() => {
    if (selectedProgramId && selectedHolderId) {
      fetch(`/api/balances?program_id=${selectedProgramId}&holder_id=${selectedHolderId}`)
        .then(r => r.json())
        .then(d => {
          if (d.data && d.data.length > 0) {
            setBalance({ total_points: d.data[0].total_points, cpm: d.data[0].cpm })
          } else {
            setBalance(null)
          }
        })
    }
  }, [selectedProgramId, selectedHolderId])

  function addTicketCpf() {
    setTicketCpfIds(prev => [...prev, ''])
  }

  function removeTicketCpf(idx: number) {
    setTicketCpfIds(prev => prev.filter((_, i) => i !== idx))
  }

  function updateTicketCpf(idx: number, val: string) {
    setTicketCpfIds(prev => {
      const next = [...prev]
      if (val === '__new__') {
        setCreateDialog({ open: true, type: 'cpf' })
        return next
      }
      next[idx] = val
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const saleData: Record<string, unknown> = {
      program_id: form.get('program_id'),
      holder_id: form.get('holder_id'),
      buyer_id: form.get('buyer_id') || null,
      date: form.get('date'),
      points_sold: Number(form.get('points_sold')),
      sale_value: Number(form.get('sale_value')),
      received: isReceived,
      notes: form.get('notes') || null,
    }
    const ticketData: Record<string, unknown> = {
      program_id: form.get('program_id'),
      holder_id: form.get('holder_id'),
      ticket_info: form.get('ticket_code') || form.get('ticket_notes') || null,
      outbound_date: form.get('outbound_date') || null,
      return_date: form.get('return_date') || null,
      issued_at: form.get('date'),
    }
    const validCpfs = ticketCpfIds.filter(id => id && id !== '__new__')
    await onSubmit(saleData, ticketData, validCpfs)
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
      // Add to ticket CPFs if any slot is empty
      const emptyIdx = ticketCpfIds.findIndex(id => id === '')
      if (emptyIdx >= 0) {
        setTicketCpfIds(prev => {
          const next = [...prev]
          next[emptyIdx] = c.id
          return next
        })
      }
    } else if (type === 'buyer') {
      const b = item as unknown as Cpf
      setCpfs(prev => [...prev, b])
      setSelectedBuyerId(b.id)
    }
  }

  return (
    <>
    <Card className="max-w-xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* 1. Programa */}
          <div className="space-y-2">
            <Label htmlFor="program_id">Programa</Label>
            <Select name="program_id" required value={selectedProgramId || undefined} onValueChange={(v) => {
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

          {/* 2. Titular */}
          <div className="space-y-2">
            <Label htmlFor="holder_id">Titular</Label>
            <Select name="holder_id" required value={selectedHolderId || undefined} onValueChange={(v) => {
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

          {/* 3. Data da Venda */}
          <div className="space-y-2">
            <Label htmlFor="date">Data da Venda</Label>
            <Input id="date" name="date" type="date" required defaultValue={initialData?.date as string ?? ''} />
          </div>

          {/* 4. Pontos Utilizados */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="points_sold">Pontos Utilizados</Label>
              <Input id="points_sold" name="points_sold" type="number" min="1" required
                onChange={(e) => setPointsSold(Number(e.target.value))} defaultValue={initialData?.points_sold as string ?? ''} />
              {balance && (
                <p className="text-xs text-muted-foreground">
                  Estoque: {formatNumber(balance.total_points)} pts | CPM médio: R$ {balance.cpm.toFixed(2)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale_value">Valor da Venda (R$)</Label>
              <Input id="sale_value" name="sale_value" type="number" step="0.01" min="0" required
                onChange={(e) => setSaleValue(Number(e.target.value))} defaultValue={initialData?.sale_value as string ?? ''} />
            </div>
          </div>

          {/* 5. Bilhete */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold mb-3">Bilhete</h3>
            <div className="space-y-3">

              {/* Código */}
              <div className="space-y-2">
                <Label htmlFor="ticket_code">Código do Bilhete</Label>
                <Input id="ticket_code" name="ticket_code" placeholder="Ex: 123-4567890123" defaultValue={initialData?.ticket_code as string ?? ''} />
              </div>

              {/* CPFs (múltiplos viajantes) */}
              <div className="space-y-2">
                <Label>Viajantes (CPF)</Label>
                <div className="space-y-2">
                  {ticketCpfIds.map((cpfId, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1">
                        <Select
                          value={cpfId || undefined}
                          onValueChange={(v) => {
                            if (v === '__new__') {
                              setCreateDialog({ open: true, type: 'cpf' })
                              return
                            }
                            updateTicketCpf(idx, v as string)
                          }}
                        >
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

              {/* Datas ida/volta */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="outbound_date">Data de Ida</Label>
                  <Input id="outbound_date" name="outbound_date" type="date" defaultValue={initialData?.ticket_outbound_date as string ?? ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="return_date">Data de Volta</Label>
                  <Input id="return_date" name="return_date" type="date" defaultValue={initialData?.ticket_return_date as string ?? ''} />
                </div>
              </div>

              {/* Info adicional */}
              <div className="space-y-2">
                <Label htmlFor="ticket_notes">Info Adicional do Bilhete</Label>
                <Input id="ticket_notes" name="ticket_notes" placeholder="Rota, classe, cia aérea..." />
              </div>
            </div>
          </div>

          {/* 6. Cliente Comprador */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold mb-3">Cliente Comprador</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="buyer_id">Nome</Label>
                <Select name="buyer_id" value={selectedBuyerId || undefined} onValueChange={(v) => {
                  if (v === '__new__') { setCreateDialog({ open: true, type: 'buyer' }); return }
                  setSelectedBuyerId(v as string)
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione ou crie um comprador...">
                    {(v) => { if (!v) return null; const c = cpfs.find(c => c.id === v); return c?.name ?? v }}
                  </SelectValue></SelectTrigger>
                  <SelectContent>
                    {cpfs.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} {c.telegram ? `(@${c.telegram})` : ''}</SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectItem value="__new__" className="text-primary font-medium">+ Novo Comprador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 7. Flag recebido */}
          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="received" checked={isReceived}
              onChange={(e) => setIsReceived(e.target.checked)}
              className="size-4 rounded border-input accent-primary" />
            <Label htmlFor="received" className="cursor-pointer">Já recebeu o pagamento</Label>
          </div>

          {/* 8. Observações */}
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
