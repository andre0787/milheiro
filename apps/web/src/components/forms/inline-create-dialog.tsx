"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type CreateType = "program" | "holder" | "cpf" | "buyer" | "optype"

interface InlineCreateDialogProps {
  type: CreateType
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (item: Record<string, unknown>) => void
}

const apiMap: Record<CreateType, string> = {
  program: "/api/programs",
  holder: "/api/holders",
  cpf: "/api/clientes",
  buyer: "/api/clientes",
  optype: "/api/operation-types",
}

const titleMap: Record<CreateType, string> = {
  program: "Novo Programa",
  holder: "Novo Titular",
  cpf: "Novo Cliente",
  buyer: "Novo Comprador",
  optype: "Novo Tipo de Operação",
}

export function InlineCreateDialog({ type, open, onOpenChange, onCreated }: InlineCreateDialogProps) {
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState("points")
  const [isPurchase, setIsPurchase] = useState(true)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)

    let body: Record<string, unknown> = {}
    if (type === "program") {
      body = { name: form.get("name"), slug: form.get("slug"), category }
    } else if (type === "holder") {
      body = { name: form.get("name") }
    } else if (type === "cpf" || type === "buyer") {
      const doc = form.get("document") as string
      const telegram = form.get("telegram") as string
      body = { name: form.get("name"), document: doc || null, telegram: telegram || null }
    } else if (type === "optype") {
      body = { name: form.get("name"), slug: form.get("slug"), is_purchase: isPurchase }
    }

    const res = await fetch(apiMap[type], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error)
    } else {
      toast.success(`${titleMap[type]} criado!`)
      onCreated(json.data)
      onOpenChange(false)
      // Reset form
      setCategory("points"); setIsPurchase(true);
      (e.target as HTMLFormElement).reset()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titleMap[type]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inline-name">Nome</Label>
            <Input id="inline-name" name="name" required autoFocus />
          </div>
          {(type === "program" || type === "optype") && (
            <div className="space-y-2">
              <Label htmlFor="inline-slug">Slug</Label>
              <Input id="inline-slug" name="slug" required placeholder="nome-do-programa" />
            </div>
          )}
          {type === "program" && (
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="points">Pontos</SelectItem>
                  <SelectItem value="miles">Milhas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {type === "optype" && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="inline-is-purchase" checked={isPurchase}
                onChange={(e) => setIsPurchase(e.target.checked)}
                className="size-4 rounded border-input accent-primary" />
              <Label htmlFor="inline-is-purchase" className="cursor-pointer">É compra de pontos</Label>
            </div>
          )}
          {type === "cpf" && (
            <>
            <div className="space-y-2">
              <Label htmlFor="inline-document">CPF (opcional)</Label>
              <Input id="inline-document" name="document" placeholder="000.000.000-00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inline-telegram">Telegram (opcional)</Label>
              <Input id="inline-telegram" name="telegram" placeholder="@usuario" />
            </div>
            </>
          )}
          {type === "buyer" && (
            <div className="space-y-2">
              <Label htmlFor="inline-telegram">Telegram</Label>
              <Input id="inline-telegram" name="telegram" placeholder="@usuario" />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
