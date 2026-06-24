'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { ProgramForm } from '@/components/forms/program-form'

export default function NewProgramPage() {
  const router = useRouter()

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch('/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error)
    } else {
      toast.success('Programa criado!')
      router.push('/programs')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Novo Programa" />
      <ProgramForm onSubmit={handleSubmit} />
    </div>
  )
}
