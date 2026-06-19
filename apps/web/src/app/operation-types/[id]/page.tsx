'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { OpTypeForm } from '@/components/forms/op-type-form'

export default function EditOpTypePage() {
  const router = useRouter()
  const params = useParams()
  const [initialData, setInitialData] = useState<Record<string, unknown> | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/operation-types/${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.data) setInitialData(d.data)
        setLoading(false)
      })
  }, [params.id])

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch(`/api/operation-types/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error)
    } else {
      toast.success('Tipo de operação atualizado!')
      router.push('/operation-types')
      router.refresh()
    }
  }

  if (loading) return <div>Carregando...</div>

  return (
    <div className="space-y-6">
      <PageHeader title="Editar Tipo de Operação" />
      <OpTypeForm initialData={initialData} onSubmit={handleSubmit} />
    </div>
  )
}
