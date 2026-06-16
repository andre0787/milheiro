import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { CpfsTable } from '@/components/tables/cpfs-table'

export default async function CpfsPage() {
  const supabase = await createClient()
  const { data: cpfs } = await supabase.from('cpfs').select('*').order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">CPFs</h1>
        <Button render={<Link href="/cpfs/new" />}>Novo CPF</Button>
      </div>
      <CpfsTable data={cpfs ?? []} />
    </div>
  )
}
