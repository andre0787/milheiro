'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { EntryForm } from '@/components/forms/entry-form'

export default function NewEntryPage() {
  const router = useRouter()

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error)
    } else {
      toast.success('Entrada registrada!')
      router.push('/entries')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Nova Entrada" />
      <EntryForm onSubmit={handleSubmit} />
    </div>
  )
}
