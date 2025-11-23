import { useEffect } from 'react'

interface ShortcutConfig {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  callback: () => void
}

export const useKeyboardShortcut = (shortcuts: ShortcutConfig[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach(({ key, ctrl, shift, alt, callback }) => {
        const keyMatches = event.key.toLowerCase() === key.toLowerCase()
        const ctrlMatches = ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
        const shiftMatches = shift ? event.shiftKey : !event.shiftKey
        const altMatches = alt ? event.altKey : !event.altKey

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          // Always prevent default browser behavior for our shortcuts
          event.preventDefault()
          event.stopPropagation()
          event.stopImmediatePropagation()
          callback()
          return
        }
      })
    }

    // Use capture phase to intercept before browser default handlers
    // This is critical for shortcuts like Ctrl+N which browsers handle by default
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [shortcuts])
}

