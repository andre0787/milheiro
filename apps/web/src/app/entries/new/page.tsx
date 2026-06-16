'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
      <h1 className="text-3xl font-bold">Nova Entrada</h1>
      <EntryForm onSubmit={handleSubmit} />
    </div>
  )
}
