import React from 'react'
import { useEmailAutocomplete } from '../hooks/useEmailAutocomplete'
import './EmailInput.css'

interface EmailInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onAutocomplete?: (value: string) => void
  domain?: string
}

const EmailInput: React.FC<EmailInputProps> = ({
  value,
  onChange,
  onAutocomplete,
  domain,
  className = '',
  ...props
}) => {
  const {
    showSuggestion,
    suggestion,
    inputRef,
    suggestionRef,
    handleEmailInput,
    acceptSuggestion,
    handleKeyDown
  } = useEmailAutocomplete({ onAutocomplete, domain })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleEmailInput(e.target.value, (newValue) => {
      onChange({ ...e, target: { ...e.target, value: newValue } } as React.ChangeEvent<HTMLInputElement>)
    })
  }

  const handleKeyDownWrapper = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleKeyDown(e, value, (newValue) => {
      onChange({ target: { value: newValue } } as React.ChangeEvent<HTMLInputElement>)
    })
    // Call original onKeyDown if provided
    if (props.onKeyDown) {
      props.onKeyDown(e)
    }
  }

  const atIndex = value.indexOf('@')
  const beforeAt = atIndex !== -1 ? value.substring(0, atIndex + 1) : ''
  const displaySuggestion = showSuggestion && beforeAt

  return (
    <div className="email-input-wrapper">
      <input
        {...props}
        ref={inputRef}
        type="email"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDownWrapper}
        className={`email-input ${className}`}
        autoCapitalize="none"
        autoComplete="off"
      />
      {displaySuggestion && (
        <div
          ref={suggestionRef}
          className="email-suggestion"
          onClick={() => acceptSuggestion(value, (newValue) => {
            onChange({ target: { value: newValue } } as React.ChangeEvent<HTMLInputElement>)
          })}
        >
          <span className="email-suggestion-prefix">{beforeAt}</span>
          <span className="email-suggestion-domain">{suggestion.replace('@', '')}</span>
          <span className="email-suggestion-hint">Press Tab or Enter</span>
        </div>
      )}
    </div>
  )
}

export default EmailInput

