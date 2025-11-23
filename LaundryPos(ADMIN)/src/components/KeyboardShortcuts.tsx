import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiCommand } from 'react-icons/fi'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import './KeyboardShortcuts.css'

const KeyboardShortcuts: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)

  const shortcutsPages = [
    // Page 1: Basic Navigation
    [
    { keys: ['Ctrl', 'K'], description: 'Open global search' },
    { keys: ['Ctrl', 'Alt', 'N'], description: 'Create new order' },
    { keys: ['Ctrl', 'D'], description: 'Go to dashboard' },
      { keys: ['Ctrl', 'O'], description: 'Open order management' },
      { keys: ['Ctrl', 'C'], description: 'Go to customer management' },
      { keys: ['Ctrl', 'S'], description: 'Go to services management' },
      { keys: ['Ctrl', 'R'], description: 'Generate reports' },
      { keys: ['Ctrl', 'E'], description: 'Manage expenses' },
    ],
    // Page 2: Theme & UI
    [
      { keys: ['Ctrl', '1'], description: 'Switch to Light mode' },
      { keys: ['Ctrl', '2'], description: 'Switch to Dim mode' },
      { keys: ['Ctrl', 'B'], description: 'Toggle sidebar' },
      { keys: ['Ctrl', '/'], description: 'Show keyboard shortcuts' },
    { keys: ['Esc'], description: 'Close modal/dialog' },
      { keys: ['Tab'], description: 'Navigate between fields' },
      { keys: ['Enter'], description: 'Submit form or confirm action' },
      { keys: ['F5'], description: 'Refresh page' },
    ],
    // Page 3: Order Operations
    [
      { keys: ['Ctrl', 'Shift', 'N'], description: 'Create new customer' },
      { keys: ['Ctrl', 'Shift', 'S'], description: 'Add new service' },
      { keys: ['Ctrl', 'F'], description: 'Find in current page' },
      { keys: ['Ctrl', 'A'], description: 'Select all items' },
      { keys: ['Ctrl', 'Z'], description: 'Undo last action' },
      { keys: ['Ctrl', 'Y'], description: 'Redo last action' },
      { keys: ['Ctrl', 'P'], description: 'Print current page' },
      { keys: ['Ctrl', 'G'], description: 'Go to specific order' },
    ],
    // Page 4: Advanced Operations
    [
      { keys: ['Ctrl', 'Shift', 'E'], description: 'Export data' },
      { keys: ['Ctrl', 'Shift', 'I'], description: 'Import data' },
      { keys: ['Ctrl', 'Shift', 'D'], description: 'Delete selected items' },
      { keys: ['Ctrl', 'Shift', 'U'], description: 'Update selected items' },
      { keys: ['Ctrl', 'Shift', 'R'], description: 'Reset form' },
      { keys: ['Ctrl', 'Shift', 'C'], description: 'Copy selected items' },
      { keys: ['Ctrl', 'Shift', 'V'], description: 'Paste items' },
      { keys: ['Ctrl', 'Shift', 'X'], description: 'Cut selected items' },
    ],
    // Page 5: Additional Shortcuts
    [
      { keys: ['Ctrl', 'H'], description: 'Show order history' },
      { keys: ['Ctrl', 'J'], description: 'Jump to customer' },
      { keys: ['Ctrl', 'L'], description: 'Load saved order' },
      { keys: ['Ctrl', 'M'], description: 'Mark order complete' },
      { keys: ['Ctrl', 'Q'], description: 'Quick add item' },
      { keys: ['Ctrl', 'T'], description: 'Toggle theme' },
      { keys: ['Ctrl', 'U'], description: 'Update order status' },
      { keys: ['Ctrl', 'V'], description: 'View order details' },
    ],
    // Page 6: Function Keys
    [
      { keys: ['F1'], description: 'Help' },
      { keys: ['F2'], description: 'Edit selected item' },
      { keys: ['F3'], description: 'Find next' },
      { keys: ['F4'], description: 'Close current window' },
      { keys: ['F6'], description: 'Switch between panels' },
      { keys: ['F7'], description: 'Spell check' },
      { keys: ['F8'], description: 'Extend selection' },
      { keys: ['F9'], description: 'Refresh data' },
    ]
  ]

  const currentShortcuts = shortcutsPages[currentPage] || []
  const totalPages = shortcutsPages.length

  // Set up keyboard shortcuts
  useKeyboardShortcut([
    {
      key: '/',
      ctrl: true,
      callback: () => {
        console.log('Keyboard shortcut triggered: Ctrl + /')
        setCurrentPage(0) // Reset to first page when opening
        setIsOpen(true)
      }
    },
    {
      key: 'Escape',
      callback: () => {
        console.log('Escape key pressed')
        setIsOpen(false)
      }
    },
    {
      key: 'ArrowRight',
      callback: () => {
        if (isOpen) {
          setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))
        }
      }
    },
    {
      key: 'ArrowLeft',
      callback: () => {
        if (isOpen) {
          setCurrentPage(prev => Math.max(0, prev - 1))
        }
      }
    }
  ])

  return (
    <>
      <button
        className="shortcuts-trigger tooltip"
        data-tooltip="Keyboard Shortcuts (Ctrl + /)"
        onClick={() => setIsOpen(true)}
      >
        <FiCommand />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="shortcuts-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              className="shortcuts-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>⌨️ Keyboard Shortcuts</h3>
              <div className="page-info">
                Page {currentPage + 1} of {totalPages}
              </div>
              <div className="shortcuts-list">
                {currentShortcuts.map((shortcut, index) => (
                  <div key={index} className="shortcut-item">
                    <div className="shortcut-keys">
                      {shortcut.keys.map((key, i) => (
                        <React.Fragment key={i}>
                          <kbd>{key}</kbd>
                          {i < shortcut.keys.length - 1 && <span>+</span>}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="shortcut-description">{shortcut.description}</div>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                {currentPage < totalPages - 1 && (
                  <button 
                    className="next-btn" 
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next Page →
                  </button>
                )}
              <button className="shortcuts-close" onClick={() => setIsOpen(false)}>
                Close
              </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default KeyboardShortcuts

