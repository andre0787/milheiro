'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { TransferForm } from '@/components/forms/transfer-form'

export default function NewTransferPage() {
  const router = useRouter()

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch('/api/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error)
    } else {
      toast.success('Transferência registrada!')
      router.push('/transfers')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Nova Transferência" />
      <TransferForm onSubmit={handleSubmit} />
    </div>
  )
}
