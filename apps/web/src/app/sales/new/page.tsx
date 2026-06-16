'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SaleForm } from '@/components/forms/sale-form'

export default function NewSalePage() {
  const router = useRouter()

  async function handleSubmit(saleData: Record<string, unknown>, ticketData: Record<string, unknown>, ticketCpfs: string[]) {
    const saleRes = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData),
    })
    const saleJson = await saleRes.json()
    if (saleJson.error) {
      toast.error(saleJson.error)
      return
    }

    const sale = saleJson.data
    const ticketRes = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...ticketData, sale_id: sale.id, cpf_ids: ticketCpfs }),
    })
    const ticketJson = await ticketRes.json()
    if (ticketJson.error) {
      toast.error('Venda criada, mas erro no bilhete: ' + ticketJson.error)
    }

    await fetch(`/api/sales/${sale.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_id: ticketJson.data?.id }),
    })

    if (!ticketJson.error) {
      toast.success('Venda e bilhete registrados!')
    }
    router.push('/sales')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Nova Venda</h1>
      <SaleForm onSubmit={handleSubmit} />
    </div>
  )
}
