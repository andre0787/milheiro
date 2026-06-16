"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"

type Theme = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function resolveTheme(theme: Theme, isSystemDark: boolean): ResolvedTheme {
  if (theme === "dark") return "dark"
  if (theme === "light") return "light"
  return isSystemDark ? "dark" : "light"
}

function applyThemeToDOM(resolved: ResolvedTheme) {
  const root = document.documentElement
  if (resolved === "dark") {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system")
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("milheiro-theme")
    if (saved === "dark" || saved === "light") {
      setThemeState(saved)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const resolved = resolveTheme(theme, mediaQuery.matches)
    setResolvedTheme(resolved)
    applyThemeToDOM(resolved)

    function handleChange() {
      if (theme === "system") {
        const r = resolveTheme("system", mediaQuery.matches)
        setResolvedTheme(r)
        applyThemeToDOM(r)
      }
    }
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme, mounted])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    if (t === "system") {
      localStorage.removeItem("milheiro-theme")
    } else {
      localStorage.setItem("milheiro-theme", t)
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
