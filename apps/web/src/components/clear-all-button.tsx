"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface ClearAllButtonProps {
  listApi: string
  deleteApiBase: string
  label?: string
}

export function ClearAllButton({ listApi, deleteApiBase, label = "Limpar Tudo" }: ClearAllButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleClearAll() {
    setLoading(true)
    const res = await fetch(listApi)
    const json = await res.json()
    const items = json.data ?? []
    let failed = 0
    for (const item of items) {
      const r = await fetch(`${deleteApiBase}/${item.id}`, { method: "DELETE" })
      const j = await r.json()
      if (j.error) failed++
    }
    if (failed === 0) {
      toast.success(`${items.length} registro(s) excluído(s)!`)
    } else {
      toast.warning(`${items.length - failed} excluído(s), ${failed} falha(s)`)
    }
    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  return (
    <>
      <Button variant="outline" size="sm" className="text-destructive" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limpar todos os registros</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir TODOS os registros? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleClearAll} disabled={loading}>
              {loading ? "Excluindo..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
