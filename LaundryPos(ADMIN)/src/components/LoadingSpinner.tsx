import React from 'react'
import { motion } from 'framer-motion'
import './LoadingSpinner.css'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  fullScreen?: boolean
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'medium', fullScreen = false }) => {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 60
  }

  const spinnerSize = sizeMap[size]

  const spinner = (
    <motion.div
      className={`loading-spinner ${size}`}
      style={{ width: spinnerSize, height: spinnerSize }}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <svg viewBox="0 0 50 50">
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
        />
      </svg>
    </motion.div>
  )

  if (fullScreen) {
    return (
      <div className="loading-spinner-fullscreen">
        {spinner}
      </div>
    )
  }

  return spinner
}

export default LoadingSpinner

