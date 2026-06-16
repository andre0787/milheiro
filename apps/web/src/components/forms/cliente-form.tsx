'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

interface ClienteFormProps {
  initialData?: Record<string, unknown>
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

export function ClienteForm({ initialData, onSubmit }: ClienteFormProps) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    await onSubmit({
      name: form.get('name'),
      document: form.get('document') || null,
      telegram: form.get('telegram') || null,
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
            <Label htmlFor="document">Documento</Label>
            <Input id="document" name="document" defaultValue={initialData?.document as string} placeholder="CPF, RG, etc." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram">Telegram</Label>
            <Input id="telegram" name="telegram" defaultValue={initialData?.telegram as string} placeholder="@usuario" />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : (initialData ? 'Atualizar' : 'Salvar')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
