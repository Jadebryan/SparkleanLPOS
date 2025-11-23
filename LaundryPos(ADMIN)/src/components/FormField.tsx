import React, { useState } from 'react'
import { FiCheck, FiX, FiAlertCircle, FiEye, FiEyeOff } from 'react-icons/fi'
import './FormField.css'

interface FormFieldProps {
  label: string
  name: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date' | 'textarea' | 'select'
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  error?: string
  success?: boolean
  required?: boolean
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  showCharCount?: boolean
  validation?: 'email' | 'phone' | 'required' | 'custom'
  customValidation?: (value: string) => boolean
  options?: Array<{ value: string; label: string }>
  rows?: number
  helperText?: string
  icon?: React.ReactNode
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  success,
  required,
  placeholder,
  disabled,
  maxLength,
  showCharCount,
  validation,
  customValidation,
  options,
  rows = 4,
  helperText,
  icon
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

  const handleBlur = () => {
    setIsFocused(false)
    setHasInteracted(true)
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const getValidationState = () => {
    if (error) return 'error'
    if (success) return 'success'
    if (hasInteracted && value) {
      if (validation === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(value as string) ? 'success' : 'error'
      }
      if (validation === 'phone') {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/
        return phoneRegex.test(value as string) ? 'success' : 'error'
      }
      if (customValidation) {
        return customValidation(value as string) ? 'success' : 'error'
      }
    }
    return 'default'
  }

  const validationState = getValidationState()
  const showValidationIcon = validationState !== 'default' && hasInteracted && value
  const currentLength = String(value || '').length

  const inputId = `field-${name}`

  return (
    <div className={`form-field form-field-${validationState} ${isFocused ? 'focused' : ''} ${disabled ? 'disabled' : ''}`}>
      <label htmlFor={inputId} className="form-field-label">
        {label}
        {required && <span className="form-field-required">*</span>}
      </label>
      
      <div className="form-field-input-wrapper">
        {icon && <div className="form-field-icon-left">{icon}</div>}
        
        {type === 'textarea' ? (
          <textarea
            id={inputId}
            name={name}
            value={value as string}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            rows={rows}
            className="form-field-input form-field-textarea"
            aria-invalid={validationState === 'error'}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          />
        ) : type === 'select' ? (
          <select
            id={inputId}
            name={name}
            value={value as string}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            className="form-field-input form-field-select"
            aria-invalid={validationState === 'error'}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          >
            {options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={inputId}
            name={name}
            type={type === 'password' && showPassword ? 'text' : type}
            value={value}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            className="form-field-input"
            aria-invalid={validationState === 'error'}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          />
        )}
        
        {type === 'password' && (
          <button
            type="button"
            className="form-field-icon-right form-field-password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        )}
        
        {showValidationIcon && type !== 'password' && (
          <div className={`form-field-icon-right form-field-validation-icon form-field-validation-${validationState}`}>
            {validationState === 'success' ? <FiCheck /> : <FiX />}
          </div>
        )}
      </div>
      
      <div className="form-field-footer">
        {error && (
          <div id={`${inputId}-error`} className="form-field-error" role="alert">
            <FiAlertCircle />
            <span>{error}</span>
          </div>
        )}
        {!error && helperText && (
          <div id={`${inputId}-helper`} className="form-field-helper">
            {helperText}
          </div>
        )}
        {showCharCount && maxLength && (
          <div className="form-field-char-count">
            {currentLength} / {maxLength}
          </div>
        )}
      </div>
    </div>
  )
}

export default FormField

