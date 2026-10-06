"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="w-10 h-10 rounded-full"></div>
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700 hover:scale-105 transition-all flex items-center justify-center"
      aria-label="Toggle Dark Mode"
    >
      {isDark ? (
        <Sun className="h-[1.2rem] w-[1.2rem] text-amber-500" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] text-indigo-600" />
      )}
    </button>
  )
}
