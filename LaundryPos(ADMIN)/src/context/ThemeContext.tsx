import React, { createContext, useContext, useState, useEffect } from 'react'

type Theme = 'light' | 'dim'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  cycleTheme: () => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dim') {
      return saved
    }
    return 'light'
  })

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  const cycleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dim' : 'light'))
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, sidebarCollapsed, toggleSidebar }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

