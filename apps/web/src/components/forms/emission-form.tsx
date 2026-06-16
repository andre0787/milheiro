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
import { Program, Holder, Cpf } from '@/types'

interface EmissionFormProps {
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

export function EmissionForm({ onSubmit }: EmissionFormProps) {
  const [loading, setLoading] = useState(false)
  const [programs, setPrograms] = useState<Program[]>([])
  const [holders, setHolders] = useState<Holder[]>([])
  const [cpfs, setCpfs] = useState<Cpf[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [selectedCpfId, setSelectedCpfId] = useState('')
  const [limitInfo, setLimitInfo] = useState<{ used: number; limit: number; available: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/programs').then(r => r.json()).then(d => setPrograms(d.data ?? []))
    fetch('/api/holders').then(r => r.json()).then(d => setHolders(d.data ?? []))
    fetch('/api/cpfs').then(r => r.json()).then(d => setCpfs(d.data ?? []))
  }, [])

  useEffect(() => {
    if (selectedProgramId && selectedCpfId) {
      fetch(`/api/emissions/check?program_id=${selectedProgramId}&cpf_id=${selectedCpfId}`)
        .then(r => r.json())
        .then(d => {
          if (d.data) setLimitInfo(d.data)
        })
    }
  }, [selectedProgramId, selectedCpfId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const data = {
      program_id: form.get('program_id'),
      cpf_id: form.get('cpf_id'),
      holder_id: form.get('holder_id'),
      issued_at: form.get('issued_at'),
      ticket_info: form.get('ticket_info') || null,
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
            <Label htmlFor="cpf_id">Passageiro (CPF)</Label>
            <Select name="cpf_id" required onValueChange={(v) => setSelectedCpfId(v as string)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {cpfs.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} - {c.document}</SelectItem>
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
          <div className="space-y-2">
            <Label htmlFor="issued_at">Data da Emissão</Label>
            <Input id="issued_at" name="issued_at" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket_info">Informações da Passagem</Label>
            <Input id="ticket_info" name="ticket_info" placeholder="Código, rota..." />
          </div>
          {limitInfo && (
            <div className={`rounded-md p-3 text-sm ${
              limitInfo.available ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {limitInfo.available
                ? `Limite disponível: ${limitInfo.used}/${limitInfo.limit} emissões usadas`
                : `Limite excedido: ${limitInfo.used}/${limitInfo.limit} emissões usadas`}
            </div>
          )}
          <Button type="submit" disabled={loading || (limitInfo !== null && !limitInfo.available)}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
