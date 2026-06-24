'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { SaleForm } from '@/components/forms/sale-form'

export default function EditSalePage() {
  const router = useRouter()
  const params = useParams()
  const [initialData, setInitialData] = useState<Record<string, unknown> | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/sales/${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.data) setInitialData(d.data)
        setLoading(false)
      })
  }, [params.id])

  async function handleSubmit(data: Record<string, unknown>, _ticket: Record<string, unknown>, _cpfs: string[]) {
    const res = await fetch(`/api/sales/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error)
    } else {
      toast.success('Venda atualizada!')
      router.push('/sales')
      router.refresh()
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground p-6">Carregando...</div>

  return (
    <div className="space-y-6">
      <PageHeader title="Editar Venda" />
      <SaleForm initialData={initialData} onSubmit={handleSubmit} />
    </div>
  )
}
