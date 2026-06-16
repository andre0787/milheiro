'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { EmissionForm } from '@/components/forms/emission-form'

export default function NewEmissionPage() {
  const router = useRouter()

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch('/api/emissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error)
    } else {
      toast.success('Emissão registrada!')
      router.push('/emissions')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Nova Emissão</h1>
      <EmissionForm onSubmit={handleSubmit} />
    </div>
  )
}
