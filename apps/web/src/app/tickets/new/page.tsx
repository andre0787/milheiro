'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { TicketForm } from '@/components/forms/ticket-form'

export default function NewTicketPage() {
  const router = useRouter()

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error)
    } else {
      toast.success('Bilhete registrado!')
      router.push('/tickets')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Novo Bilhete</h1>
      <TicketForm onSubmit={handleSubmit} />
    </div>
  )
}
