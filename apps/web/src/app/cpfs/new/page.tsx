'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CpfForm } from '@/components/forms/cpf-form'

export default function NewCpfPage() {
  const router = useRouter()

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch('/api/cpfs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error)
    } else {
      toast.success('CPF cadastrado!')
      router.push('/cpfs')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Novo CPF</h1>
      <CpfForm onSubmit={handleSubmit} />
    </div>
  )
}
