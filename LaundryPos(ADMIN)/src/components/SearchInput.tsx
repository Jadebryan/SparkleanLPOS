import React, { useState, useRef, useEffect } from 'react'
import { FiSearch, FiX, FiClock } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import './SearchInput.css'

interface SearchSuggestion {
  id: string
  label: string
  category?: string
}

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  suggestions?: SearchSuggestion[]
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void
  showHistory?: boolean
  maxHistoryItems?: number
  debounceMs?: number
  className?: string
  autoFocus?: boolean
}

const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  suggestions = [],
  onSuggestionSelect,
  showHistory = true,
  maxHistoryItems = 5,
  debounceMs = 300,
  className = '',
  autoFocus = false
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load search history from localStorage
  useEffect(() => {
    if (showHistory) {
      const saved = localStorage.getItem('search-history')
      if (saved) {
        try {
          setSearchHistory(JSON.parse(saved))
        } catch (e) {
          console.error('Failed to parse search history:', e)
        }
      }
    }
  }, [showHistory])

  // Save search to history
  const saveToHistory = (searchTerm: string) => {
    if (!searchTerm.trim() || !showHistory) return
    
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== searchTerm.toLowerCase())
      const updated = [searchTerm, ...filtered].slice(0, maxHistoryItems)
      localStorage.setItem('search-history', JSON.stringify(updated))
      return updated
    })
  }

  // Debounced onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      if (value) {
        saveToHistory(value)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [value, debounceMs])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    setShowSuggestions(true)
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onChange(suggestion.label)
    setShowSuggestions(false)
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion)
    }
    inputRef.current?.blur()
  }

  const handleHistoryClick = (term: string) => {
    onChange(term)
    setShowSuggestions(false)
    inputRef.current?.blur()
  }

  const clearSearch = () => {
    onChange('')
    inputRef.current?.focus()
  }

  const clearHistory = () => {
    setSearchHistory([])
    localStorage.removeItem('search-history')
  }

  const displaySuggestions = suggestions.length > 0 ? suggestions : []
  const displayHistory = showHistory && searchHistory.length > 0 && !value && isFocused

  return (
    <div ref={containerRef} className={`search-input-container ${className}`}>
      <div className={`search-input-wrapper ${isFocused ? 'focused' : ''}`}>
        <FiSearch className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            setIsFocused(true)
            setShowSuggestions(true)
          }}
          onBlur={() => {
            setIsFocused(false)
            // Delay to allow suggestion clicks
            setTimeout(() => setShowSuggestions(false), 200)
          }}
          placeholder={placeholder}
          className="search-input"
          autoFocus={autoFocus}
          aria-label={placeholder}
          aria-autocomplete="list"
          aria-expanded={showSuggestions || displayHistory}
          aria-controls="search-suggestions"
        />
        {value && (
          <button
            type="button"
            className="search-clear"
            onClick={clearSearch}
            aria-label="Clear search"
          >
            <FiX />
          </button>
        )}
      </div>

      <AnimatePresence>
        {(showSuggestions && displaySuggestions.length > 0) || displayHistory ? (
          <motion.div
            id="search-suggestions"
            className="search-suggestions"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {displayHistory && (
              <div className="search-suggestions-section">
                <div className="search-suggestions-header">
                  <span>Recent Searches</span>
                  <button
                    type="button"
                    className="search-clear-history"
                    onClick={clearHistory}
                    aria-label="Clear search history"
                  >
                    Clear
                  </button>
                </div>
                {searchHistory.map((term, index) => (
                  <button
                    key={index}
                    type="button"
                    className="search-suggestion-item search-history-item"
                    onClick={() => handleHistoryClick(term)}
                  >
                    <FiClock />
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            )}

            {displaySuggestions.length > 0 && (
              <div className="search-suggestions-section">
                {displaySuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className="search-suggestion-item"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <span className="search-suggestion-label">{suggestion.label}</span>
                    {suggestion.category && (
                      <span className="search-suggestion-category">{suggestion.category}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default SearchInput

