import React from 'react'
import { motion } from 'framer-motion'
import { FiCheck } from 'react-icons/fi'
import './SuccessIndicator.css'

interface SuccessIndicatorProps {
  message?: string
  show?: boolean
  size?: 'small' | 'medium' | 'large'
  position?: 'inline' | 'absolute' | 'fixed'
}

const SuccessIndicator: React.FC<SuccessIndicatorProps> = ({
  message,
  show = true,
  size = 'medium',
  position = 'inline'
}) => {
  if (!show) return null

  const sizeMap = {
    small: 16,
    medium: 24,
    large: 32
  }

  return (
    <motion.div
      className={`success-indicator success-indicator-${size} success-indicator-${position}`}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      <motion.div
        className="success-indicator-icon"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
      >
        <FiCheck />
      </motion.div>
      {message && <span className="success-indicator-message">{message}</span>}
    </motion.div>
  )
}

export default SuccessIndicator

