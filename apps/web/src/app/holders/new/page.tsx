'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { HolderForm } from '@/components/forms/holder-form'

export default function NewHolderPage() {
  const router = useRouter()

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch('/api/holders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error)
    } else {
      toast.success('Titular criado!')
      router.push('/holders')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Novo Titular" />
      <HolderForm onSubmit={handleSubmit} />
    </div>
  )
}
