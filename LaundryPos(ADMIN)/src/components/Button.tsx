import React from 'react'
import './Button.css'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'icon'
  children: React.ReactNode
  ariaLabel?: string
  loading?: boolean
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
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
  
  return (
    <button 
      className={`btn btn-${variant} ${loading ? 'btn-loading' : ''} ${className}`}
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

