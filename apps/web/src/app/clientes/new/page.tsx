'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { ClienteForm } from '@/components/forms/cliente-form'

export default function NewClientePage() {
  const router = useRouter()

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error)
    } else {
      toast.success('Cliente cadastrado!')
      router.push('/clientes')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Novo Cliente" />
      <ClienteForm onSubmit={handleSubmit} />
    </div>
  )
}
