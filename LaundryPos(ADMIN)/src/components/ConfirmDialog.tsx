import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from './Button'
import './ConfirmDialog.css'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string | React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  type?: 'danger' | 'warning' | 'info'
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  type = 'info'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="confirm-dialog-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            className="confirm-dialog"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`confirm-dialog-icon ${type}`}>
              {type === 'danger' && '⚠️'}
              {type === 'warning' && '⚡'}
              {type === 'info' && 'ℹ️'}
            </div>
            <h3 className="confirm-dialog-title">{title}</h3>
            <p className="confirm-dialog-message">{message}</p>
            <div className="confirm-dialog-actions">
              <Button variant="secondary" onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ConfirmDialog

