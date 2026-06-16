"use client"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const nextTheme = theme === "dark" ? "light" : theme === "light" ? "system" : "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Tema atual: ${theme === "dark" ? "escuro" : theme === "light" ? "claro" : "sistema"}. Trocar para ${nextTheme === "dark" ? "escuro" : nextTheme === "light" ? "claro" : "sistema"}.`}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
