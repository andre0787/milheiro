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

interface DeleteButtonProps {
  apiEndpoint: string
  redirectTo?: string
  label?: string
}

export function DeleteButton({ apiEndpoint, redirectTo, label = "Excluir" }: DeleteButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const res = await fetch(apiEndpoint, { method: "DELETE" })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error)
    } else {
      toast.success("Registro excluído!")
      setOpen(false)
      if (redirectTo) router.push(redirectTo)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <Button variant="link" size="xs" className="text-destructive h-auto p-0" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
