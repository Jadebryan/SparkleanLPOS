import React from 'react'
import { motion } from 'framer-motion'
import './LoadingSkeleton.css'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  variant?: 'text' | 'circular' | 'rectangular'
  className?: string
  animation?: 'pulse' | 'wave' | 'none'
}

const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  variant = 'rectangular',
  className = '',
  animation = 'pulse'
}) => {
  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || '1em'
  }

  return (
    <motion.div
      className={`skeleton skeleton-${variant} skeleton-${animation} ${className}`}
      style={style}
      animate={
        animation === 'pulse'
          ? { opacity: [0.6, 1, 0.6] }
          : animation === 'wave'
          ? {}
          : {}
      }
      transition={
        animation === 'pulse'
          ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0 }
      }
    />
  )
}

// Table skeleton
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 6
}) => {
  return (
    <div className="table-skeleton">
      <div className="table-skeleton-header">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height={40} variant="rectangular" />
        ))}
      </div>
      <div className="table-skeleton-body">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="table-skeleton-row">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} height={48} variant="rectangular" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Card skeleton
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="card-skeleton-container">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="card-skeleton"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Skeleton variant="circular" width={48} height={48} />
          <div className="card-skeleton-content">
            <Skeleton width="60%" height={24} />
            <Skeleton width="40%" height={16} />
            <Skeleton width="80%" height={16} />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// List skeleton
export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => {
  return (
    <div className="list-skeleton">
      {Array.from({ length: items }).map((_, i) => (
        <motion.div
          key={i}
          className="list-skeleton-item"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Skeleton variant="circular" width={40} height={40} />
          <div className="list-skeleton-content">
            <Skeleton width="30%" height={18} />
            <Skeleton width="50%" height={14} />
            <Skeleton width="40%" height={14} />
          </div>
          <Skeleton width={80} height={32} variant="rectangular" />
        </motion.div>
      ))}
    </div>
  )
}

// Stat card skeleton
export const StatCardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="stat-card-skeleton-container">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="stat-card-skeleton"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
        >
          <Skeleton variant="circular" width={56} height={56} />
          <div className="stat-card-skeleton-content">
            <Skeleton width="70%" height={32} />
            <Skeleton width="50%" height={16} />
            <Skeleton width="60%" height={14} />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default Skeleton

