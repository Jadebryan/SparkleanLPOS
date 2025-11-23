import React from 'react'
import { motion } from 'framer-motion'
import { FiInbox, FiPackage, FiUsers, FiFileText, FiSearch, FiAlertCircle } from 'react-icons/fi'
import Button from './Button'
import './EmptyState.css'

interface EmptyStateProps {
  icon?: React.ReactNode | string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  type?: 'default' | 'no-results' | 'error' | 'empty'
}

const iconMap = {
  default: <FiInbox />,
  'no-results': <FiSearch />,
  error: <FiAlertCircle />,
  empty: <FiPackage />
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  type = 'default'
}) => {
  const defaultIcon = icon || iconMap[type]
  const isStringIcon = typeof defaultIcon === 'string'

  return (
    <motion.div
      className={`empty-state empty-state-${type}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="empty-state-icon"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
      >
        {isStringIcon ? (
          <span className="empty-state-emoji">{defaultIcon}</span>
        ) : (
          <div className="empty-state-svg-icon">{defaultIcon}</div>
        )}
      </motion.div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {(actionLabel || secondaryActionLabel) && (
        <div className="empty-state-actions">
          {actionLabel && onAction && (
            <Button onClick={onAction} variant="primary">
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button onClick={onSecondaryAction} variant="secondary">
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default EmptyState

