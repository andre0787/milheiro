'use client'

import { useState } from 'react'
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

interface ProgramFormProps {
  initialData?: Record<string, unknown>
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

export function ProgramForm({ initialData, onSubmit }: ProgramFormProps) {
  const [loading, setLoading] = useState(false)
  const [limitWindowType, setLimitWindowType] = useState(
    (initialData?.limit_window_type as string) ?? 'none'
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const data: Record<string, unknown> = {
      name: form.get('name'),
      slug: form.get('slug'),
      emission_limit: Number(form.get('emission_limit')),
      limit_window_type: limitWindowType,
      limit_window_days: Number(form.get('limit_window_days')),
      limit_start_date: form.get('limit_start_date') || null,
      cooldown_days: Number(form.get('cooldown_days')),
    }
    await onSubmit(data)
    setLoading(false)
  }

  return (
    <Card className="max-w-xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={initialData?.name as string} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" defaultValue={initialData?.slug as string} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emission_limit">Limite de Emissões</Label>
            <Input id="emission_limit" name="emission_limit" type="number" defaultValue={initialData?.emission_limit as string ?? '0'} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="limit_window_type">Tipo de Janela</Label>
            <Select value={limitWindowType} onValueChange={(value) => value && setLimitWindowType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                <SelectItem value="rolling">Rolling</SelectItem>
                <SelectItem value="fixed">Fixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {limitWindowType === 'rolling' && (
            <div className="space-y-2">
              <Label htmlFor="limit_window_days">Dias da Janela</Label>
              <Input id="limit_window_days" name="limit_window_days" type="number" defaultValue={initialData?.limit_window_days as string ?? '365'} />
            </div>
          )}
          {limitWindowType === 'fixed' && (
            <div className="space-y-2">
              <Label htmlFor="limit_start_date">Data de Início</Label>
              <Input id="limit_start_date" name="limit_start_date" type="date" defaultValue={initialData?.limit_start_date as string} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="cooldown_days">Carência (dias)</Label>
            <Input id="cooldown_days" name="cooldown_days" type="number" defaultValue={initialData?.cooldown_days as string ?? '0'} />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
