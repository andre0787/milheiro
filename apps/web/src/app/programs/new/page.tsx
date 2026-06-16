'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
      <h1 className="text-3xl font-bold">Novo Programa</h1>
      <ProgramForm onSubmit={handleSubmit} />
    </div>
  )
}
