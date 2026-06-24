'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
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
      <PageHeader title="Novo Tipo de Operação" />
      <OpTypeForm onSubmit={handleSubmit} />
    </div>
  )
}
