'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { OpTypeForm } from '@/components/forms/op-type-form'

export default function NewOpTypePage() {
  const router = useRouter()

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch('/api/operation-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error)
    } else {
      toast.success('Tipo de operação criado!')
      router.push('/operation-types')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Novo Tipo de Operação</h1>
      <OpTypeForm onSubmit={handleSubmit} />
    </div>
  )
}
