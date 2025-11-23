import { useState, useRef, useEffect } from 'react'

interface UseEmailAutocompleteOptions {
  onAutocomplete?: (value: string) => void
  domain?: string
}

export const useEmailAutocomplete = (options: UseEmailAutocompleteOptions = {}) => {
  const { onAutocomplete, domain = 'gmail.com' } = options
  const [showSuggestion, setShowSuggestion] = useState(false)
  const [suggestion, setSuggestion] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionRef = useRef<HTMLDivElement>(null)

  const handleEmailInput = (value: string, onChange: (value: string) => void) => {
    const atIndex = value.indexOf('@')
    
    if (atIndex !== -1) {
      const beforeAt = value.substring(0, atIndex + 1)
      const afterAt = value.substring(atIndex + 1)
      
      // Check if there's already a domain after @
      if (!afterAt.includes('.')) {
        // Show suggestion if no domain is typed yet
        const suggestedDomain = `@${domain}`
        setSuggestion(suggestedDomain)
        setShowSuggestion(true)
      } else {
        setShowSuggestion(false)
      }
    } else {
      setShowSuggestion(false)
    }
    
    onChange(value)
  }

  const acceptSuggestion = (currentValue: string, onChange: (value: string) => void) => {
    const atIndex = currentValue.indexOf('@')
    if (atIndex !== -1) {
      const beforeAt = currentValue.substring(0, atIndex + 1)
      const newValue = beforeAt + domain
      onChange(newValue)
      setShowSuggestion(false)
      
      if (onAutocomplete) {
        onAutocomplete(newValue)
      }
      
      // Focus back to input and position cursor at end
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          const end = newValue.length
          inputRef.current.setSelectionRange(end, end)
        }
      }, 0)
    }
  }

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentValue: string,
    onChange: (value: string) => void
  ) => {
    if (showSuggestion && (e.key === 'Tab' || e.key === 'Enter')) {
      e.preventDefault()
      acceptSuggestion(currentValue, onChange)
    }
  }

  // Close suggestion when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionRef.current &&
        inputRef.current &&
        !suggestionRef.current.contains(event.target as Node) &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestion(false)
      }
    }

    if (showSuggestion) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showSuggestion])

  return {
    showSuggestion,
    suggestion,
    inputRef,
    suggestionRef,
    handleEmailInput,
    acceptSuggestion,
    handleKeyDown
  }
}

