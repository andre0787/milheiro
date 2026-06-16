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
  const [category, setCategory] = useState(
    (initialData?.category as string) ?? 'points'
  )
  const [limitWindowType, setLimitWindowType] = useState(
    (initialData?.limit_window_type as string) ?? 'none'
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const isMiles = category === 'miles'
    const data: Record<string, unknown> = {
      name: form.get('name'),
      slug: form.get('slug'),
      category,
      emission_limit: isMiles ? Number(form.get('emission_limit')) : 0,
      limit_window_type: isMiles ? limitWindowType : 'none',
      limit_window_days: isMiles && limitWindowType === 'rolling' ? Number(form.get('limit_window_days')) : 365,
      limit_start_date: isMiles && limitWindowType === 'fixed' ? (form.get('limit_start_date') || null) : null,
      cooldown_days: isMiles ? Number(form.get('cooldown_days')) : 0,
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
            <Label htmlFor="category">Tipo</Label>
            <Select value={category} onValueChange={(v) => { setCategory(v as string); setLimitWindowType('none') }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="points">Pontos</SelectItem>
                <SelectItem value="miles">Milhas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {category === 'miles' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="emission_limit">Limite de Emissões</Label>
                <Input id="emission_limit" name="emission_limit" type="number" defaultValue={initialData?.emission_limit as string ?? '5'} />
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
            </>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
