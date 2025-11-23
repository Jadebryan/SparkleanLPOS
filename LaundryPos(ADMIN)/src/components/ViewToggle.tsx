import React from 'react'
import { motion } from 'framer-motion'
import { FiGrid, FiList } from 'react-icons/fi'
import './ViewToggle.css'

export type ViewMode = 'cards' | 'list'

interface ViewToggleProps {
  currentView: ViewMode
  onViewChange: (view: ViewMode) => void
  className?: string
}

const ViewToggle: React.FC<ViewToggleProps> = ({
  currentView,
  onViewChange,
  className = ''
}) => {
  return (
    <div className={`view-toggle ${className}`}>
      <div className="view-toggle-container">
        <button
          className={`view-toggle-btn ${currentView === 'cards' ? 'active' : ''}`}
          onClick={() => onViewChange('cards')}
          title="Card View"
        >
          <FiGrid size={16} />
        </button>
        <button
          className={`view-toggle-btn ${currentView === 'list' ? 'active' : ''}`}
          onClick={() => onViewChange('list')}
          title="List View"
        >
          <FiList size={16} />
        </button>
      </div>
    </div>
  )
}

export default ViewToggle
