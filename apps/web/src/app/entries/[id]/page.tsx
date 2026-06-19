'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { EntryForm } from '@/components/forms/entry-form'

export default function EditEntryPage() {
  const router = useRouter()
  const params = useParams()
  const [initialData, setInitialData] = useState<Record<string, unknown> | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/entries/${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.data) setInitialData(d.data)
        setLoading(false)
      })
  }, [params.id])

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch(`/api/entries/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error)
    } else {
      toast.success('Entrada atualizada!')
      router.push('/entries')
      router.refresh()
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground p-6">Carregando...</div>

  return (
    <div className="space-y-6">
      <PageHeader title="Editar Entrada" />
      <EntryForm initialData={initialData} onSubmit={handleSubmit} />
    </div>
  )
}
