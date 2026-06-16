'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

interface OpTypeFormProps {
  initialData?: Record<string, unknown>
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

export function OpTypeForm({ initialData, onSubmit }: OpTypeFormProps) {
  const [loading, setLoading] = useState(false)
  const [isPurchase, setIsPurchase] = useState(
    (initialData?.is_purchase as boolean) ?? true
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    await onSubmit({
      name: form.get('name'),
      slug: form.get('slug'),
      is_purchase: isPurchase,
    })
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
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_purchase" name="is_purchase" className="size-4 rounded border-input accent-primary" defaultChecked={isPurchase} onChange={(e) => setIsPurchase(e.target.checked)} />
            <Label htmlFor="is_purchase" className="cursor-pointer">É compra de pontos</Label>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
