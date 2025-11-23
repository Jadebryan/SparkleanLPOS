import React from 'react'
import './Button.css'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  ariaLabel?: string
  loading?: boolean
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md',
  children, 
  className = '',
  ariaLabel,
  loading = false,
  disabled,
  ...props 
}) => {
  // Generate aria-label from children if it's icon-only
  const isIconOnly = variant === 'icon' || (typeof children === 'object' && !Array.isArray(children))
  const finalAriaLabel = ariaLabel || (isIconOnly && typeof children === 'string' ? children : undefined)
  
  // Size class only applies to non-icon buttons
  const sizeClass = variant === 'icon' ? '' : `btn-${size}`
  
  return (
    <button 
      className={`btn btn-${variant} ${sizeClass} ${loading ? 'btn-loading' : ''} ${className}`}
      disabled={disabled || loading}
      aria-label={finalAriaLabel}
      aria-busy={loading}
      {...props}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      <span className={loading ? 'btn-content-loading' : ''}>{children}</span>
    </button>
  )
}

export default Button

