'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SaleForm } from '@/components/forms/sale-form'

export default function NewSalePage() {
  const router = useRouter()

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error)
    } else {
      toast.success('Venda registrada!')
      router.push('/sales')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Nova Venda</h1>
      <SaleForm onSubmit={handleSubmit} />
    </div>
  )
}
