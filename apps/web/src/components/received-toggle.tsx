"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface ReceivedToggleProps {
  saleId: string
  received: boolean
}

export function ReceivedToggle({ saleId, received }: ReceivedToggleProps) {
  const router = useRouter()

  async function toggle() {
    const res = await fetch(`/api/sales/${saleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ received: !received }),
    })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error)
    } else {
      router.refresh()
    }
  }

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer transition-colors ${
        received
          ? "bg-profit/10 text-profit hover:bg-profit/20"
          : "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
      }`}
    >
      {received ? "Recebido" : "Pendente"}
    </button>
  )
}
