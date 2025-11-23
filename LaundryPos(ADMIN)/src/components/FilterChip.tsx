import React from 'react'
import { FiX } from 'react-icons/fi'
import { motion } from 'framer-motion'
import './FilterChip.css'

interface FilterChipProps {
  label: string
  value: string
  onRemove: () => void
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error'
}

const FilterChip: React.FC<FilterChipProps> = ({
  label,
  value,
  onRemove,
  variant = 'default'
}) => {
  return (
    <motion.div
      className={`filter-chip filter-chip-${variant}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
    >
      <span className="filter-chip-label">{label}</span>
      <button
        className="filter-chip-remove"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        type="button"
      >
        <FiX />
      </button>
    </motion.div>
  )
}

interface FilterChipsProps {
  filters: Array<{ label: string; value: string; variant?: FilterChipProps['variant'] }>
  onRemove: (value: string) => void
  onClearAll?: () => void
  showClearAll?: boolean
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  onRemove,
  onClearAll,
  showClearAll = true
}) => {
  if (filters.length === 0) return null

  return (
    <div className="filter-chips-container">
      <div className="filter-chips">
        {filters.map(filter => (
          <FilterChip
            key={filter.value}
            label={filter.label}
            value={filter.value}
            variant={filter.variant}
            onRemove={() => onRemove(filter.value)}
          />
        ))}
      </div>
      {showClearAll && onClearAll && filters.length > 1 && (
        <button
          className="filter-chips-clear-all"
          onClick={onClearAll}
          type="button"
        >
          Clear all
        </button>
      )}
    </div>
  )
}

export default FilterChip

