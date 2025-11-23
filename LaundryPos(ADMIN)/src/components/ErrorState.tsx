import React from 'react'
import { motion } from 'framer-motion'
import { FiAlertCircle, FiRefreshCw, FiHome, FiX } from 'react-icons/fi'
import Button from './Button'
import './ErrorState.css'

interface ErrorStateProps {
  title?: string
  message: string
  error?: Error | string
  onRetry?: () => void
  onGoHome?: () => void
  onDismiss?: () => void
  showDetails?: boolean
  variant?: 'default' | 'network' | 'not-found' | 'server'
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  error,
  onRetry,
  onGoHome,
  onDismiss,
  showDetails = false,
  variant = 'default'
}) => {
  const errorMessage = error instanceof Error ? error.message : error || 'An unexpected error occurred'
  
  const getVariantConfig = () => {
    switch (variant) {
      case 'network':
        return {
          icon: <FiAlertCircle />,
          title: title || 'Network Error',
          description: message || 'Unable to connect to the server. Please check your internet connection.',
          color: 'var(--color-warning, #d97706)'
        }
      case 'not-found':
        return {
          icon: <FiAlertCircle />,
          title: title || 'Not Found',
          description: message || 'The requested resource could not be found.',
          color: 'var(--color-gray-500, #6b7280)'
        }
      case 'server':
        return {
          icon: <FiAlertCircle />,
          title: title || 'Server Error',
          description: message || 'The server encountered an error. Please try again later.',
          color: 'var(--color-error, #dc2626)'
        }
      default:
        return {
          icon: <FiAlertCircle />,
          title: title || 'Something went wrong',
          description: message,
          color: 'var(--color-error, #dc2626)'
        }
    }
  }

  const config = getVariantConfig()

  return (
    <motion.div
      className={`error-state error-state-${variant}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {onDismiss && (
        <button
          className="error-state-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss error"
          type="button"
        >
          <FiX />
        </button>
      )}
      
      <motion.div
        className="error-state-icon"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        style={{ color: config.color }}
      >
        {config.icon}
      </motion.div>
      
      <h3 className="error-state-title">{config.title}</h3>
      <p className="error-state-description">{config.description}</p>
      
      {showDetails && errorMessage && (
        <details className="error-state-details">
          <summary className="error-state-details-summary">Technical Details</summary>
          <pre className="error-state-details-content">{errorMessage}</pre>
        </details>
      )}
      
      <div className="error-state-actions">
        {onRetry && (
          <Button onClick={onRetry} variant="primary">
            <FiRefreshCw /> Retry
          </Button>
        )}
        {onGoHome && (
          <Button onClick={onGoHome} variant="secondary">
            <FiHome /> Go Home
          </Button>
        )}
      </div>
    </motion.div>
  )
}

export default ErrorState

