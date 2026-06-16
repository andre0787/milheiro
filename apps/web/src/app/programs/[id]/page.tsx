'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { ProgramForm } from '@/components/forms/program-form'

export default function EditProgramPage() {
  const router = useRouter()
  const params = useParams()
  const [initialData, setInitialData] = useState<Record<string, unknown> | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/programs/${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.data) setInitialData(d.data)
        setLoading(false)
      })
  }, [params.id])

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch(`/api/programs/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error)
    } else {
      toast.success('Programa atualizado!')
      router.push('/programs')
      router.refresh()
    }
  }

  if (loading) return <div>Carregando...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Editar Programa</h1>
      <ProgramForm initialData={initialData} onSubmit={handleSubmit} />
    </div>
  )
}
