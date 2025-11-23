import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AccessInfoModalProps {
  isOpen: boolean
  onClose: () => void
}

const AccessInfoModal: React.FC<AccessInfoModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-small"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
        <div className="modal-header">
          <h3 className="modal-title">Request Admin Access</h3>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p>If you need an admin account, please contact:</p>
          <ul>
            <li>Email: sparklean@example.com</li>
            <li>Phone: +63 912 345 6789</li>
            <li>Facebook: fb.com/SparkleanLaundryShop</li>
          </ul>
          <p>Your request should include your full name and role.</p>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AccessInfoModal


